
import { db } from '../src/db';
import { quickbooksUser } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const username = process.argv[2] || 'qb_admin';
    console.log(`Checking user: ${username}`);

    const user = await db.select().from(quickbooksUser).where(eq(quickbooksUser.qb_username, username));

    if (user.length === 0) {
        console.log('User not found.');
    } else {
        console.log('User found:', user[0]);
        console.log(`Password matches 'password123': ${user[0].qb_password === 'password123'}`);
    }
    process.exit(0);
}

main();
