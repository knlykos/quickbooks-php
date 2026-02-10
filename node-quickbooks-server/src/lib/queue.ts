import { db } from '../db';
import { quickbooksQueue, quickbooksRecur, quickbooksTicket } from '../db/schema';
import { eq, and, sql, desc, or, lt, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const QUICKBOOKS_STATUS_QUEUED = 'q';
export const QUICKBOOKS_STATUS_SUCCESS = 's';
export const QUICKBOOKS_STATUS_ERROR = 'e';
export const QUICKBOOKS_STATUS_PROCESSING = 'i';
export const QUICKBOOKS_STATUS_HANDLED = 'h';
export const QUICKBOOKS_STATUS_CANCELLED = 'c';
export const QUICKBOOKS_STATUS_REMOVED = 'r';
export const QUICKBOOKS_STATUS_NOOP = 'n';

export class Queue {

  async enqueue(
    user: string,
    action: string,
    ident?: string,
    replace: boolean = true,
    priority: number = 0,
    extra: any = null,
    qbxml: string | null = null
  ) {
    if (!ident) {
      ident = uuidv4().substring(0, 8);
    }

    if (replace) {
      await db.delete(quickbooksQueue)
        .where(and(
          eq(quickbooksQueue.qb_username, user),
          eq(quickbooksQueue.qb_action, action),
          eq(quickbooksQueue.ident, ident),
          eq(quickbooksQueue.qb_status, QUICKBOOKS_STATUS_QUEUED)
        ));
    }

    await db.insert(quickbooksQueue).values({
      qb_username: user,
      qb_action: action,
      ident: ident.substring(0, 40),
      extra: extra ? JSON.stringify(extra) : null,
      qbxml: qbxml,
      priority: priority,
      qb_status: QUICKBOOKS_STATUS_QUEUED,
      enqueue_datetime: new Date(),
    });

    return true;
  }

  async dequeue(user: string) {
    // 1. Check for recurring events
    const now = Math.floor(Date.now() / 1000);
    const recurEvents = await db.select()
        .from(quickbooksRecur)
        .where(and(
            eq(quickbooksRecur.qb_username, user),
            sql`${quickbooksRecur.recur_lasttime} + ${quickbooksRecur.run_every} <= ${now}`
        ));

    for (const event of recurEvents) {
        // Enqueue the recurring event
        await this.enqueue(
            user,
            event.qb_action,
            event.ident,
            true, // replace
            event.priority,
            event.extra ? JSON.parse(event.extra) : null,
            event.qbxml
        );

        // Update last run time
        await db.update(quickbooksRecur)
            .set({ recur_lasttime: now })
            .where(eq(quickbooksRecur.quickbooks_recur_id, event.quickbooks_recur_id));
    }

    // 2. Fetch from queue
    const item = await db.select()
      .from(quickbooksQueue)
      .where(and(
        eq(quickbooksQueue.qb_username, user),
        eq(quickbooksQueue.qb_status, QUICKBOOKS_STATUS_QUEUED)
      ))
      .orderBy(desc(quickbooksQueue.priority), desc(quickbooksQueue.enqueue_datetime))
      .limit(1);

    if (item.length > 0) {
      return item[0];
    }

    return null;
  }

  async updateStatus(
    ticket: string,
    queueId: number,
    status: string,
    msg: string | null = null
  ) {
    const ticketRecord = await db.select().from(quickbooksTicket).where(eq(quickbooksTicket.ticket, ticket)).limit(1);
    const ticketId = ticketRecord.length > 0 ? ticketRecord[0].quickbooks_ticket_id : null;

    if (!ticketId) return false;

    if (status === QUICKBOOKS_STATUS_SUCCESS) {
      await db.update(quickbooksTicket)
        .set({
          processed: sql`processed + 1`,
          lasterror_num: null,
          lasterror_msg: null
        })
        .where(eq(quickbooksTicket.quickbooks_ticket_id, ticketId));
    }

    if (status === QUICKBOOKS_STATUS_PROCESSING) {
        // Clear ticket error
        await db.update(quickbooksTicket)
            .set({ lasterror_num: null, lasterror_msg: null })
            .where(eq(quickbooksTicket.quickbooks_ticket_id, ticketId));

        // Update queue item to processing
        await db.update(quickbooksQueue)
            .set({
                qb_status: status,
                msg: msg,
                quickbooks_ticket_id: ticketId,
                dequeue_datetime: new Date()
            })
            .where(eq(quickbooksQueue.quickbooks_queue_id, queueId));

    } else {
        // Update status from PROCESSING to something else (SUCCESS, ERROR, HANDLED, etc.)
        await db.update(quickbooksQueue)
            .set({
                qb_status: status,
                msg: msg
            })
            .where(eq(quickbooksQueue.quickbooks_queue_id, queueId));
    }

    return true;
  }

  async processing(user: string) {
      // Find the item currently being processed (status 'i')
      // Make sure it's not stale (timeout check, e.g. 30 mins)
      const timeoutMinutes = 30;
      const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const item = await db.select()
        .from(quickbooksQueue)
        .where(and(
            eq(quickbooksQueue.qb_username, user),
            eq(quickbooksQueue.qb_status, QUICKBOOKS_STATUS_PROCESSING),
            gt(quickbooksQueue.dequeue_datetime, cutoff)
        ))
        .orderBy(desc(quickbooksQueue.dequeue_datetime))
        .limit(1);

      if (item.length > 0) {
          return item[0];
      }
      return null;
  }

  async left(user: string) {
      const result = await db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(quickbooksQueue)
        .where(and(
            eq(quickbooksQueue.qb_username, user),
            eq(quickbooksQueue.qb_status, QUICKBOOKS_STATUS_QUEUED)
        ));
      return result[0].count;
  }

  async get(queueId: number) {
      const item = await db.select()
        .from(quickbooksQueue)
        .where(eq(quickbooksQueue.quickbooks_queue_id, queueId))
        .limit(1);
      return item.length > 0 ? item[0] : null;
  }
}

export const queue = new Queue();
