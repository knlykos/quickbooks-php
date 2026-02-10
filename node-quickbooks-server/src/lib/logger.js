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
exports.logger = exports.Logger = exports.QUICKBOOKS_LOG_DEVELOP = exports.QUICKBOOKS_LOG_DEBUG = exports.QUICKBOOKS_LOG_VERBOSE = exports.QUICKBOOKS_LOG_NORMAL = exports.QUICKBOOKS_LOG_NONE = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.QUICKBOOKS_LOG_NONE = 0;
exports.QUICKBOOKS_LOG_NORMAL = 1;
exports.QUICKBOOKS_LOG_VERBOSE = 2;
exports.QUICKBOOKS_LOG_DEBUG = 3;
exports.QUICKBOOKS_LOG_DEVELOP = 4;
class Logger {
    constructor(logLevel = exports.QUICKBOOKS_LOG_NORMAL) {
        this.logLevel = logLevel;
    }
    log(msg_1, ticket_1) {
        return __awaiter(this, arguments, void 0, function* (msg, ticket, level = exports.QUICKBOOKS_LOG_NORMAL) {
            if (level > this.logLevel) {
                return;
            }
            let ticketId = null;
            if (ticket) {
                const ticketRecord = yield db_1.db.select().from(schema_1.quickbooksTicket).where((0, drizzle_orm_1.eq)(schema_1.quickbooksTicket.ticket, ticket)).limit(1);
                if (ticketRecord.length > 0) {
                    ticketId = ticketRecord[0].quickbooks_ticket_id;
                }
            }
            yield db_1.db.insert(schema_1.quickbooksLog).values({
                quickbooks_ticket_id: ticketId,
                msg: msg.substring(0, 65535), // Postgres text type is theoretically unlimited but good to be safe/consistent with PHP logic
                log_datetime: new Date(),
            });
        });
    }
}
exports.Logger = Logger;
exports.logger = new Logger(parseInt(process.env.QUICKBOOKS_LOG_LEVEL || '1'));
