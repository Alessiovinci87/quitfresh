const { Resend } = require('resend');

const apiKey = (process.env.RESEND_API_KEY || '').trim();
const fromEmail = (process.env.RESEND_FROM_EMAIL || '').trim();

const resend = apiKey ? new Resend(apiKey) : null;

function isEnabled() {
  return Boolean(resend && fromEmail);
}

// Wrapper unico per gestire dev/prod e logging consistente.
async function send({ to, subject, html, from }) {
  if (!isEnabled()) {
    console.log(`[email] skipped (Resend non configurato) → ${to}: ${subject}`);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({
      from: from || fromEmail,
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

// Broadcast "attiva le notifiche": invitiamo gli iscritti che NON hanno
// ancora una push subscription ad attivarle dal Profilo. Canale email perche'
// la push, per definizione, non li raggiunge. CTA porta a /profile.
//
// opts.promo (opzionale): { code, discountPct, expiresAt } — se presente,
// aggiunge un riquadro "regalo" con il codice sconto. Il codice resta un
// bonus: titolo e bottone restano centrati sulle notifiche.
function buildActivateNotificationsHtml(opts = {}) {
  const link = (process.env.CLIENT_BASE_URL || 'https://quitfresh.it').replace(/\/$/, '') + '/profile';
  const promo = opts.promo;

  let promoBlock = '';
  if (promo && promo.code) {
    const expiry = promo.expiresAt
      ? ` <span style="color:#9ca3af;">(scade il ${new Date(promo.expiresAt).toLocaleDateString('it-IT')})</span>`
      : '';
    promoBlock = `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#f0f5f1;border:1px dashed #84a98c;border-radius:14px;">
            <tr><td style="padding:18px 20px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">🎁 Un regalo per te</p>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#4b5563;">Usa il codice qui sotto e ottieni il <strong>−${promo.discountPct}%</strong> su QuitFresh Premium${expiry}</p>
              <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:2px;font-family:'SF Mono',Menlo,monospace;color:#84a98c;">${promo.code}</p>
            </td></tr>
          </table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Attiva le notifiche per non mollare 🌱</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.55;color:#4b5563;">
            Le notifiche sono il cuore di QuitFresh: ti ricordiamo le capsule di citisina, ti diamo una spinta nei momenti critici della giornata e celebriamo i tuoi traguardi. Senza, ti perdi la parte che fa la differenza. Bastano pochi secondi.
          </p>
          ${promoBlock}
          <p style="margin:0 0 28px;">
            <a href="${link}" style="display:inline-block;background:#84a98c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:15px;">Attiva le notifiche</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
            Vai su Profilo → Notifiche e concedi il permesso quando il telefono te lo chiede. Se le hai già attive, ignora pure questa email.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© QuitFresh — il tuo coach per smettere di fumare</p>
    </td></tr>
  </table>
</body>
</html>`;
  return html;
}

function sendActivateNotificationsEmail(to, opts = {}) {
  const html = buildActivateNotificationsHtml(opts);
  return send({ to, subject: 'Attiva le notifiche di QuitFresh 🌱', html });
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
  // Accetta uno o piu' destinatari separati da virgola, es:
  // ADMIN_NOTIFY_EMAIL="info@quitfresh.it,alessio.vinci87@gmail.com"
  const raw = (process.env.ADMIN_NOTIFY_EMAIL || process.env.BACKUP_EMAIL_TO || '').trim();
  const recipients = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.log('[email] promo-used admin notify skipped: nessun ADMIN_NOTIFY_EMAIL/BACKUP_EMAIL_TO');
    return Promise.resolve({ skipped: true });
  }
  const to = recipients.length === 1 ? recipients[0] : recipients;
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

// Notifica admin: nuovo utente registrato. Non-bloccante. Destinatari letti
// da ADMIN_NOTIFY_EMAIL (CSV), con fallback su entrambe le caselle admin se
// la env non e' configurata. Mittente forzato a noreply@quitfresh.it
// indipendentemente da RESEND_FROM_EMAIL.
function sendNewUserAdminEmail({ userEmail, createdAt, ip, userAgent, referer }) {
  const raw = (process.env.ADMIN_NOTIFY_EMAIL || process.env.BACKUP_EMAIL_TO
    || 'info@quitfresh.it').trim();
  const recipients = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.warn('[email] new-user admin notify skipped: nessun destinatario');
    return Promise.resolve({ skipped: true });
  }
  const to = recipients.length === 1 ? recipients[0] : recipients;
  const when = new Date(createdAt || Date.now()).toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH · ADMIN</p>
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Nuovo utente registrato 🌱</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:13px;color:#374151;">
            <tr><td style="padding:4px 0;">Email</td><td style="text-align:right;font-weight:600;">${userEmail || '—'}</td></tr>
            <tr><td style="padding:4px 0;">Quando</td><td style="text-align:right;">${when}</td></tr>
            <tr><td style="padding:4px 0;">IP</td><td style="text-align:right;font-family:'SF Mono',Menlo,monospace;font-size:11px;">${ip || '—'}</td></tr>
            <tr><td style="padding:4px 0;">Referer</td><td style="text-align:right;font-size:11px;color:#6b7280;word-break:break-all;">${referer || '—'}</td></tr>
            <tr><td style="padding:4px 0;vertical-align:top;">User-Agent</td><td style="text-align:right;font-size:11px;color:#6b7280;word-break:break-all;">${userAgent || '—'}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#9ca3af;">Notifica automatica registrazione. Per disabilitarla rimuovi la chiamata in <code>auth.js</code>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return send({
    to,
    from: 'QuitFresh <noreply@quitfresh.it>',
    subject: `Nuova registrazione: ${userEmail || 'utente'}`,
    html,
  });
}

// Notifica admin: nuovo pagamento Stripe. Non-bloccante.
function sendNewPaymentAdminEmail({ userEmail, userId, amount, currency, promoCode, sessionId }) {
  const to = 'alessio.vinci87@gmail.com';
  const when = new Date().toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const amountFmt = (typeof amount === 'number')
    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: (currency || 'EUR').toUpperCase() }).format(amount / 100)
    : '—';
  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH · ADMIN</p>
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">💸 Nuovo pagamento Premium</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:13px;color:#374151;">
            <tr><td style="padding:4px 0;">Importo</td><td style="text-align:right;font-weight:700;font-size:15px;color:#16a34a;">${amountFmt}</td></tr>
            <tr><td style="padding:4px 0;">Email</td><td style="text-align:right;font-weight:600;">${userEmail || '—'}</td></tr>
            <tr><td style="padding:4px 0;">User ID</td><td style="text-align:right;font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b7280;">${userId || '—'}</td></tr>
            <tr><td style="padding:4px 0;">Codice promo</td><td style="text-align:right;font-weight:600;">${promoCode || '—'}</td></tr>
            <tr><td style="padding:4px 0;">Session ID</td><td style="text-align:right;font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b7280;word-break:break-all;">${sessionId || '—'}</td></tr>
            <tr><td style="padding:4px 0;">Quando</td><td style="text-align:right;">${when}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#9ca3af;">Notifica automatica pagamento Stripe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return send({
    to,
    from: 'QuitFresh <noreply@quitfresh.it>',
    subject: `💸 Pagamento ${amountFmt} — ${userEmail || userId}`,
    html,
  });
}

// Daily analytics report inviato dal cron alle 08:30 Europe/Rome.
function sendDailyReportEmail(reportData) {
  const to = 'alessio.vinci87@gmail.com';
  const d = reportData;
  const yDate = new Date(d.period.yesterdayStart).toLocaleDateString('it-IT', { dateStyle: 'full' });

  function pct(n) { return n == null ? '—' : `${Math.round(n * 100)}%`; }
  function row(label, value) {
    return `<tr><td style="padding:4px 0;color:#4b5563;">${label}</td><td style="text-align:right;font-weight:600;color:#111827;">${value}</td></tr>`;
  }

  const byTypeRows = Object.entries(d.yesterday.byType || {})
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<tr><td style="padding:2px 0;font-family:monospace;color:#374151;">${t}</td><td style="text-align:right;color:#6b7280;">${n}</td></tr>`)
    .join('') || '<tr><td colspan="2" style="color:#9ca3af;">Nessun evento</td></tr>';

  const topActiveRows = d.topActive.length
    ? d.topActive.map(t => `<tr><td style="padding:2px 0;color:#374151;">${t.email}</td><td style="text-align:right;color:#6b7280;">${t.actions} azioni</td></tr>`).join('')
    : '<tr><td colspan="2" style="color:#9ca3af;">Nessun utente attivo ieri</td></tr>';

  const newUsersRows = d.newUsersList.length
    ? d.newUsersList.map(u => `<tr><td style="padding:2px 0;color:#374151;">${u.email}</td><td style="text-align:right;color:#6b7280;">${u.emailVerified ? '✓ verif' : 'non verif'}</td></tr>`).join('')
    : '<tr><td colspan="2" style="color:#9ca3af;">Nessuna nuova registrazione</td></tr>';

  const dormantRows = d.dormantUsers.length
    ? d.dormantUsers.slice(0, 10).map(u => {
        const days = u.lastActiveAt ? Math.floor((Date.now() - new Date(u.lastActiveAt).getTime()) / 86400000) : null;
        return `<tr><td style="padding:2px 0;color:#374151;">${u.email}</td><td style="text-align:right;color:#6b7280;">${days != null ? `${days}gg fa` : 'mai loggato'}</td></tr>`;
      }).join('')
    : '<tr><td colspan="2" style="color:#9ca3af;">Nessun dormiente</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;padding:28px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#84a98c;font-size:13px;font-weight:600;letter-spacing:0.5px;">QUITFRESH · DAILY REPORT</p>
          <h1 style="margin:0 0 4px;font-size:22px;color:#111827;">📊 ${yDate}</h1>
          <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;">Generato ${new Date(d.generatedAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' })} Europe/Rome</p>

          <h2 style="margin:0 0 8px;font-size:14px;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">📈 Overall</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:13px;">
            ${row('Utenti totali', d.overall.totalUsers)}
            ${row('DAU / WAU / MAU', `${d.overall.DAU} / ${d.overall.WAU} / ${d.overall.MAU}`)}
            ${row('DAU su totale', pct(d.overall.dauOverTotal))}
          </table>

          <h2 style="margin:0 0 8px;font-size:14px;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">📅 Ieri</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:13px;">
            ${row('Nuove registrazioni', d.yesterday.newUsers)}
            ${row('Nuovi premium', `${d.yesterday.newPremium}${d.yesterday.newPremiumViaPromo ? ` (di cui ${d.yesterday.newPremiumViaPromo} con codice)` : ''}`)}
            ${row('Utenti attivi (eventi)', d.yesterday.activeUniqueByEvents)}
            ${row('SOS', `${d.yesterday.sos.started} avviati → ${d.yesterday.sos.completed} completati ${d.yesterday.sos.completionRate != null ? `(${pct(d.yesterday.sos.completionRate)})` : ''}`)}
            ${row('Funnel paywall', `${d.yesterday.paywall.seen} visti → ${d.yesterday.paywall.cta} CTA → ${d.yesterday.paywall.checkout} checkout`)}
            ${row('Chat limit hit', d.yesterday.chatLimitHits)}
          </table>

          <h2 style="margin:0 0 8px;font-size:14px;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">🧑‍🤝‍🧑 Top attivi ieri</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:13px;">
            ${topActiveRows}
          </table>

          <h2 style="margin:0 0 8px;font-size:14px;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">🌱 Nuovi utenti ieri</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:13px;">
            ${newUsersRows}
          </table>

          <h2 style="margin:0 0 8px;font-size:14px;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">😴 Dormienti (>14gg)</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:13px;">
            ${dormantRows}
          </table>

          <h2 style="margin:0 0 8px;font-size:14px;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">🔍 Eventi di ieri per tipo</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f5f5f4;border-radius:12px;padding:14px 16px;font-size:12px;">
            ${byTypeRows}
          </table>

          <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;">Dashboard live: <a href="https://quitfresh.it/admin/analytics" style="color:#84a98c;">quitfresh.it/admin/analytics</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return send({
    to,
    from: 'QuitFresh <noreply@quitfresh.it>',
    subject: `📊 QuitFresh Daily — ${yDate}`,
    html,
  });
}

module.exports = { sendVerifyEmail, sendResetEmail, sendWelcomeEmail, sendActivateNotificationsEmail, buildActivateNotificationsHtml, sendBackupEmail, sendPromoUsedAdminEmail, sendNewUserAdminEmail, sendNewPaymentAdminEmail, sendDailyReportEmail, isEnabled };
