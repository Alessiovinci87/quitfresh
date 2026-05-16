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
// CSP MODERATA: stringe object/base/frame/connect ma mantiene
// 'unsafe-inline' e 'unsafe-eval' su script-src perche' il bundle prod
// (Sentry SDK + vite-plugin-pwa workbox) richiede entrambi. Senza,
// l'app va in ErrorBoundary al boot (testato il 15 maggio, vedi tag
// pre-final-security-batch).
// Per recuperare protezione XSS in futuro: migrare a nonce-based CSP3.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'js.stripe.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      'font-src': ["'self'", 'fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'", 'https://*.sentry.io', 'https://*.ingest.sentry.io', 'https://api.stripe.com', 'https://m.stripe.com'],
      'frame-src': ['js.stripe.com', 'hooks.stripe.com'],
      'worker-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Necessario per service worker PWA
}));

// ─── CORS ristretto a origini whitelisted ───────────────────────────
// Frontend e backend ora vivono sullo stesso dominio (Railway), quindi
// le richieste API in produzione sono same-origin e NON passano da CORS.
// Manteniamo allowedOrigins per: (a) override da env in staging/preview
// Railway, (b) dev locale Vite su :5173, (c) PWA installate vecchie che
// erano hostate su github.io o sul dominio Railway diretto — devono
// continuare a funzionare durante la transizione finche' gli utenti
// reinstallano.
const allowedOrigins = [
  'https://quitfresh.it',
  'https://www.quitfresh.it',
  'https://alessiovinci87.github.io', // PWA vecchie installate da GH Pages
  'https://quitfresh-production.up.railway.app', // se qualcuno ha installato da URL Railway diretto
  'http://localhost:5173', // dev locale Vite
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
// Body size limit 100kb: previene DoS via payload enormi. Ampio per
// qualsiasi POST legittimo (testo chat, diario, settings).
app.use(express.json({ limit: '100kb' }));

// Rate limit globale su /api/* (300/min per utente/IP). I limiter
// specifici nelle route sensibili (login, chat, craving, forgotPassword)
// si sommano sopra.
const { apiLimiter } = require('./middleware/rateLimit');
app.use('/api', apiLimiter);

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
// Path basato su __dirname per essere indipendente dal cwd. Su Railway
// lo startCommand fa "cd server && ... && node src/index.js" quindi cwd
// e' /app/server, ma __dirname e' /app/server/src e ../../client/dist
// risolve sempre a /app/client/dist. In dev locale __dirname punta
// a <repo>/server/src e ../../client/dist a <repo>/client/dist.
const clientDist = path.join(__dirname, '../../client/dist');
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
