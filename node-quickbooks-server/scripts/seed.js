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
const db_1 = require("../src/db");
const schema_1 = require("../src/db/schema");
const queue_1 = require("../src/lib/queue");
const uuid_1 = require("uuid");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Seeding database...');
        // 1. Create a User
        const username = 'testuser';
        const password = 'password123';
        yield db_1.db.insert(schema_1.quickbooksUser).values({
            qb_username: username,
            qb_password: password,
            status: 'e'
        }).onConflictDoNothing();
        console.log(`User '${username}' created.`);
        // 2. Enqueue an action
        const action = 'CustomerAdd';
        const ident = (0, uuid_1.v4)();
        const qbxml = `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <CustomerAddRq>
      <CustomerAdd>
        <Name>Test Customer ${ident.substring(0, 5)}</Name>
        <CompanyName>Test Company</CompanyName>
      </CustomerAdd>
    </CustomerAddRq>
  </QBXMLMsgsRq>
</QBXML>`;
        yield queue_1.queue.enqueue(username, action, ident, true, 0, null, qbxml);
        console.log(`Action '${action}' enqueued.`);
        process.exit(0);
    });
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
