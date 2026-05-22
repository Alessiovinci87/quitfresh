import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-mobile mx-auto px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-sage-600 hover:underline mb-6 inline-block"
        >
          ← Torna indietro
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-xs text-gray-400 mb-8">Ultimo aggiornamento: 22 maggio 2026</p>

        <Section title="1. Titolare del trattamento">
          QuitFresh<br />
          Servizio gestito da Alessio Vinci<br />
          P.IVA IT03014680908<br />
          Email:{' '}
          <a href="mailto:info@quitfresh.it" className="text-sage-600 underline">
            info@quitfresh.it
          </a>
        </Section>

        <Section title="2. Destinatari del servizio">
          Il servizio è destinato esclusivamente a utenti maggiorenni.
        </Section>

        <Section title="3. Dati raccolti">
          <p className="mb-2">QuitFresh raccoglie i seguenti dati personali:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Dati di registrazione:</strong> indirizzo email, password
              (in forma crittografata).
            </li>
            <li>
              <strong>Dati del profilo fumatore:</strong> numero di sigarette al
              giorno, prezzo del pacchetto, data di inizio percorso, livello di
              dipendenza, momenti critici, protocollo farmacologico (citisina)
              e orari di assunzione.
            </li>
            <li>
              <strong>Dati d'uso:</strong> messaggi inviati alla chat AI coach,
              voci del diario, tentativi di ricaduta.
            </li>
            <li>
              <strong>Dati di pagamento:</strong> gestiti interamente da
              Stripe. QuitFresh non memorizza dati di carta di credito.
            </li>
            <li>
              <strong>Dati tecnici:</strong> token di notifica push (VAPID),
              indirizzi IP, log di accesso.
            </li>
          </ul>
        </Section>

        <Section title="4. Finalità e base giuridica">
          <ul className="space-y-2 list-disc list-inside mb-3">
            <li>
              <strong>Erogazione del servizio</strong> (contratto, art. 6.1.b
              GDPR): gestione account, chat AI, promemoria farmaci, tracker.
            </li>
            <li>
              <strong>Pagamento</strong> (contratto): elaborazione del
              pagamento unico tramite Stripe.
            </li>
            <li>
              <strong>Comunicazioni transazionali</strong> (contratto): email
              di verifica account e reset password.
            </li>
            <li>
              <strong>Obblighi legali</strong> (art. 6.1.c GDPR): conservazione
              dei dati fiscali.
            </li>
          </ul>
          <p>
            I dati sanitari (protocollo citisina, numero di sigarette) sono
            trattati ai sensi dell'art. 9.2.a GDPR su base consensuale
            esplicita, prestato al momento della registrazione.
          </p>
        </Section>

        <Section title="5. Disclaimer medico">
          QuitFresh è uno strumento digitale di supporto motivazionale e
          organizzativo per il percorso antifumo. Non è un dispositivo medico
          e non sostituisce diagnosi, pareri o trattamenti sanitari
          professionali.
        </Section>

        <Section title="6. Servizi terzi">
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>OpenAI</strong> (chat AI coach): i messaggi vengono
              inviati alle API OpenAI. Le richieste inviate tramite API OpenAI
              sono configurate con modalità che escludono l'utilizzo per
              addestramento dei modelli. L'utente è responsabile delle
              informazioni volontariamente condivise nella chat AI.
            </li>
            <li>
              <strong>Stripe</strong> (pagamenti): soggetto alla propria{' '}
              <a
                href="https://stripe.com/it/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-sage-600 underline"
              >
                Privacy Policy
              </a>.
            </li>
            <li>
              <strong>Resend</strong> (email transazionali): soggetto alla
              propria privacy policy.
            </li>
            <li>
              <strong>Railway</strong> (hosting full-stack, frontend + backend
              + database PostgreSQL): server in EU.
            </li>
            <li>
              <strong>Sentry</strong> (error tracking): cattura errori
              tecnici per debug. Configurato per escludere dati personali
              dell'utente nelle stack trace.
            </li>
          </ul>
        </Section>

        <Section title="7. Conservazione dei dati">
          I dati dell'account vengono conservati fino alla cancellazione
          dell'account da parte dell'utente. I dati fiscali sono conservati per
          10 anni come previsto dalla normativa italiana. L'utente può
          eliminare il proprio account in qualsiasi momento dalla sezione
          Profilo → Zona Pericolosa → Elimina account.
        </Section>

        <Section title="8. Diritti dell'interessato">
          <p className="mb-2">
            Ai sensi del GDPR hai diritto di: accesso, rettifica, cancellazione,
            limitazione del trattamento, portabilità, opposizione.
          </p>
          <p className="mb-2">
            <strong>Esercizio automatico nell'app:</strong>
          </p>
          <ul className="space-y-1 list-disc list-inside mb-3">
            <li>
              <strong>Portabilità</strong> (art. 20): Profilo → "Esporta i miei
              dati (GDPR)" scarica un file JSON con tutti i tuoi dati.
            </li>
            <li>
              <strong>Cancellazione</strong> (art. 17): Profilo → "Elimina
              account" cancella in cascata tutti i tuoi dati associati.
            </li>
            <li>
              <strong>Rettifica</strong> (art. 16): Profilo → Gestione abitudini
              per aggiornare i dati del profilo fumatore.
            </li>
          </ul>
          <p>
            Per gli altri diritti scrivi a{' '}
            <a href="mailto:info@quitfresh.it" className="text-sage-600 underline">
              info@quitfresh.it
            </a>
            . Hai inoltre il diritto di proporre reclamo al Garante per la
            Protezione dei Dati Personali (
            <a
              href="https://www.garanteprivacy.it"
              target="_blank"
              rel="noreferrer"
              className="text-sage-600 underline"
            >
              garanteprivacy.it
            </a>
            ).
          </p>
        </Section>

        <Section title="9. Cookie e localStorage">
          QuitFresh <strong>non utilizza cookie di profilazione o di tracciamento
          pubblicitario</strong>. Vengono utilizzati esclusivamente:
          <ul className="space-y-1 list-disc list-inside mt-2">
            <li>
              <strong>localStorage tecnico</strong>: token JWT di sessione,
              consenso cookie, cache altezza tastiera per UX. Non condiviso
              con terzi.
            </li>
            <li>
              <strong>Cookie di Stripe</strong>: solo durante il processo di
              pagamento, gestiti da Stripe per la prevenzione frodi.
            </li>
          </ul>
          <p className="mt-2">
            Al primo accesso viene mostrato un banner informativo con tasto
            "Ho capito" che salva il consenso in localStorage.
          </p>
        </Section>

        <Section title="10. Modifiche">
          Eventuali modifiche alla presente Privacy Policy saranno comunicate
          via email agli utenti registrati e pubblicate su questa pagina con
          aggiornamento della data in cima al documento.
        </Section>

        <p className="text-xs text-gray-400 mt-10 pb-4">
          Per qualsiasi domanda:{' '}
          <a href="mailto:info@quitfresh.it" className="text-sage-600 underline">
            info@quitfresh.it
          </a>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-semibold text-gray-800 mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}
