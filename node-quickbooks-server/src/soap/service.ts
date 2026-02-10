import { db } from '../db';
import { quickbooksUser, quickbooksTicket } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { queue, QUICKBOOKS_STATUS_PROCESSING, QUICKBOOKS_STATUS_SUCCESS, QUICKBOOKS_STATUS_ERROR, QUICKBOOKS_STATUS_HANDLED } from '../lib/queue';
import { logger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';

export const service = {
  QBWebConnectorSvc: {
    QBWebConnectorSvcSoap: {
      serverVersion: async function (args: any) {
        await logger.log('serverVersion()');
        return { serverVersionResult: 'NodeJS QuickBooks SOAP Server v1.0' };
      },

      clientVersion: async function (args: any) {
        await logger.log(`clientVersion() - ${args.strVersion}`);
        // Return empty string to allow update, or "O:version" to require update
        return { clientVersionResult: '' };
      },

      authenticate: async function (args: any) {
        await logger.log(`authenticate() - User: ${args.strUserName}`);

        const { strUserName, strPassword } = args;

        // Fetch user from DB
        const user = await db.select()
          .from(quickbooksUser)
          .where(and(
            eq(quickbooksUser.qb_username, strUserName),
            eq(quickbooksUser.qb_password, strPassword) // In production, hash passwords!
          ))
          .limit(1);

        if (user.length === 0 || user[0].status !== 'e') {
          await logger.log(`authenticate() - Login failed for ${strUserName}. User found: ${user.length}, Status: ${user.length > 0 ? user[0].status : 'N/A'}`);
          console.log(`Auth failed. Input: ${strUserName}/${strPassword}. DB result:`, user);
          return {
            authenticateResult: {
              string: ['', 'nvu'] // Ticket, status
            }
          };
        }

        // Generate Ticket
        const ticket = uuidv4();
        await db.insert(quickbooksTicket).values({
          qb_username: strUserName,
          ticket: ticket,
          ipaddr: '0.0.0.0', // Could extract from connection if available
          write_datetime: new Date(),
          touch_datetime: new Date()
        });

        // Check for work in queue
        // We return 'none' if no work, or empty string (which defaults to company file path usually) if work exists
        // Actually, PHP lib returns 'none' if queue is empty after dequeueing.
        // But here we just authenticate. The QBWC will call sendRequestXML next.
        // It seems standard practice is:
        // [0] = ticket
        // [1] = "" (use current company file) or "none" (no work) or "nvu" (invalid user)
        // [2] = wait before next update (seconds)
        // [3] = min run every n seconds

        // Let's check if there is work.
        // PHP logic: if (queueDequeue) -> status = "" else status = "none"

        // However, we don't dequeue here. dequeue happens in sendRequestXML.
        // But we can check if there are items in queue.

        const count = await queue.left(strUserName);
        const status = count > 0 ? '' : 'none'; // Empty string means "use currently open company file"

        await logger.log(`authenticate() - Login success for ${strUserName}, Ticket: ${ticket}, Work: ${status}`);

        return {
          authenticateResult: {
            string: [ticket, status, '', ''] // ticket, result, updatePause, minRun
          }
        };
      },

      sendRequestXML: async function (args: any) {
        const ticket = args.ticket;
        await logger.log('sendRequestXML()', ticket);

        // Validate Ticket
        const ticketRecord = await db.select().from(quickbooksTicket).where(eq(quickbooksTicket.ticket, ticket)).limit(1);
        if (ticketRecord.length === 0) {
          return { sendRequestXMLResult: '' };
        }
        const user = ticketRecord[0].qb_username;

        // Dequeue next item
        const item = await queue.dequeue(user);

        if (!item) {
          return { sendRequestXMLResult: '' };
        }

        // Mark as processing
        await queue.updateStatus(ticket, item.quickbooks_queue_id, QUICKBOOKS_STATUS_PROCESSING, 'Dequeued');
        await logger.log(`Dequeued action: ${item.qb_action}, Ident: ${item.ident}`, ticket);

        // Here we would typically generate the QBXML based on the action.
        // For now, we assume the `qbxml` field in the queue already contains the request XML
        // OR the `extra` field contains data to generate it.
        // The PHP library calls a mapped function.
        // For this port, we will assume `qbxml` is pre-populated OR we just send empty string if not found (which is error).

        let xml = item.qbxml || '';

        // If XML is empty, we might need to generate it.
        // For simplicity in this first pass, we assume the user of this library has put the XML in the queue.

        // Also need to handle RequestID.
        // QBWC requires requestID in the QBXML.
        // We can inject it if missing, using the queue ID.

        if (xml && !xml.includes('requestID="')) {
          // Rough injection, should be smarter
          // Assuming <ActionRq ...> format
          xml = xml.replace(/Rq /g, `Rq requestID="${item.quickbooks_queue_id}" `);
          xml = xml.replace(/Rq>/g, `Rq requestID="${item.quickbooks_queue_id}">`);
        }

        return { sendRequestXMLResult: xml };
      },

      receiveResponseXML: async function (args: any) {
        const { ticket, response, hresult, message } = args;
        await logger.log(`receiveResponseXML() - HResult: ${hresult}, Msg: ${message}`, ticket);

        // Validate Ticket
        const ticketRecord = await db.select().from(quickbooksTicket).where(eq(quickbooksTicket.ticket, ticket)).limit(1);
        if (ticketRecord.length === 0) {
          return { receiveResponseXMLResult: -1 };
        }
        const user = ticketRecord[0].qb_username;

        // Parse RequestID from response to identify the queue item
        // Standard QBXML response has requestID attribute
        let queueId: number | null = null;
        const match = response.match(/requestID="(\d+)"/);
        if (match && match[1]) {
          queueId = parseInt(match[1]);
        }

        // If we can't find requestID in XML, try to find the item currently in 'processing' state
        if (!queueId) {
          const processingItem = await queue.processing(user);
          if (processingItem) {
            queueId = processingItem.quickbooks_queue_id;
          }
        }

        if (queueId) {
          // Determine status
          // If hresult is non-zero, it's usually an error, but QBWC sometimes sends errors as responses too.
          // We should check the 'statusSeverity' in the XML response.

          let status = QUICKBOOKS_STATUS_SUCCESS;
          let logMsg = 'Success';

          if (message || (hresult && hresult !== '')) {
            status = QUICKBOOKS_STATUS_ERROR;
            logMsg = `${hresult}: ${message}`;
          } else if (response.includes('statusSeverity="Error"')) {
            status = QUICKBOOKS_STATUS_ERROR;
            // Extract statusMessage
            const msgMatch = response.match(/statusMessage="([^"]+)"/);
            logMsg = msgMatch ? msgMatch[1] : 'Unknown Error';
          }

          await queue.updateStatus(ticket, queueId, status, logMsg);
        }

        // Calculate progress
        const left = await queue.left(user);
        const processed = ticketRecord[0].processed || 0;
        const total = left + processed;

        let percentage = 100;
        if (total > 0) {
          percentage = Math.floor((processed * 100) / total);
        }
        if (left > 0 && percentage === 100) percentage = 99;

        await logger.log(`Progress: ${percentage}%`, ticket);

        return { receiveResponseXMLResult: percentage };
      },

      connectionError: async function (args: any) {
        const { ticket, hresult, message } = args;
        await logger.log(`connectionError() - ${hresult}: ${message}`, ticket);
        return { connectionErrorResult: 'done' };
      },

      getLastError: async function (args: any) {
        const { ticket } = args;
        await logger.log('getLastError()', ticket);

        const ticketRecord = await db.select().from(quickbooksTicket).where(eq(quickbooksTicket.ticket, ticket)).limit(1);
        if (ticketRecord.length > 0 && ticketRecord[0].lasterror_msg) {
          return { getLastErrorResult: ticketRecord[0].lasterror_msg };
        }

        return { getLastErrorResult: '' };
      },

      closeConnection: async function (args: any) {
        const { ticket } = args;
        await logger.log('closeConnection()', ticket);
        return { closeConnectionResult: 'Complete!' };
      }
    }
  }
};
