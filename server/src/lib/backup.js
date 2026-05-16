const { spawn } = require('child_process');
const { createGzip } = require('zlib');
const prisma = require('./prisma');
const { sendBackupEmail, isEnabled: isEmailEnabled } = require('./email');

const DUMP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minuti
// Resend accetta allegati fino a ~40MB; sopra i 20MB raw (≈27MB base64)
// preferiamo bloccare con errore controllato così notiamo che è ora di
// passare a storage cloud (R2/B2/S3).
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

// === pg_dump → gzip → Buffer ============================================
// pg_dump deve essere disponibile nel PATH (vedi nixpacks.toml alla root).
// Usa DATABASE_URL come connection string. Flag --no-owner/--no-acl per
// portabilità: il dump è importabile in qualunque DB Postgres senza
// dipendere dai ruoli del cluster sorgente.
function dumpDatabase() {
  return new Promise((resolve, reject) => {
    if (!process.env.DATABASE_URL) {
      return reject(new Error('DATABASE_URL non configurato'));
    }
    const chunks = [];
    const gzip = createGzip({ level: 9 });
    const dump = spawn(
      'pg_dump',
      [process.env.DATABASE_URL, '--no-owner', '--no-acl', '--clean', '--if-exists'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      dump.kill('SIGTERM');
      reject(new Error('pg_dump timeout dopo 5 minuti'));
    }, DUMP_TIMEOUT_MS);

    dump.stderr.on('data', (d) => { stderr += d.toString(); });
    dump.stdout.pipe(gzip);
    gzip.on('data', (chunk) => chunks.push(chunk));
    gzip.on('end', () => {
      clearTimeout(timer);
      if (killed) return;
      resolve(Buffer.concat(chunks));
    });
    gzip.on('error', (err) => { clearTimeout(timer); reject(err); });
    dump.on('error', (err) => {
      clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(new Error('pg_dump non trovato. Verifica nixpacks.toml (aptPkgs=postgresql-client).'));
      } else {
        reject(err);
      }
    });
    dump.on('close', (code) => {
      if (code !== 0 && !killed) {
        clearTimeout(timer);
        reject(new Error(`pg_dump exit code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

async function getDbMetadata() {
  const [users, diary, craving, attempts, promos] = await Promise.all([
    prisma.user.count(),
    prisma.diaryEntry.count(),
    prisma.cravingLog.count(),
    prisma.quitAttempt.count(),
    prisma.promoCode.count(),
  ]);
  return { users, diary, craving, attempts, promos };
}

// === Run completo: dump + invio email ===================================
// Espone una function unica usata sia dal cron giornaliero che dall'endpoint
// admin manuale. Idempotente: niente side-effect su DB.
async function runScheduledBackup({ trigger = 'cron' } = {}) {
  const startedAt = Date.now();
  const to = (process.env.BACKUP_EMAIL_TO || '').trim();
  if (!to) {
    console.log('[backup] skipped: BACKUP_EMAIL_TO non configurato');
    return { skipped: true, reason: 'no-recipient' };
  }
  if (!isEmailEnabled()) {
    console.log('[backup] skipped: Resend non configurato');
    return { skipped: true, reason: 'email-disabled' };
  }

  console.log(`[backup] start (trigger=${trigger})`);
  const buffer = await dumpDatabase();
  const sizeBytes = buffer.length;

  if (sizeBytes > MAX_BACKUP_BYTES) {
    const sizeMb = (sizeBytes / 1024 / 1024).toFixed(1);
    console.error(`[backup] dump troppo grande per email: ${sizeMb}MB > 20MB. Configura storage cloud.`);
    return { error: 'too-large', sizeBytes };
  }

  const meta = await getDbMetadata();
  const durationMs = Date.now() - startedAt;

  const result = await sendBackupEmail(to, buffer, {
    ...meta,
    sizeBytes,
    trigger,
    durationMs,
  });

  console.log(`[backup] done in ${durationMs}ms, ${(sizeBytes / 1024).toFixed(0)}KB → ${to}`);
  return { ok: true, sizeBytes, meta, emailResult: result };
}

module.exports = { runScheduledBackup };
