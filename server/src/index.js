require('dotenv').config();

// ─── Validazione env vars critiche ────────────────────────────────
// Railway/dev devono crashare visibilmente se l'ambiente è mal configurato,
// invece di girare con segreti deboli o servizi mancanti.
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('FATAL: variabili d\'ambiente mancanti:', missing.join(', '));
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET mancante o troppo corto (minimo 32 caratteri)');
  process.exit(1);
}

// Sentry deve essere inizializzato PRIMA di tutto il resto per intercettare gli errori
// dei moduli caricati dopo. Se SENTRY_DSN non è configurato, no-op.
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    environment: process.env.NODE_ENV || 'development',
  });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const passwordResetRoutes = require('./routes/passwordReset');
const quizRoutes = require('./routes/quiz');
const progressRoutes = require('./routes/progress');
const cravingRoutes = require('./routes/craving');
const chatRoutes = require('./routes/chat');
const relapseRoutes = require('./routes/relapse');
const diaryRoutes = require('./routes/diary');
const notificationsRoutes = require('./routes/notifications');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const { init: initPush } = require('./lib/push');
const { startCron } = require('./lib/cron');
const { ensurePromoCodes } = require('./lib/promoCodes');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway sta dietro un reverse proxy: serve trust proxy per leggere req.ip reale
// (rate limiter su IP e logging dipendono da questo).
app.set('trust proxy', 1);

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, ecc.).
// CSP allenta font-src e style-src per Google Fonts (Inter caricato da index.html).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'font-src': ["'self'", 'fonts.gstatic.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
    },
  },
}));

// ─── CORS ristretto a origini whitelisted ───────────────────────────
// Frontend e backend ora vivono sullo stesso dominio (Railway), quindi
// le richieste API in produzione sono same-origin e NON passano da CORS.
// Manteniamo allowedOrigins per: (a) override da env in staging/preview
// Railway, (b) dev locale Vite su :5173.
const allowedOrigins = [
  'https://quitfresh.it',
  'https://www.quitfresh.it',
  'http://localhost:5173',
  process.env.CORS_ORIGIN, // override da env per staging/preview
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permetti richieste senza origin (es. app mobile, curl in dev)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
}));

// Stripe webhook deve ricevere il body raw per verificare la firma — montato PRIMA di express.json
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/craving', cravingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/relapse', relapseRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404 JSON SOLO per route API mancanti (es. typo, endpoint rimosso).
// NON usare catch-all globale, altrimenti lo SPA fallback sotto non scatta.
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint non trovato' }));

// ─── Serve la build React (frontend consolidato su Railway) ─────────
// Vite genera client/dist/ al build. Express lo serve come asset statici
// e fa fallback a index.html per le route SPA (react-router).
//
// Path: process.cwd() = repo root.
// Su Railway con Root Directory = / il start command e' "node server/
// src/index.js" lanciato da /app, quindi cwd = /app e clientDist =
// /app/client/dist. In dev locale il workspace npm parte dalla root del
// monorepo, stesso risultato. __dirname non funzionerebbe perche'
// rimanda a server/src che non e' la posizione del client.
const clientDist = path.join(process.cwd(), 'client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Sentry express error handler — deve venire DOPO le route e PRIMA del nostro
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server' });
});

initPush();
startCron();
ensurePromoCodes().catch(err => console.error('[promo] seed failed:', err));

app.listen(PORT, () => console.log(`QuitFresh server avviato su porta ${PORT}`));
