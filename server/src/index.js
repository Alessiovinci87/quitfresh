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

const { init: initPush } = require('./lib/push');
const { startCron } = require('./lib/cron');
const { ensurePromoCodes } = require('./lib/promoCodes');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway sta dietro un reverse proxy: serve trust proxy per leggere req.ip reale
// (rate limiter su IP e logging dipendono da questo).
app.set('trust proxy', 1);

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, ecc.)
app.use(helmet());

// ─── CORS ristretto a origini whitelisted ───────────────────────────
const allowedOrigins = [
  'https://alessiovinci87.github.io',
  process.env.CORS_ORIGIN, // override da env per staging/dev (es. http://localhost:5173)
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Endpoint non trovato' }));

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
