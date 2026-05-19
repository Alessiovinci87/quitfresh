const { Resend } = require('resend');

const apiKey = (process.env.RESEND_API_KEY || '').trim();
const fromEmail = (process.env.RESEND_FROM_EMAIL || '').trim();

const resend = apiKey ? new Resend(apiKey) : null;

function isEnabled() {
  return Boolean(resend && fromEmail);
}

// Wrapper unico per gestire dev/prod e logging consistente.
async function send({ to, subject, html }) {
  if (!isEnabled()) {
    console.log(`[email] skipped (Resend non configurato) → ${to}: ${subject}`);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (result.error) {
      console.error(`[email] errore Resend → ${to}:`, result.error);
      return { error: result.error };
    }
    console.log(`[email] inviata → ${to} (${subject})`);
    return { id: result.data?.id };
  } catch (err) {
    console.error(`[email] eccezione Resend → ${to}:`, err.message);
    return { error: err };
  }
}

function wrap(title, intro, link, ctaLabel, outro) {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">${title}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4b5563;">${intro}</p>
          <p style="margin:0 0 28px;">
            <a href="${link}" style="display:inline-block;background:#84a98c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:15px;">${ctaLabel}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Se il bottone non funziona, copia e incolla questo link:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;word-break:break-all;">${link}</p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">${outro}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© QuitFresh — il tuo coach per smettere di fumare</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function sendVerifyEmail(to, link) {
  const html = wrap(
    'Conferma il tuo indirizzo',
    'Benvenuto in QuitFresh! Tocca il bottone qui sotto per verificare l\'email e iniziare il percorso.',
    link,
    'Verifica l\'email',
    'Se non hai creato l\'account, puoi ignorare questa email — nessuna azione verrà eseguita.',
  );
  return send({ to, subject: 'Verifica il tuo account QuitFresh', html });
}

function sendResetEmail(to, link) {
  const html = wrap(
    'Reimposta la tua password',
    'Hai richiesto di reimpostare la password di QuitFresh. Il link qui sotto scade tra 1 ora.',
    link,
    'Reimposta password',
    'Se non sei stato tu, ignora questa email: la password resterà invariata e nessuno può accedere al tuo account.',
  );
  return send({ to, subject: 'Reimposta la password QuitFresh', html });
}

// Welcome email: inviata dopo che l'utente verifica l'email. Tono caldo,
// 3 funzioni principali spiegate. Niente claim medici (P.S. rinvia al
// medico per dubbi sul protocollo citisina, coerente con Terms).
function sendWelcomeEmail(to) {
  // Welcome mail: il tasto porta DIRETTAMENTE alle 6 domande di onboarding,
  // non alla home. Così evitiamo che chi clicca da Safari/desktop salti il
  // setup iniziale finendo in una home vuota.
  const appLink = (process.env.CLIENT_BASE_URL || 'https://quitfresh.it').replace(/\/$/, '') + '/onboarding';
  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Benvenuto, il tuo percorso inizia ora 🌱</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#4b5563;">
            La tua email è confermata e tutto è pronto. Smettere di fumare è un percorso personale, ma da oggi non sei solo.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#4b5563;">
            Ecco le 3 cose che troverai più utili nell'app:
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">🌱 Il tuo contatore</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;">Ogni giorno senza fumo viene contato. Vedi i progressi, i soldi risparmiati e i traguardi raggiunti, tutto in tempo reale nella home.</p>
            </td></tr>
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">💊 Promemoria citisina</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;">Se segui il protocollo Tabex/Sopharma, ti avvisiamo per ogni capsula. Niente più orologi da controllare, ci pensiamo noi.</p>
            </td></tr>
            <tr><td style="padding:0;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111827;">💬 Coach AI sempre con te</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;">Quando arriva il craving, apri la chat. Un coach intelligente ti aiuta a superare il momento, senza giudizio, sempre disponibile.</p>
            </td></tr>
          </table>

          <p style="margin:0 0 28px;">
            <a href="${appLink}" style="display:inline-block;background:#84a98c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:15px;">Inizia il percorso</a>
          </p>

          <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#4b5563;">
            Ti faremo 6 brevi domande per personalizzare il tuo percorso (sigarette, dipendenza, citisina). Dura meno di un minuto.
          </p>

          <p style="margin:0 0 8px;font-size:13px;color:#4b5563;">Buon inizio,</p>
          <p style="margin:0 0 24px;font-size:13px;color:#4b5563;">il team di QuitFresh</p>

          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
            <strong>P.S.</strong> Per dubbi sul protocollo farmacologico, parlane sempre con il tuo medico. Noi ti aiutiamo a ricordare, lui sa cosa fare.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© QuitFresh — il tuo coach per smettere di fumare</p>
    </td></tr>
  </table>
</body>
</html>`;
  return send({ to, subject: 'Benvenuto in QuitFresh 🌱', html });
}

// Backup email: invia il dump .sql.gz come allegato a un indirizzo
// admin. Subject con data ISO per filtraggio facile in Gmail.
function sendBackupEmail(to, buffer, meta) {
  const today = new Date();
  const isoDate = today.toISOString().split('T')[0];
  const filename = `quitfresh-backup-${isoDate}.sql.gz`;
  const sizeKb = (buffer.length / 1024).toFixed(0);
  const durationS = ((meta.durationMs || 0) / 1000).toFixed(1);
  const localDate = today.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH · BACKUP DB</p>
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Backup completato</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
            ${localDate}<br>
            <span style="color:#9ca3af;">Trigger: ${meta.trigger || 'cron'} · Durata: ${durationS}s · Dump: ${sizeKb} KB</span>
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:13px;color:#374151;">
            <tr><td>Utenti</td><td style="text-align:right;font-weight:600;">${meta.users}</td></tr>
            <tr><td>Diary entries</td><td style="text-align:right;font-weight:600;">${meta.diary}</td></tr>
            <tr><td>Craving logs</td><td style="text-align:right;font-weight:600;">${meta.craving}</td></tr>
            <tr><td>Quit attempts</td><td style="text-align:right;font-weight:600;">${meta.attempts}</td></tr>
            <tr><td>Promo codes</td><td style="text-align:right;font-weight:600;">${meta.promos}</td></tr>
          </table>

          <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
            <strong>Restore:</strong> <code style="background:#f5f5f4;padding:2px 4px;border-radius:4px;">gunzip -c ${filename} | psql $DATABASE_URL</code>
          </p>
        </td></tr>
      </table>
      <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">© QuitFresh — backup automatico</p>
    </td></tr>
  </table>
</body>
</html>`;

  if (!isEnabled()) {
    console.log(`[email] backup skipped (Resend non configurato) → ${to}`);
    return { skipped: true };
  }
  return resend.emails.send({
    from: fromEmail,
    to,
    subject: `QuitFresh — Backup DB · ${isoDate}`,
    html,
    attachments: [{ filename, content: buffer }],
  }).then((result) => {
    if (result.error) {
      console.error('[email] backup error:', result.error);
      return { error: result.error };
    }
    return { id: result.data?.id };
  }).catch((err) => {
    console.error('[email] backup exception:', err.message);
    return { error: err };
  });
}

// Notifica admin: codice sconto usato. Non-bloccante (errori loggati, non
// propagati al flusso premium). Indirizzo letto da ADMIN_NOTIFY_EMAIL con
// fallback su BACKUP_EMAIL_TO (gia' configurato su Railway per i backup DB).
function sendPromoUsedAdminEmail({ userEmail, userId, code, discountPct, channel }) {
  const to = (process.env.ADMIN_NOTIFY_EMAIL || process.env.BACKUP_EMAIL_TO || '').trim();
  if (!to) {
    console.log('[email] promo-used admin notify skipped: nessun ADMIN_NOTIFY_EMAIL/BACKUP_EMAIL_TO');
    return Promise.resolve({ skipped: true });
  }
  const when = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });
  const channelLabel = channel === 'free' ? 'Attivazione gratuita (codice 100%)' : 'Pagamento Stripe con sconto';
  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH · ADMIN</p>
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Codice sconto usato</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:13px;color:#374151;">
            <tr><td style="padding:4px 0;">Codice</td><td style="text-align:right;font-weight:600;font-family:'SF Mono',Menlo,monospace;">${code}</td></tr>
            <tr><td style="padding:4px 0;">Sconto</td><td style="text-align:right;font-weight:600;">${discountPct}%</td></tr>
            <tr><td style="padding:4px 0;">Canale</td><td style="text-align:right;font-weight:600;">${channelLabel}</td></tr>
            <tr><td style="padding:4px 0;">Utente</td><td style="text-align:right;font-weight:600;">${userEmail || '—'}</td></tr>
            <tr><td style="padding:4px 0;">User ID</td><td style="text-align:right;font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b7280;">${userId || '—'}</td></tr>
            <tr><td style="padding:4px 0;">Quando</td><td style="text-align:right;">${when}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#9ca3af;">Notifica automatica. Per disabilitarla rimuovi <code>ADMIN_NOTIFY_EMAIL</code> dalle env.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return send({ to, subject: `Codice ${code} usato — ${userEmail || userId}`, html });
}

module.exports = { sendVerifyEmail, sendResetEmail, sendWelcomeEmail, sendBackupEmail, sendPromoUsedAdminEmail, isEnabled };
