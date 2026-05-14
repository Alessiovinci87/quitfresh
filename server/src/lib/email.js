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

module.exports = { sendVerifyEmail, sendResetEmail, isEnabled };
