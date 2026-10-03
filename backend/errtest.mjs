import 'dotenv/config';
const { migrateWithSql } = await import('./src/db.js');
const { cleanNeonUrl } = await import('./src/worker.js');
const { neon } = await import('@neondatabase/serverless');
const bcrypt = (await import('bcryptjs')).default;
try {
  await migrateWithSql(neon(cleanNeonUrl(process.env.DATABASE_URL)), bcrypt);
  console.log('MIGRATION OK');
} catch (e) {
  console.log('ERRCODE:', e.code, '| MESSAGE:', e.message, '| DETAIL:', e.detail, '| HINT:', e.hint);
}
