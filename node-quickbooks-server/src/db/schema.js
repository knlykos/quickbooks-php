"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickbooksConfig = exports.quickbooksUser = exports.quickbooksTicket = exports.quickbooksRecur = exports.quickbooksQueue = exports.quickbooksLog = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Table names follow the PHP library's conventions
const LOG_TABLE = 'quickbooks_log';
const QUEUE_TABLE = 'quickbooks_queue';
const RECUR_TABLE = 'quickbooks_recur';
const TICKET_TABLE = 'quickbooks_ticket';
const USER_TABLE = 'quickbooks_user';
const CONFIG_TABLE = 'quickbooks_config';
exports.quickbooksLog = (0, pg_core_1.pgTable)(LOG_TABLE, {
    quickbooks_log_id: (0, pg_core_1.serial)('quickbooks_log_id').primaryKey(),
    quickbooks_ticket_id: (0, pg_core_1.integer)('quickbooks_ticket_id'),
    batch: (0, pg_core_1.integer)('batch').notNull().default(0),
    msg: (0, pg_core_1.text)('msg').notNull(),
    log_datetime: (0, pg_core_1.timestamp)('log_datetime').defaultNow().notNull(),
});
exports.quickbooksQueue = (0, pg_core_1.pgTable)(QUEUE_TABLE, {
    quickbooks_queue_id: (0, pg_core_1.serial)('quickbooks_queue_id').primaryKey(),
    quickbooks_ticket_id: (0, pg_core_1.integer)('quickbooks_ticket_id'),
    qb_username: (0, pg_core_1.varchar)('qb_username', { length: 40 }).notNull(),
    qb_action: (0, pg_core_1.varchar)('qb_action', { length: 32 }).notNull(),
    ident: (0, pg_core_1.varchar)('ident', { length: 40 }).notNull(),
    extra: (0, pg_core_1.text)('extra'),
    qbxml: (0, pg_core_1.text)('qbxml'),
    priority: (0, pg_core_1.integer)('priority').default(0).notNull(),
    qb_status: (0, pg_core_1.varchar)('qb_status', { length: 1 }).notNull().default('q'),
    msg: (0, pg_core_1.text)('msg'),
    enqueue_datetime: (0, pg_core_1.timestamp)('enqueue_datetime').defaultNow().notNull(),
    dequeue_datetime: (0, pg_core_1.timestamp)('dequeue_datetime'),
});
exports.quickbooksRecur = (0, pg_core_1.pgTable)(RECUR_TABLE, {
    quickbooks_recur_id: (0, pg_core_1.serial)('quickbooks_recur_id').primaryKey(),
    qb_username: (0, pg_core_1.varchar)('qb_username', { length: 40 }).notNull(),
    qb_action: (0, pg_core_1.varchar)('qb_action', { length: 32 }).notNull(),
    ident: (0, pg_core_1.varchar)('ident', { length: 40 }).notNull(),
    extra: (0, pg_core_1.text)('extra'),
    qbxml: (0, pg_core_1.text)('qbxml'),
    priority: (0, pg_core_1.integer)('priority').default(0).notNull(),
    run_every: (0, pg_core_1.integer)('run_every').notNull(),
    recur_lasttime: (0, pg_core_1.integer)('recur_lasttime').notNull(),
    enqueue_datetime: (0, pg_core_1.timestamp)('enqueue_datetime').defaultNow().notNull(),
});
exports.quickbooksTicket = (0, pg_core_1.pgTable)(TICKET_TABLE, {
    quickbooks_ticket_id: (0, pg_core_1.serial)('quickbooks_ticket_id').primaryKey(),
    qb_username: (0, pg_core_1.varchar)('qb_username', { length: 40 }).notNull(),
    ticket: (0, pg_core_1.varchar)('ticket', { length: 36 }).notNull(),
    processed: (0, pg_core_1.integer)('processed').default(0),
    lasterror_num: (0, pg_core_1.varchar)('lasterror_num', { length: 32 }),
    lasterror_msg: (0, pg_core_1.varchar)('lasterror_msg', { length: 255 }),
    ipaddr: (0, pg_core_1.varchar)('ipaddr', { length: 45 }), // Up to IPv6 length
    write_datetime: (0, pg_core_1.timestamp)('write_datetime').defaultNow().notNull(),
    touch_datetime: (0, pg_core_1.timestamp)('touch_datetime').defaultNow().notNull(),
});
exports.quickbooksUser = (0, pg_core_1.pgTable)(USER_TABLE, {
    qb_username: (0, pg_core_1.varchar)('qb_username', { length: 40 }).primaryKey(),
    qb_password: (0, pg_core_1.varchar)('qb_password', { length: 255 }).notNull(),
    qb_company_file: (0, pg_core_1.varchar)('qb_company_file', { length: 255 }),
    qbwc_wait_before_next_update: (0, pg_core_1.integer)('qbwc_wait_before_next_update').default(0),
    qbwc_min_run_every_n_seconds: (0, pg_core_1.integer)('qbwc_min_run_every_n_seconds').default(0),
    status: (0, pg_core_1.varchar)('status', { length: 1 }).default('e'), // 'e' for enabled
    write_datetime: (0, pg_core_1.timestamp)('write_datetime').defaultNow().notNull(),
    touch_datetime: (0, pg_core_1.timestamp)('touch_datetime').defaultNow().notNull(),
});
exports.quickbooksConfig = (0, pg_core_1.pgTable)(CONFIG_TABLE, {
    quickbooks_config_id: (0, pg_core_1.serial)('quickbooks_config_id').primaryKey(),
    qb_username: (0, pg_core_1.varchar)('qb_username', { length: 40 }).notNull(),
    module: (0, pg_core_1.varchar)('module', { length: 40 }).notNull(),
    cfgkey: (0, pg_core_1.varchar)('cfgkey', { length: 40 }).notNull(),
    cfgval: (0, pg_core_1.varchar)('cfgval', { length: 255 }).notNull(),
    cfgtype: (0, pg_core_1.varchar)('cfgtype', { length: 40 }),
    cfgopts: (0, pg_core_1.text)('cfgopts'),
    write_datetime: (0, pg_core_1.timestamp)('write_datetime').defaultNow().notNull(),
    mod_datetime: (0, pg_core_1.timestamp)('mod_datetime').defaultNow().notNull(),
});
