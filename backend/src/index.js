// Node/Express dev server (also usable in Docker/Code Magic containers).
// Same routes as the Cloudflare Worker, but with a real pg TCP pool.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { initNodePool, migrate } from './db.js';
import authRoutes from './auth-routes.js';
import adminRoutes from './admin-routes.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true });

app.get('/healthz', (req, res) => res.json({ ok: true, runtime: 'node', ts: new Date().toISOString() }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'SERVER_ERROR' }); });

const PORT = process.env.PORT || 8787;

(async () => {
  await initNodePool(process.env.DATABASE_URL);
  try { await migrate(bcrypt); console.log('[db] migrations applied'); }
  catch (e) { console.error('[db] migration failed:', e.message); }
  app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
})();

export default app;
