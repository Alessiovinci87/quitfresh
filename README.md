# QuitFresh

App mobile-first per smettere di fumare — supporto AI contestuale nei momenti di craving.

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **AI**: OpenAI API (GPT-4o)
- **Auth**: JWT + bcrypt

## Prerequisiti

- Node.js 18+
- PostgreSQL 14+
- Chiave API OpenAI

## Setup

### 1. Clona e installa le dipendenze

```bash
git clone <repo-url>
cd quitfresh
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configura le variabili d'ambiente

**Server** — copia `server/.env.example` in `server/.env`:

```bash
cp server/.env.example server/.env
```

Modifica `server/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/quitfresh"
JWT_SECRET="cambia-questo-con-una-stringa-sicura-lunga"
OPENAI_API_KEY="sk-..."
PORT=3001
```

**Client** — copia `client/.env.example` in `client/.env`:

```bash
cp client/.env.example client/.env
```

Modifica `client/.env`:

```env
VITE_API_URL="http://localhost:3001"
```

### 3. Prepara il database

```bash
cd server

# Esegui le migration
npx prisma migrate dev --name init

# (Opzionale) Seed con utente di test
npx prisma db seed
```

Credenziali utente di test:
- **Email**: `test@quitfresh.app`
- **Password**: `password123`
- **Data smessa di fumare**: 7 giorni fa

### 4. Avvia in sviluppo

Dalla root del monorepo:

```bash
npm run dev
```

Oppure separatamente:

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

- Client: http://localhost:5173
- Server API: http://localhost:3001

## API

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrazione | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Dati utente corrente | Sì |
| POST | `/api/quiz` | Salva profilo quiz | Sì |
| GET | `/api/progress` | Statistiche progresso | Sì |
| POST | `/api/craving` | Log craving + risposta AI | Sì |
| GET | `/api/craving/history` | Storico craving | Sì |

### Rate limiting

L'endpoint `POST /api/craving` è limitato a **10 chiamate/ora** per utente.

## Struttura progetto

```
quitfresh/
├── client/                  # React + Vite
│   ├── src/
│   │   ├── api/             # Client HTTP
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Schermate app
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Craving.jsx
│   │   │   └── Profile.jsx
│   │   └── components/
│   └── ...
├── server/                  # Node.js + Express
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── middleware/
│       ├── routes/
│       ├── lib/
│       └── index.js
└── README.md
```

## Variabili d'ambiente — riferimento completo

### Server (`server/.env`)

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `DATABASE_URL` | Stringa connessione PostgreSQL | `postgresql://...` |
| `JWT_SECRET` | Chiave segreta per JWT | stringa random lunga |
| `OPENAI_API_KEY` | Chiave API OpenAI | `sk-...` |
| `PORT` | Porta server (default 3001) | `3001` |

### Client (`client/.env`)

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `VITE_API_URL` | URL base del server | `http://localhost:3001` |

## Deploy

### Server
Il server è una standard Express app. Compatibile con Railway, Render, Fly.io.  
Ricorda di eseguire `npx prisma migrate deploy` in produzione.

### Client
Build statica con `npm run build --workspace=client`.  
Compatibile con Vercel, Netlify, Cloudflare Pages.  
Imposta `VITE_API_URL` sull'URL del server in produzione.
