# QuitFresh — Briefing completo per implementazione versione commerciale

Questo documento contiene tutto il contesto necessario per lavorare sulla versione commerciale di QuitFresh. Leggilo integralmente prima di iniziare qualsiasi modifica.

---

## 1. Cos'è QuitFresh

PWA (Progressive Web App) mobile-first per aiutare le persone a smettere di fumare, con supporto specifico al protocollo citisina (Tabex). Non è un semplice counter — accompagna l'utente durante il percorso di disassuefazione.

**Stack tecnico:**
- Frontend: React + Vite + Tailwind CSS (mobile-first, max-width 430px)
- Backend: Node.js + Express REST API
- Database: PostgreSQL + Prisma ORM
- Auth: JWT + bcryptjs (token contiene solo `{id, email}`)
- Push notifications: Web Push API con chiavi VAPID (`web-push`)
- Scheduler: `node-cron` (ogni minuto, fuso orario Europe/Rome)
- AI chat: OpenAI API
- Deploy: GitHub Pages (frontend) + Railway (backend + PostgreSQL)

---

## 2. Struttura del repository

```
quitfresh/
├── client/                          # Frontend React
│   ├── public/
│   │   ├── manifest.json            # PWA manifest (base: /quitfresh/)
│   │   ├── sw.js                    # Service worker push notifications
│   │   └── icon-192.png / icon-512.png
│   ├── src/
│   │   ├── App.jsx                  # Router principale
│   │   ├── main.jsx                 # Entry point + registrazione SW
│   │   ├── context/AuthContext.jsx  # Auth state globale
│   │   ├── api/client.js            # Fetch wrapper con Bearer token
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Bottom nav (5 tab)
│   │   │   └── PrivateRoute.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Onboarding.jsx       # Quiz iniziale
│   │       ├── Home.jsx             # Dashboard principale
│   │       ├── Profile.jsx          # Impostazioni utente
│   │       ├── Stats.jsx            # Progressi, salute, risparmio, calendario
│   │       ├── Craving.jsx          # Log craving
│   │       ├── Diary.jsx            # Diario giornaliero
│   │       └── Tools.jsx            # Strumenti anti-craving
│   ├── vite.config.js               # base: '/quitfresh/'
│   └── package.json
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.js                 # Express app + CORS
│   │   ├── middleware/auth.js       # requireAuth middleware
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── quiz.js
│   │   │   ├── progress.js
│   │   │   ├── craving.js
│   │   │   ├── chat.js
│   │   │   ├── relapse.js
│   │   │   ├── diary.js
│   │   │   └── notifications.js
│   │   └── lib/
│   │       ├── push.js              # Web push + VAPID
│   │       ├── cron.js              # Scheduler notifiche citisina
│   │       └── openai.js            # OpenAI client
│   ├── railway.json                 # Config deploy Railway
│   └── package.json
├── .github/workflows/deploy.yml     # CI/CD GitHub Pages
└── BRIEFING_NUOVO_CLI.md            # Questo file
```

---

## 3. Schema database attuale (Prisma)

```prisma
model User {
  id                String             @id @default(cuid())
  email             String             @unique
  passwordHash      String
  createdAt         DateTime           @default(now())
  cigarettesPerDay  Int?
  criticalMoments   String[]
  dependencyLevel   Int?
  quitDate          DateTime?          // Data inizio streak "senza fumo"
  cytisineStartDate DateTime?          // Data inizio protocollo citisina
  firstDoseTime     String?            // Es. "09:00" — genera tutto il prospetto
  smokeFreeSince    DateTime?          // Conferma esplicita utente "ho smesso"
  notificationTimes String[]           // Orari promemoria anti-craving
  cravingLogs       CravingLog[]
  quitAttempts      QuitAttempt[]
  diaryEntries      DiaryEntry[]
  pushSubscriptions PushSubscription[]
}

model CravingLog {
  id        String   @id @default(cuid())
  userId    String
  timestamp DateTime @default(now())
  context   String   @default("")
  resolved  Boolean  @default(false)
  user      User     @relation(...)
}

model QuitAttempt {
  id        String    @id @default(cuid())
  userId    String
  startDate DateTime
  endDate   DateTime?
  user      User      @relation(...)
}

model DiaryEntry {
  id              String   @id @default(cuid())
  userId          String
  date            DateTime
  pillsTaken      Int      @default(0)
  cigarettesToday Int      @default(0)
  sideEffects     String[]
  notes           String   @default("")
  createdAt       DateTime @default(now())
  user            User     @relation(...)
  @@unique([userId, date])
}

model PushSubscription {
  id       String @id @default(cuid())
  userId   String
  endpoint String @unique
  p256dh   String
  auth     String
  user     User   @relation(...)
}
```

---

## 4. API endpoints esistenti

```
POST   /api/auth/register          { email, password } → { token, user }
POST   /api/auth/login             { email, password } → { token, user }
GET    /api/auth/me                → { user }

POST   /api/quiz                   { cigarettesPerDay, criticalMoments, dependencyLevel, quitDate, cytisineStartDate, firstDoseTime }
PATCH  /api/quiz/quit-date         { quitDate }
PATCH  /api/quiz/smoke-free-since  { smokeFreeSince }

GET    /api/progress               → { daysSinceQuit, cigarettesAvoided, moneySaved, badges, cravingCount, resolvedCount, quitDate, smokeFreeSince, pastAttempts, bestDays }

POST   /api/craving                { context }
PATCH  /api/craving/:id/resolve
GET    /api/craving/history

POST   /api/chat                   { messages[] } → stream OpenAI

POST   /api/relapse
POST   /api/relapse/restart

GET    /api/diary
POST   /api/diary                  { date, pillsTaken, cigarettesToday, sideEffects, notes }
PATCH  /api/diary/cigs             { date, cigarettes }  ← solo sigarette, senza richiedere pillsTaken

GET    /api/notifications/vapid-key
POST   /api/notifications/subscribe
DELETE /api/notifications/subscribe
PUT    /api/notifications/times    { times[] }
GET    /api/notifications/debug
POST   /api/notifications/test

GET    /api/health
```

---

## 5. Funzionalità esistenti (NON toccare senza motivo)

### Home
- Counter "giorni senza fumo" con pulsanti +/− (aggiornano `quitDate` nel DB via PATCH)
- Widget capsule citisina: cerchi dose del giorno, +/− contatore capsule prese
- Statistiche rapide (sigarette evitate, soldi risparmiati)
- Badge traguardi
- Link rapido a Craving e Diary

### Profile
- Modifica tutti i campi: `cigarettesPerDay`, `criticalMoments`, `dependencyLevel`, `cytisineStartDate`, `firstDoseTime`, `smokeFreeDays`
- Prospetto citisina: auto-genera orari per tutte le 5 fasi dal solo `firstDoseTime`
- Fase corrente evidenziata in verde
- Data inizio e fine protocollo
- Gestione orari promemoria anti-craving (aggiungi/rimuovi)
- Attivazione push notifications
- Badge "Dispositivo registrato ✓"
- Pulsante test notifica

### Stats (pagina Progressi)
- **Tracker sigarette oggi**: +/− con salvataggio automatico, grafico 14 giorni
- **Salute nel tempo**: milestones (20 min → 1 anno) attivate SOLO dopo conferma esplicita "Ho smesso adesso" o input datetime manuale. NON parte automaticamente.
- **Risparmio**: conta giorni con 0 sigarette × €5.80/pacchetto. Ha campo obiettivo (localStorage).
- **Calendario**: colorato per sigarette/giorno (verde=0, giallo=1-5, arancione=6-10, rosso=10+)

### Craving
- Log craving con contesto
- Visualizzazione storia craving
- Risoluzione craving

### Diary
- Diario giornaliero: pillole prese, sigarette, effetti collaterali, note
- Lista ultimi 30 giorni

### Tools
- Strumenti anti-craving (breathing exercise, distraction techniques, ecc.)

### Notifiche push citisina (cron server)
- Ogni minuto controlla l'orario attuale (fuso Europe/Rome)
- Per ogni utente con `cytisineStartDate` e `firstDoseTime`, calcola la fase corrente e gli orari delle dosi
- Invia push "Capsula X di Y · Fase N. Prendila ora!" agli orari corretti
- Anche notifiche manuali anti-craving agli orari impostati dall'utente

**Fasi citisina:**
```js
const CYTISINE_PHASES = [
  { maxDay: 3,  pills: 6, intervalMin: 120 },  // gg 1-3
  { maxDay: 12, pills: 5, intervalMin: 150 },  // gg 4-12
  { maxDay: 16, pills: 4, intervalMin: 180 },  // gg 13-16
  { maxDay: 20, pills: 3, intervalMin: 300 },  // gg 17-20
  { maxDay: 25, pills: 1, intervalMin: 0   },  // gg 21-25
];
```

---

## 6. Bug noti da correggere

### Bug 1 — Profile save richiede campi obbligatori inutili
**File:** `client/src/pages/Profile.jsx` → `handleSave()`
**Problema:** Il tasto "Salva" richiede `cigarettesPerDay` e `dependencyLevel` anche se l'utente vuole solo aggiornare la data citisina o i momenti critici.
**Fix:** Rendere `cigarettesPerDay` e `dependencyLevel` opzionali nel salvataggio, oppure separare il salvataggio citisina dagli altri campi.

### Bug 2 — handleSave chiama api.quiz.save che non aggiorna quitDate se già impostata
**File:** `client/src/pages/Profile.jsx` → `handleSave()`
**Problema:** Se `smokeFreeDays` è vuoto (stringa vuota), `quitDate` non viene passato → la data esistente resta invariata. OK. Ma se l'utente cancella il campo e salva, non c'è modo di azzerare `quitDate`.
**Fix:** Minore, valutare se serve o meno.

---

## 7. Cosa implementare per la versione commerciale

### PRIORITÀ 1 — Freemium + Stripe

**Modello:** acquisto unico €4.99 per sbloccare la chat AI. Tutto il resto rimane gratuito.

**Cosa è gratis vs. premium:**
```
GRATIS:
- Registrazione e onboarding
- Counter giorni senza fumo + pulsanti +/-
- Tracker sigarette giornaliero
- Notifiche citisina automatiche
- Promemoria anti-craving
- Diario
- Stats (salute, risparmio, calendario)
- Log craving

PREMIUM (€4.99 una tantum):
- Chat con coach AI (OpenAI) — illimitata
- [Eventualmente in futuro: export PDF, statistiche avanzate]
```

**Modifiche DB necessarie:**
```prisma
// Aggiungere al model User:
isPremium       Boolean   @default(false)
premiumSince    DateTime?
stripeCustomerId String?  @unique
promoCodeUsed   String?   // Traccia quale promo code ha usato
```

**Modifiche backend necessarie:**

1. Installare `stripe` npm package nel server
2. Creare `server/src/routes/payments.js` con:
   - `POST /api/payments/checkout` → crea Stripe Checkout Session, restituisce URL
   - `POST /api/payments/webhook` → riceve eventi Stripe (checkout.session.completed → imposta isPremium=true)
   - `GET /api/payments/status` → restituisce isPremium dell'utente loggato

3. Aggiornare `server/src/routes/chat.js` → verificare `user.isPremium` prima di rispondere. Se non premium, restituire `{ error: 'PREMIUM_REQUIRED', freeMessagesLeft: N }`.

4. Variabili d'ambiente da aggiungere:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID=price_...   (ID del prodotto €4.99 creato su Stripe Dashboard)
   ```

**Modifiche frontend necessarie:**

1. `client/src/api/client.js` → aggiungere:
   ```js
   payments: {
     checkout: (promoCode) => request('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ promoCode }) }),
     status: () => request('/api/payments/status'),
   }
   ```

2. `client/src/pages/Chat.jsx` (o dove è la chat) → intercettare errore `PREMIUM_REQUIRED` e mostrare paywall con pulsante "Sblocca Premium"

3. Creare `client/src/components/PremiumGate.jsx` — componente riutilizzabile:
   - Se utente è premium: mostra `{children}`
   - Se non premium: mostra card con benefici + pulsante "Sblocca - €4.99"
   - Il pulsante chiama `api.payments.checkout()` e reindirizza a Stripe Checkout

4. Aggiornare `AuthContext` per includere `isPremium` nell'user state

---

### PRIORITÀ 2 — Sistema promo code

**Scopo:** tracciare le acquisizioni da canali specifici (pneumologa, farmacista) e offrire sconti.

**Codici da implementare inizialmente:**
- `DOTTORESSA` — 30% sconto (€3.49)
- `FARMACISTA` — 30% sconto (€3.49)
- `QUITFRESH` — 10% sconto (€4.49) — generico per campagne future

**Modifiche backend:**

1. Aggiungere model `PromoCode` al schema Prisma:
```prisma
model PromoCode {
  id           String   @id @default(cuid())
  code         String   @unique
  discountPct  Int      // 0-100
  active       Boolean  @default(true)
  usageCount   Int      @default(0)
  createdAt    DateTime @default(now())
}
```

2. Popolare con una migration seed o endpoint admin

3. Modificare `POST /api/payments/checkout`:
   - Accetta `{ promoCode? }` nel body
   - Se codice valido → applica sconto tramite Stripe Coupon API
   - Salva `promoCodeUsed` sull'utente
   - Incrementa `usageCount` sul codice

**Modifiche frontend:**

1. Nel componente `PremiumGate` aggiungere campo input "Hai un codice promozionale?"
2. Il codice viene passato alla chiamata `api.payments.checkout(promoCode)`
3. Mostrare lo sconto calcolato prima di reindirizzare a Stripe

---

### PRIORITÀ 3 — Piccoli fix UX

1. **Profile save senza campi obbligatori** (Bug 1 sopra)

2. **Onboarding migliorato**: dopo la registrazione, se l'utente arriva dall'onboarding quiz, dovrebbe poter saltare i campi citisina se non la sta usando (non tutti gli utenti usano citisina — alcuni smettono senza farmaci).

3. **Stato premium visibile**: nel profilo mostrare se l'utente è premium con data di acquisto. Badge "Premium" nella nav o header.

4. **Pagina di successo pagamento**: dopo il redirect da Stripe, mostrare una schermata di benvenuto "Benvenuto in QuitFresh Premium" invece di tornare silenziosamente alla home.

---

## 8. Variabili d'ambiente complete

**Server (Railway):**
```
DATABASE_URL=postgresql://...
JWT_SECRET=<stringa casuale lunga 40+ caratteri>
OPENAI_API_KEY=sk-...
CLIENT_URL=https://alessiovinci87.github.io
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:...@email.it
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
PORT=3001 (Railway la imposta automaticamente)
```

**Client (GitHub Actions / build time):**
```
VITE_API_URL=https://quitfresh-production.up.railway.app
```

---

## 9. Deploy pipeline

**Frontend → GitHub Pages:**
- Workflow: `.github/workflows/deploy.yml`
- Si attiva su push a `main`
- Build: `npm run build` in `client/` con `VITE_API_URL` come env
- Output: `client/dist/` deployato su GitHub Pages
- URL finale: `https://alessiovinci87.github.io/quitfresh/`

**Backend → Railway:**
- `server/railway.json` configura il deploy
- Start command: `npx prisma generate && npx prisma migrate deploy && node src/index.js`
- Health check: `GET /api/health`
- Le migration Prisma vengono applicate automaticamente ad ogni deploy

**Per il webhook Stripe:**
- Su Railway, l'URL del webhook da configurare su Stripe Dashboard è:
  `https://quitfresh-production.up.railway.app/api/payments/webhook`
- Il middleware Express per il webhook deve usare `express.raw()` (NON `express.json()`) per il body — Stripe verifica la firma sul body grezzo

---

## 10. Contesto business

**Target utenti:**
- Persone che stanno smettendo di fumare con citisina (Tabex)
- Persone nel percorso di disassuefazione anche senza farmaci

**Canali di acquisizione:**
- **Pneumologa** (contatto personale): prescrive citisina ai pazienti, può raccomandare l'app durante la visita. Codice promo: `DOTTORESSA`. Non trattare come affiliata per ora — il suo incentivo è avere uno strumento utile per i pazienti.
- **Farmacista influencer** (Instagram/TikTok): pubblico che chiede consigli su farmaci, alta sovrapposizione con acquirenti di Tabex. Codice promo: `FARMACISTA`. Accordo affiliate: 20-30% di commissione per ogni vendita tracciata.

**Modello di prezzo:**
- App gratuita con tutte le funzionalità di tracking
- Chat AI = unico paywall = €4.99 una tantum
- Vantaggio PWA: nessuna commissione App Store (30%), solo Stripe ~€0.32/transazione

**Priorità assoluta:** l'app deve funzionare perfettamente per un utente alla prima settimana di citisina. Il flusso critico è:
1. Registrazione
2. Onboarding: imposta `cytisineStartDate` (data reale di inizio) e `firstDoseTime`
3. L'app auto-calcola la fase, mostra il prospetto, attiva le notifiche push
4. L'utente riceve la notifica "Capsula X di Y · Fase 1" all'orario giusto

---

## 11. Note tecniche importanti

**VAPID keys:** Le chiavi VAPID copiate da terminale possono avere spazi invisibili. In `push.js` è già implementata la sanitizzazione:
```js
const pub = (process.env.VAPID_PUBLIC_KEY || '').trim().replace(/[^A-Za-z0-9\-_]/g, '');
```

**Timezone:** Il server Railway gira in UTC. Tutta la logica temporale del cron usa `Europe/Rome`:
```js
const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
```

**JWT:** Il token contiene solo `{id, email}`. NON contiene quitDate, isPremium, o altri campi profilo. Le route che hanno bisogno di dati utente devono fare `prisma.user.findUnique({ where: { id: req.user.id } })`.

**Stripe webhook:** Deve bypassare il middleware `express.json()`. Configurare così in `index.js`:
```js
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json()); // solo dopo
```

**Branch attuale di sviluppo:** `claude/quitfresh-app-NsSUP`
Il branch `main` potrebbe non avere tutte le modifiche recenti. Verificare con `git log` prima di iniziare.

---

## 12. Ordine di implementazione consigliato

1. Leggere tutto questo documento
2. Fare `git checkout claude/quitfresh-app-NsSUP` e `git pull`
3. Correggere Bug 1 (profile save)
4. Implementare Stripe: schema DB + migration + route payments.js + paywall frontend
5. Implementare sistema promo code
6. Testare il flusso completo: registrazione → onboarding → chat → paywall → pagamento con promo code → accesso premium
7. Aggiornare `.github/workflows/deploy.yml` se servono nuove variabili
8. Deploy su Railway + GitHub Pages

---

*Documento generato il 13/05/2026 nella sessione di sviluppo originale.*
