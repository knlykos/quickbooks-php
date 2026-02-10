
import { db } from '../src/db';
import { quickbooksUser } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: npx tsx scripts/create-user.ts <username> <password>');
        process.exit(1);
    }

    const username = args[0];
    const password = args[1];

    console.log(`Creating user '${username}'...`);

    try {
        // Check if user exists
        const existing = await db.select().from(quickbooksUser).where(eq(quickbooksUser.qb_username, username));
        if (existing.length > 0) {
            console.log(`User '${username}' already exists. Updating password...`);
            await db.update(quickbooksUser).set({
                qb_password: password,
                status: 'e',
                touch_datetime: new Date()
            }).where(eq(quickbooksUser.qb_username, username));
            console.log(`Password updated for '${username}'.`);
        } else {
            await db.insert(quickbooksUser).values({
                qb_username: username,
                qb_password: password,
                status: 'e',
                write_datetime: new Date(),
                touch_datetime: new Date()
            });
            console.log(`User '${username}' created successfully.`);
        }

    } catch (err) {
        console.error('Error creating user:', err);
        process.exit(1);
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
