import { pgTable, text, varchar, timestamp, boolean, integer, serial } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Table names follow the PHP library's conventions
const LOG_TABLE = 'quickbooks_log';
const QUEUE_TABLE = 'quickbooks_queue';
const RECUR_TABLE = 'quickbooks_recur';
const TICKET_TABLE = 'quickbooks_ticket';
const USER_TABLE = 'quickbooks_user';
const CONFIG_TABLE = 'quickbooks_config';

export const quickbooksLog = pgTable(LOG_TABLE, {
  quickbooks_log_id: serial('quickbooks_log_id').primaryKey(),
  quickbooks_ticket_id: integer('quickbooks_ticket_id'),
  batch: integer('batch').notNull().default(0),
  msg: text('msg').notNull(),
  log_datetime: timestamp('log_datetime').defaultNow().notNull(),
});

export const quickbooksQueue = pgTable(QUEUE_TABLE, {
  quickbooks_queue_id: serial('quickbooks_queue_id').primaryKey(),
  quickbooks_ticket_id: integer('quickbooks_ticket_id'),
  qb_username: varchar('qb_username', { length: 40 }).notNull(),
  qb_action: varchar('qb_action', { length: 32 }).notNull(),
  ident: varchar('ident', { length: 40 }).notNull(),
  extra: text('extra'),
  qbxml: text('qbxml'),
  priority: integer('priority').default(0).notNull(),
  qb_status: varchar('qb_status', { length: 1 }).notNull().default('q'),
  msg: text('msg'),
  enqueue_datetime: timestamp('enqueue_datetime').defaultNow().notNull(),
  dequeue_datetime: timestamp('dequeue_datetime'),
});

export const quickbooksRecur = pgTable(RECUR_TABLE, {
  quickbooks_recur_id: serial('quickbooks_recur_id').primaryKey(),
  qb_username: varchar('qb_username', { length: 40 }).notNull(),
  qb_action: varchar('qb_action', { length: 32 }).notNull(),
  ident: varchar('ident', { length: 40 }).notNull(),
  extra: text('extra'),
  qbxml: text('qbxml'),
  priority: integer('priority').default(0).notNull(),
  run_every: integer('run_every').notNull(),
  recur_lasttime: integer('recur_lasttime').notNull(),
  enqueue_datetime: timestamp('enqueue_datetime').defaultNow().notNull(),
});

export const quickbooksTicket = pgTable(TICKET_TABLE, {
  quickbooks_ticket_id: serial('quickbooks_ticket_id').primaryKey(),
  qb_username: varchar('qb_username', { length: 40 }).notNull(),
  ticket: varchar('ticket', { length: 36 }).notNull(),
  processed: integer('processed').default(0),
  lasterror_num: varchar('lasterror_num', { length: 32 }),
  lasterror_msg: varchar('lasterror_msg', { length: 255 }),
  ipaddr: varchar('ipaddr', { length: 45 }), // Up to IPv6 length
  write_datetime: timestamp('write_datetime').defaultNow().notNull(),
  touch_datetime: timestamp('touch_datetime').defaultNow().notNull(),
});

export const quickbooksUser = pgTable(USER_TABLE, {
  qb_username: varchar('qb_username', { length: 40 }).primaryKey(),
  qb_password: varchar('qb_password', { length: 255 }).notNull(),
  qb_company_file: varchar('qb_company_file', { length: 255 }),
  qbwc_wait_before_next_update: integer('qbwc_wait_before_next_update').default(0),
  qbwc_min_run_every_n_seconds: integer('qbwc_min_run_every_n_seconds').default(0),
  status: varchar('status', { length: 1 }).default('e'), // 'e' for enabled
  write_datetime: timestamp('write_datetime').defaultNow().notNull(),
  touch_datetime: timestamp('touch_datetime').defaultNow().notNull(),
});

export const quickbooksConfig = pgTable(CONFIG_TABLE, {
  quickbooks_config_id: serial('quickbooks_config_id').primaryKey(),
  qb_username: varchar('qb_username', { length: 40 }).notNull(),
  module: varchar('module', { length: 40 }).notNull(),
  cfgkey: varchar('cfgkey', { length: 40 }).notNull(),
  cfgval: varchar('cfgval', { length: 255 }).notNull(),
  cfgtype: varchar('cfgtype', { length: 40 }),
  cfgopts: text('cfgopts'),
  write_datetime: timestamp('write_datetime').defaultNow().notNull(),
  mod_datetime: timestamp('mod_datetime').defaultNow().notNull(),
});
