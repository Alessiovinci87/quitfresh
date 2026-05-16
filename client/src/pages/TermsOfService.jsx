import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Termini di Servizio</h1>
        <p className="text-xs text-gray-400 mb-8">Ultimo aggiornamento: 16 maggio 2026</p>

        <Section title="1. Accettazione">
          Utilizzando QuitFresh accetti integralmente i presenti Termini di
          Servizio. Se non li accetti, non utilizzare il servizio. Il servizio
          è fornito da Alessio Vinci, P.IVA IT03014680908, Via Alessandro
          Fleming 41, 07041 Alghero (SS).
        </Section>

        <Section title="2. Descrizione del servizio">
          QuitFresh è un'applicazione di supporto per smettere di fumare. Offre
          strumenti di monitoraggio del percorso, promemoria per l'assunzione
          di farmaci, diario personale e una chat con un coach AI basato su
          intelligenza artificiale. Il servizio <strong>non costituisce una
          prestazione medica</strong> e non sostituisce il parere di un medico
          o di un professionista sanitario.
        </Section>

        <Section title="3. Pagamento e accesso premium">
          L'accesso completo a QuitFresh richiede un pagamento unico di{' '}
          <strong>€2,99</strong> (IVA inclusa ove applicabile). Il pagamento è
          processato in modo sicuro tramite Stripe. Non sono previsti
          abbonamenti, rinnovi automatici o costi aggiuntivi nascosti. Il
          pagamento sblocca l'accesso permanente all'account su cui è stato
          effettuato.
        </Section>

        <Section title="4. Diritto di recesso">
          <p className="mb-2">
            Ai sensi del Codice del Consumo (D.Lgs. 206/2005) e della Direttiva
            2011/83/UE, hai diritto di recedere dal contratto entro 14 giorni
            dall'acquisto senza fornire alcuna motivazione. Per esercitare il
            diritto di recesso contatta{' '}
            <a href="mailto:info@quitfresh.it" className="text-sage-600 underline">
              info@quitfresh.it
            </a>
            . Il rimborso verrà effettuato entro 14 giorni dalla ricezione
            della richiesta tramite lo stesso metodo di pagamento utilizzato.
          </p>
          <p>
            <strong>Nota:</strong> accedendo ai contenuti premium prima della
            scadenza dei 14 giorni, acconsenti espressamente all'esecuzione
            anticipata del contratto e riconosci che perderai il diritto di
            recesso una volta che il servizio sarà stato completamente fruito.
          </p>
        </Section>

        <Section title="5. Disclaimer medico e protocollo citisina">
          <p className="mb-2">
            <strong>La citisina è un farmaco soggetto a prescrizione
            medica.</strong> QuitFresh fornisce solo strumenti di monitoraggio
            e promemoria del protocollo di assunzione (es. Tabex / Sopharma):
            non prescrive farmaci e non sostituisce in alcun caso il consulto
            medico.
          </p>
          <p className="mb-2">
            Gli orari, le dosi e le indicazioni del protocollo mostrati in
            QuitFresh seguono il foglietto illustrativo del produttore. In
            caso di effetti collaterali, dubbi sull'assunzione, condizioni
            mediche preesistenti, gravidanza/allattamento o assunzione di
            altri farmaci, <strong>consulta il tuo medico</strong> prima di
            iniziare o modificare il protocollo.
          </p>
          <p>
            QuitFresh non garantisce il raggiungimento di specifici risultati
            (ad esempio smettere definitivamente di fumare). La chat AI
            fornisce indicazioni di carattere generale e non sostituisce in
            alcun caso la consulenza di un medico o di un professionista
            sanitario. Il titolare non è responsabile per danni diretti o
            indiretti derivanti dall'uso o dall'impossibilità di usare il
            servizio, nei limiti consentiti dalla legge applicabile.
          </p>
        </Section>

        <Section title="6. Obblighi dell'utente">
          L'utente si impegna a: fornire dati veritieri in fase di
          registrazione; non utilizzare il servizio per scopi illeciti; non
          tentare di aggirare i meccanismi di sicurezza o di accesso; non
          condividere le proprie credenziali con terzi.
        </Section>

        <Section title="7. Sospensione e cancellazione">
          L'utente può cancellare il proprio account in qualsiasi momento
          dalla sezione Profilo. La cancellazione comporta l'eliminazione di
          tutti i dati personali, salvo gli obblighi di conservazione previsti
          dalla legge. Il titolare si riserva il diritto di sospendere
          l'accesso in caso di violazione dei presenti Termini.
        </Section>

        <Section title="8. Proprietà intellettuale">
          Tutti i contenuti, il codice, il design e i testi di QuitFresh sono
          di proprietà esclusiva di Alessio Vinci. È vietata la riproduzione,
          distribuzione o modifica senza autorizzazione scritta.
        </Section>

        <Section title="9. Legge applicabile e foro competente">
          I presenti Termini sono regolati dalla legge italiana. Per le
          controversie con consumatori si applicano le norme sulla risoluzione
          alternativa delle controversie (ADR/ODR). La piattaforma ODR della
          Commissione Europea è disponibile su{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noreferrer"
            className="text-sage-600 underline"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </Section>

        <Section title="10. Modifiche ai Termini">
          Il titolare si riserva il diritto di modificare i presenti Termini.
          Le modifiche sostanziali saranno comunicate via email con almeno 30
          giorni di preavviso. L'uso continuato del servizio dopo tale periodo
          costituisce accettazione delle nuove condizioni.
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
