export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "Georgia, serif", color: "#1a1a1a", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem" }}>Privacy Policy</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "2rem" }}>Ultimo aggiornamento: 14 maggio 2026</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>1. Titolare del trattamento</h2>
        <p>
          Alessio Vinci, P.IVA IT03014680908<br />
          Via Alessandro Fleming 41, 07041 Alghero (SS), Italia<br />
          Email: <a href="mailto:info@quitfresh.it" style={{ color: "#4a7c59" }}>info@quitfresh.it</a>
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>2. Dati raccolti</h2>
        <p>QuitFresh raccoglie i seguenti dati personali:</p>
        <ul>
          <li><strong>Dati di registrazione:</strong> indirizzo email, password (in forma crittografata).</li>
          <li><strong>Dati del profilo fumatore:</strong> numero di sigarette al giorno, prezzo del pacchetto, data di inizio percorso, livello di dipendenza, momenti critici, protocollo farmacologico (citisina) e orari di assunzione.</li>
          <li><strong>Dati d'uso:</strong> messaggi inviati alla chat AI coach, voci del diario, tentativi di ricaduta.</li>
          <li><strong>Dati di pagamento:</strong> gestiti interamente da Stripe. QuitFresh non memorizza dati di carta di credito.</li>
          <li><strong>Dati tecnici:</strong> token di notifica push (VAPID), indirizzi IP, log di accesso.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>3. Finalità e base giuridica</h2>
        <ul>
          <li><strong>Erogazione del servizio</strong> (contratto, art. 6.1.b GDPR): gestione account, chat AI, promemoria farmaci, tracker.</li>
          <li><strong>Pagamento</strong> (contratto): elaborazione del pagamento unico tramite Stripe.</li>
          <li><strong>Comunicazioni transazionali</strong> (contratto): email di verifica account e reset password.</li>
          <li><strong>Obblighi legali</strong> (art. 6.1.c GDPR): conservazione dei dati fiscali.</li>
        </ul>
        <p>I dati sanitari (protocollo citisina, numero di sigarette) sono trattati ai sensi dell'art. 9.2.a GDPR su base consensuale esplicita, prestato al momento della registrazione.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>4. Servizi terzi</h2>
        <ul>
          <li><strong>OpenAI</strong> (chat AI coach): i messaggi vengono inviati alle API OpenAI. OpenAI non utilizza i dati degli utenti API per addestrare i propri modelli (opt-out attivo).</li>
          <li><strong>Stripe</strong> (pagamenti): soggetto alla propria <a href="https://stripe.com/it/privacy" style={{ color: "#4a7c59" }}>Privacy Policy</a>.</li>
          <li><strong>Resend</strong> (email transazionali): soggetto alla propria privacy policy.</li>
          <li><strong>Railway</strong> (hosting backend): server in EU.</li>
          <li><strong>GitHub Pages</strong> (hosting frontend).</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>5. Conservazione dei dati</h2>
        <p>I dati dell'account vengono conservati fino alla cancellazione dell'account da parte dell'utente. I dati fiscali sono conservati per 10 anni come previsto dalla normativa italiana. L'utente può eliminare il proprio account in qualsiasi momento dalla sezione Profilo → Zona Pericolosa → Elimina account.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>6. Diritti dell'interessato</h2>
        <p>Ai sensi del GDPR hai diritto di: accesso, rettifica, cancellazione, limitazione del trattamento, portabilità, opposizione. Per esercitare i tuoi diritti scrivi a <a href="mailto:info@quitfresh.it" style={{ color: "#4a7c59" }}>info@quitfresh.it</a>. Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" style={{ color: "#4a7c59" }}>garanteprivacy.it</a>).</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>7. Cookie e tracciamento</h2>
        <p>QuitFresh non utilizza cookie di profilazione o di tracciamento pubblicitario. Vengono utilizzati esclusivamente token tecnici (JWT) per mantenere la sessione di accesso, conservati in memoria del browser.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>8. Modifiche</h2>
        <p>Eventuali modifiche alla presente Privacy Policy saranno comunicate via email agli utenti registrati e pubblicate su questa pagina con aggiornamento della data in cima al documento.</p>
      </section>

      <p style={{ marginTop: "3rem", fontSize: "0.85rem", color: "#888" }}>
        Per qualsiasi domanda: <a href="mailto:info@quitfresh.it" style={{ color: "#4a7c59" }}>info@quitfresh.it</a>
      </p>
    </div>
  );
}
