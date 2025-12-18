#!/usr/bin/env node
/**
 * Safe script to delete all non-admin users and their related data.
 * Usage: node backend/scripts/delete_non_admin_users.js
 *
 * The script will:
 *  - list users where role != 'admin'
 *  - list counts of related applications and activity logs
 *  - prompt for confirmation (type YES) before deleting
 *  - perform deletions inside a transaction
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: '../../.env' });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a)));

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eteeap_db',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const conn = await pool.getConnection();
  try {
    // fetch non-admin users
    const [users] = await conn.query("SELECT id, fullname, email, role FROM users WHERE role != 'admin'");
    if (!users.length) {
      console.log('No non-admin users found. Nothing to do.');
      return process.exit(0);
    }

    console.log('Non-admin users to be removed:');
    users.forEach(u => console.log(` - ${u.id}: ${u.fullname} <${u.email}> (role=${u.role})`));

    const userIds = users.map(u => u.id);

    // counts of related data
    const [[{ appCount }]] = await conn.query(
      `SELECT COUNT(*) AS appCount FROM applications WHERE user_id IN (?)`,
      [userIds]
    );
    const [[{ logCount }]] = await conn.query(
      `SELECT COUNT(*) AS logCount FROM activity_logs WHERE user_id IN (?)`,
      [userIds]
    );

    console.log(`\nRelated rows: applications=${appCount}, activity_logs=${logCount}`);
    console.log('This will also remove related document remarks, verified_files, and notification_reads for those applications/users.');

    const answer = await ask("Type YES to confirm deletion of these accounts and related data: ");
    if (answer.trim() !== 'YES') {
      console.log('Aborted by user. No changes made.');
      return process.exit(0);
    }

    console.log('Proceeding with deletion...');
    await conn.beginTransaction();

    // find applications belonging to these users
    const [apps] = await conn.query(`SELECT id FROM applications WHERE user_id IN (?)`, [userIds]);
    const appIds = apps.map(a => a.id);

    if (appIds.length) {
      // delete verified files
      await conn.query(`DELETE FROM verified_files WHERE application_id IN (?)`, [appIds]);
      // delete document remarks
      await conn.query(`DELETE FROM document_remarks WHERE application_id IN (?)`, [appIds]);
      // delete applications
      await conn.query(`DELETE FROM applications WHERE id IN (?)`, [appIds]);
    }

    // delete notification_reads for these users
    await conn.query(`DELETE FROM notification_reads WHERE user_id IN (?)`, [userIds]);

    // delete activity logs
    await conn.query(`DELETE FROM activity_logs WHERE user_id IN (?)`, [userIds]);

    // finally delete users
    await conn.query(`DELETE FROM users WHERE id IN (?)`, [userIds]);

    await conn.commit();
    console.log('Deletion complete.');
  } catch (err) {
    console.error('Error during deletion, rolling back:', err);
    try { await conn.rollback(); } catch (e) { console.error('Rollback failed:', e); }
  } finally {
    try { conn.release(); } catch (e) {}
    rl.close();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
