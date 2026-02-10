
import { db } from '../src/db';
import { quickbooksUser, quickbooksQueue } from '../src/db/schema';
import { queue, QUICKBOOKS_STATUS_QUEUED } from '../src/lib/queue';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('Seeding database...');

  // 1. Create a User
  const username = 'testuser';
  const password = 'password123';

  await db.insert(quickbooksUser).values({
    qb_username: username,
    qb_password: password,
    status: 'e'
  }).onConflictDoNothing();

  console.log(`User '${username}' created.`);

  // 2. Enqueue an action
  const action = 'CustomerAdd';
  const ident = uuidv4();
  const qbxml = `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="stopOnError">
    <CustomerAddRq>
      <CustomerAdd>
        <Name>Test Customer ${ident.substring(0,5)}</Name>
        <CompanyName>Test Company</CompanyName>
      </CustomerAdd>
    </CustomerAddRq>
  </QBXMLMsgsRq>
</QBXML>`;

  await queue.enqueue(username, action, ident, true, 0, null, qbxml);
  console.log(`Action '${action}' enqueued.`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
