import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-mobile mx-auto px-6 py-8">
        <Link to="/login" className="text-xs text-sage-600 hover:underline mb-6 inline-block">
          ← Torna al login
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Informativa sulla Privacy</h1>
        <p className="text-xs text-gray-400 mb-8">Ultimo aggiornamento: 13 maggio 2026</p>

        <Section title="Chi siamo">
          QuitFresh è un'applicazione web (PWA) che aiuta le persone a smettere
          di fumare. Per qualsiasi richiesta riguardante questa informativa o i
          tuoi dati personali, puoi scriverci a{' '}
          <a href="mailto:privacy@quitfresh.app" className="text-sage-600 underline">
            privacy@quitfresh.app
          </a>.
        </Section>

        <Section title="Dati che raccogliamo">
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Dati di account</strong>: indirizzo email e password (la
              password viene salvata cifrata con bcrypt, non in chiaro).
            </li>
            <li>
              <strong>Dati del percorso di disassuefazione</strong>: sigarette al
              giorno dichiarate, livello di dipendenza, momenti critici, data di
              inizio del percorso, eventuale protocollo citisina e relativi
              orari di assunzione.
            </li>
            <li>
              <strong>Dati di utilizzo</strong>: registrazioni di craving, voci
              del diario (capsule prese, sigarette del giorno, note libere),
              orari dei promemoria push.
            </li>
            <li>
              <strong>Messaggi della chat AI</strong>: il contenuto delle
              conversazioni con il coach AI viene trasmesso a OpenAI per la
              generazione delle risposte (vedi sezione "Trattamenti da parte di
              terze parti").
            </li>
            <li>
              <strong>Dati di pagamento</strong>: se acquisti la versione Premium,
              il pagamento è gestito da Stripe. Noi conserviamo solo l'ID cliente
              Stripe e lo stato premium — non vediamo né archiviamo i dati della
              carta.
            </li>
          </ul>
        </Section>

        <Section title="Trattamenti da parte di terze parti (sub-processor)">
          <p className="mb-2">Per fornire il servizio utilizziamo i seguenti fornitori:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>OpenAI</strong> — i messaggi che invii nella chat AI vengono
              elaborati dai modelli OpenAI per generare le risposte del coach.
              Consulta la{' '}
              <a href="https://openai.com/privacy" target="_blank" rel="noreferrer" className="text-sage-600 underline">
                privacy policy di OpenAI
              </a>.
            </li>
            <li>
              <strong>Stripe</strong> — gestisce i pagamenti della versione Premium.
            </li>
            <li>
              <strong>Railway</strong> — ospita il nostro backend e database.
            </li>
            <li>
              <strong>Sentry</strong> — riceve eventuali errori tecnici dell'app
              (senza dati identificativi diretti) per migliorare la stabilità.
            </li>
          </ul>
        </Section>

        <Section title="I tuoi diritti">
          <p className="mb-2">
            In base al GDPR hai diritto a:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Accesso</strong>: chiedere copia dei dati che trattiamo su di te.</li>
            <li><strong>Rettifica</strong>: aggiornare i dati inesatti (puoi farlo da Profilo).</li>
            <li>
              <strong>Cancellazione</strong>: eliminare account e tutti i dati associati.
              È disponibile in app: Profilo → Zona pericolosa → "Elimina account". La
              cancellazione è immediata e irreversibile.
            </li>
            <li><strong>Portabilità</strong>: ricevere i tuoi dati in formato leggibile (su richiesta via email).</li>
            <li><strong>Opposizione e reclamo</strong>: rivolgerti al Garante Privacy.</li>
          </ul>
        </Section>

        <Section title="Conservazione dei dati">
          <p>
            Conserviamo i tuoi dati finché l'account è attivo. Se elimini
            l'account, tutti i dati associati vengono cancellati immediatamente
            dal nostro database. I log tecnici (errori) eventualmente raccolti
            da Sentry vengono ruotati entro 90 giorni.
          </p>
        </Section>

        <Section title="Sicurezza">
          <p>
            La comunicazione tra app e server avviene sempre via HTTPS. Le
            password sono salvate solo come hash bcrypt. L'accesso ai dati è
            limitato al solo team tecnico e protetto da credenziali individuali.
          </p>
        </Section>

        <Section title="Contatti">
          <p>
            Titolare del trattamento e contatti per qualsiasi richiesta:{' '}
            <a href="mailto:privacy@quitfresh.app" className="text-sage-600 underline">
              privacy@quitfresh.app
            </a>.
          </p>
        </Section>

        <div className="text-center mt-10 pb-4">
          <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">
            ← Torna al login
          </Link>
        </div>
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
