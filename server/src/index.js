require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
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

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));

// Stripe webhook deve ricevere il body raw per verificare la firma — montato PRIMA di express.json
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
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
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server' });
});

initPush();
startCron();
ensurePromoCodes().catch(err => console.error('[promo] seed failed:', err));

app.listen(PORT, () => console.log(`QuitFresh server avviato su porta ${PORT}`));
