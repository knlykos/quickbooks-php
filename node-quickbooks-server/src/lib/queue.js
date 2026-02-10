"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queue = exports.Queue = exports.QUICKBOOKS_STATUS_NOOP = exports.QUICKBOOKS_STATUS_REMOVED = exports.QUICKBOOKS_STATUS_CANCELLED = exports.QUICKBOOKS_STATUS_HANDLED = exports.QUICKBOOKS_STATUS_PROCESSING = exports.QUICKBOOKS_STATUS_ERROR = exports.QUICKBOOKS_STATUS_SUCCESS = exports.QUICKBOOKS_STATUS_QUEUED = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
exports.QUICKBOOKS_STATUS_QUEUED = 'q';
exports.QUICKBOOKS_STATUS_SUCCESS = 's';
exports.QUICKBOOKS_STATUS_ERROR = 'e';
exports.QUICKBOOKS_STATUS_PROCESSING = 'i';
exports.QUICKBOOKS_STATUS_HANDLED = 'h';
exports.QUICKBOOKS_STATUS_CANCELLED = 'c';
exports.QUICKBOOKS_STATUS_REMOVED = 'r';
exports.QUICKBOOKS_STATUS_NOOP = 'n';
class Queue {
    enqueue(user_1, action_1, ident_1) {
        return __awaiter(this, arguments, void 0, function* (user, action, ident, replace = true, priority = 0, extra = null, qbxml = null) {
            if (!ident) {
                ident = (0, uuid_1.v4)().substring(0, 8);
            }
            if (replace) {
                yield db_1.db.delete(schema_1.quickbooksQueue)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_username, user), (0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_action, action), (0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.ident, ident), (0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_status, exports.QUICKBOOKS_STATUS_QUEUED)));
            }
            yield db_1.db.insert(schema_1.quickbooksQueue).values({
                qb_username: user,
                qb_action: action,
                ident: ident.substring(0, 40),
                extra: extra ? JSON.stringify(extra) : null,
                qbxml: qbxml,
                priority: priority,
                qb_status: exports.QUICKBOOKS_STATUS_QUEUED,
                enqueue_datetime: new Date(),
            });
            return true;
        });
    }
    dequeue(user) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Check for recurring events
            const now = Math.floor(Date.now() / 1000);
            const recurEvents = yield db_1.db.select()
                .from(schema_1.quickbooksRecur)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quickbooksRecur.qb_username, user), (0, drizzle_orm_1.sql) `${schema_1.quickbooksRecur.recur_lasttime} + ${schema_1.quickbooksRecur.run_every} <= ${now}`));
            for (const event of recurEvents) {
                // Enqueue the recurring event
                yield this.enqueue(user, event.qb_action, event.ident, true, // replace
                event.priority, event.extra ? JSON.parse(event.extra) : null, event.qbxml);
                // Update last run time
                yield db_1.db.update(schema_1.quickbooksRecur)
                    .set({ recur_lasttime: now })
                    .where((0, drizzle_orm_1.eq)(schema_1.quickbooksRecur.quickbooks_recur_id, event.quickbooks_recur_id));
            }
            // 2. Fetch from queue
            const item = yield db_1.db.select()
                .from(schema_1.quickbooksQueue)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_username, user), (0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_status, exports.QUICKBOOKS_STATUS_QUEUED)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.quickbooksQueue.priority), (0, drizzle_orm_1.desc)(schema_1.quickbooksQueue.enqueue_datetime))
                .limit(1);
            if (item.length > 0) {
                return item[0];
            }
            return null;
        });
    }
    updateStatus(ticket_1, queueId_1, status_1) {
        return __awaiter(this, arguments, void 0, function* (ticket, queueId, status, msg = null) {
            const ticketRecord = yield db_1.db.select().from(schema_1.quickbooksTicket).where((0, drizzle_orm_1.eq)(schema_1.quickbooksTicket.ticket, ticket)).limit(1);
            const ticketId = ticketRecord.length > 0 ? ticketRecord[0].quickbooks_ticket_id : null;
            if (!ticketId)
                return false;
            if (status === exports.QUICKBOOKS_STATUS_SUCCESS) {
                yield db_1.db.update(schema_1.quickbooksTicket)
                    .set({
                    processed: (0, drizzle_orm_1.sql) `processed + 1`,
                    lasterror_num: null,
                    lasterror_msg: null
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.quickbooksTicket.quickbooks_ticket_id, ticketId));
            }
            if (status === exports.QUICKBOOKS_STATUS_PROCESSING) {
                // Clear ticket error
                yield db_1.db.update(schema_1.quickbooksTicket)
                    .set({ lasterror_num: null, lasterror_msg: null })
                    .where((0, drizzle_orm_1.eq)(schema_1.quickbooksTicket.quickbooks_ticket_id, ticketId));
                // Update queue item to processing
                yield db_1.db.update(schema_1.quickbooksQueue)
                    .set({
                    qb_status: status,
                    msg: msg,
                    quickbooks_ticket_id: ticketId,
                    dequeue_datetime: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.quickbooks_queue_id, queueId));
            }
            else {
                // Update status from PROCESSING to something else (SUCCESS, ERROR, HANDLED, etc.)
                yield db_1.db.update(schema_1.quickbooksQueue)
                    .set({
                    qb_status: status,
                    msg: msg
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.quickbooks_queue_id, queueId));
            }
            return true;
        });
    }
    processing(user) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find the item currently being processed (status 'i')
            // Make sure it's not stale (timeout check, e.g. 30 mins)
            const timeoutMinutes = 30;
            const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
            const item = yield db_1.db.select()
                .from(schema_1.quickbooksQueue)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_username, user), (0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_status, exports.QUICKBOOKS_STATUS_PROCESSING), (0, drizzle_orm_1.gt)(schema_1.quickbooksQueue.dequeue_datetime, cutoff)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.quickbooksQueue.dequeue_datetime))
                .limit(1);
            if (item.length > 0) {
                return item[0];
            }
            return null;
        });
    }
    left(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield db_1.db.select({ count: (0, drizzle_orm_1.sql) `cast(count(*) as int)` })
                .from(schema_1.quickbooksQueue)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_username, user), (0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.qb_status, exports.QUICKBOOKS_STATUS_QUEUED)));
            return result[0].count;
        });
    }
    get(queueId) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield db_1.db.select()
                .from(schema_1.quickbooksQueue)
                .where((0, drizzle_orm_1.eq)(schema_1.quickbooksQueue.quickbooks_queue_id, queueId))
                .limit(1);
            return item.length > 0 ? item[0] : null;
        });
    }
}
exports.Queue = Queue;
exports.queue = new Queue();
