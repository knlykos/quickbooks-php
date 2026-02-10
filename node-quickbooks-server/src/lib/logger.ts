import { db } from '../db';
import { quickbooksLog, quickbooksTicket } from '../db/schema';
import { eq } from 'drizzle-orm';

export const QUICKBOOKS_LOG_NONE = 0;
export const QUICKBOOKS_LOG_NORMAL = 1;
export const QUICKBOOKS_LOG_VERBOSE = 2;
export const QUICKBOOKS_LOG_DEBUG = 3;
export const QUICKBOOKS_LOG_DEVELOP = 4;

export class Logger {
  private logLevel: number;

  constructor(logLevel: number = QUICKBOOKS_LOG_NORMAL) {
    this.logLevel = logLevel;
  }

  async log(msg: string, ticket?: string, level: number = QUICKBOOKS_LOG_NORMAL) {
    if (level > this.logLevel) {
      return;
    }

    let ticketId: number | null = null;
    if (ticket) {
      const ticketRecord = await db.select().from(quickbooksTicket).where(eq(quickbooksTicket.ticket, ticket)).limit(1);
      if (ticketRecord.length > 0) {
        ticketId = ticketRecord[0].quickbooks_ticket_id;
      }
    }

    await db.insert(quickbooksLog).values({
      quickbooks_ticket_id: ticketId,
      msg: msg.substring(0, 65535), // Postgres text type is theoretically unlimited but good to be safe/consistent with PHP logic
      log_datetime: new Date(),
    });
  }
}

export const logger = new Logger(parseInt(process.env.QUICKBOOKS_LOG_LEVEL || '1'));
