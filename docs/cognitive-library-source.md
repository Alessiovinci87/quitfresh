# QuitFresh — Cognitive Library Source v1.0

## Filosofia

QuitFresh non è un'app antifumo standard. È uno strumento di micro-CBT contestuale invisibile, ispirato al metodo Allen Carr: smontare illusioni mentali, non chiedere forza di volontà.

La libreria è FRAMEWORK INVISIBILE, non output pool:
- **Notifiche e SOS**: output diretto consentito
- **Chat AI**: le frasi orientano il ragionamento, MAI vengono citate alla lettera

---

## 8 esempi taggati di riferimento (Livello CORE CRITICAL)

### Esempio 1 — Craving Acuto contenitivo

```json
{
  "id": "craving_acuto_001",
  "text": "Non serve decidere il resto della giornata adesso.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["sovraccarico mentale", "urgenza", "catastrofizzazione anticipatoria"],
  "cognitive_pattern": ["catastrofizzazione", "urgenza artificiale", "tutto-o-niente"],
  "craving_phase": ["picco", "post-picco"],
  "tone": ["contenitivo", "lucido", "molto umano"],
  "intensity": "alta",
  "human_intensity": 9,
  "cognitive_depth": "low",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["pre_relapse", "stable"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_closer"],
  "response_energy": ["grounding", "containment"],
  "silence_compatibility": true,
  "mental_effect": [
    "riduce urgenza",
    "restringe orizzonte temporale al presente",
    "separa impulso da decisione",
    "contiene catastrofizzazione",
    "riduce il peso percepito della decisione",
    "impedisce al craving di occupare tutta la giornata"
  ]
}
```

### Esempio 2 — Craving Acuto osservativo

```json
{
  "id": "craving_acuto_002",
  "text": "Questo momento sembra enorme perché il cervello lo sta amplificando in tempo reale.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["sovraccarico mentale", "panico cognitivo", "perdita di prospettiva"],
  "cognitive_pattern": ["amplificazione percettiva", "catastrofizzazione", "fusione con l'esperienza"],
  "craving_phase": ["picco"],
  "tone": ["osservativo", "lucido", "analitico", "destabilizzante"],
  "intensity": "alta",
  "human_intensity": 8,
  "cognitive_depth": "medium",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["pre_relapse", "stable"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "medium",
  "delivery_mode": ["standalone", "conversation_followup"],
  "response_energy": ["disruption", "slowing"],
  "silence_compatibility": true,
  "mental_effect": [
    "introduce distanza dall'esperienza",
    "rivela il meccanismo dell'amplificazione",
    "restituisce capacità di osservare",
    "indebolisce la presa del craving sulla percezione",
    "ridimensiona il momento",
    "trasforma il craving da verità a fenomeno osservabile"
  ]
}
```

### Esempio 3 — Craving Acuto separazione impulso-azione

```json
{
  "id": "craving_acuto_003",
  "text": "Sentire il desiderio non obbliga automaticamente a seguirlo.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["impulso automatico", "perdita di agency", "fusione impulso-azione"],
  "cognitive_pattern": ["automatismo", "deresponsabilizzazione", "fusione tra desiderio e comportamento"],
  "craving_phase": ["picco", "post-picco"],
  "tone": ["lucido", "contenitivo", "molto umano"],
  "intensity": "alta",
  "human_intensity": 8,
  "cognitive_depth": "low",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["pre_relapse", "stable"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_followup"],
  "response_energy": ["grounding", "opening"],
  "silence_compatibility": true,
  "mental_effect": [
    "separa impulso da azione",
    "restituisce senso di scelta",
    "rivela lo spazio tra stimolo e risposta",
    "riduce fusione con il craving",
    "ricorda che il desiderio è informazione, non comando"
  ]
}
```

### Esempio 4 — Craving Acuto contenitivo puro

```json
{
  "id": "craving_acuto_004",
  "text": "Questo momento è più intenso che pericoloso.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["panico cognitivo", "paura del craving", "sopraffazione"],
  "cognitive_pattern": ["catastrofizzazione", "confusione intensità-pericolo", "amplificazione minaccia"],
  "craving_phase": ["picco"],
  "tone": ["contenitivo", "lucido", "molto umano"],
  "intensity": "emergenza",
  "human_intensity": 9,
  "cognitive_depth": "low",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["pre_relapse", "stable"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_closer"],
  "response_energy": ["grounding", "containment"],
  "silence_compatibility": true,
  "mental_effect": [
    "ridefinisce la sensazione",
    "separa intensità da minaccia",
    "riduce paura del craving stesso",
    "abbassa allarme percepito",
    "rassicura senza minimizzare",
    "normalizza il momento di crisi"
  ]
}
```

### Esempio 5 — Post-Ricaduta anti-cascata

```json
{
  "id": "post_ricaduta_001",
  "text": "Il danno più grande non è la sigaretta. È la frase 'ormai tanto vale'.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["senso di fallimento", "vergogna", "auto-sabotaggio"],
  "cognitive_pattern": ["tutto-o-niente", "auto-narrativa di fallimento", "generalizzazione catastrofica"],
  "craving_phase": ["post-ricaduta"],
  "tone": ["lucido", "diretto", "contenitivo"],
  "intensity": "alta",
  "human_intensity": 9,
  "cognitive_depth": "low",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["active_relapse", "recovery"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_followup"],
  "response_energy": ["disruption", "grounding"],
  "silence_compatibility": true,
  "mental_effect": [
    "sposta l'attenzione dall'evento alla narrativa",
    "interrompe la spirale del 'tanto ormai'",
    "ridefinisce il problema reale",
    "previene cascata di ulteriori sigarette",
    "contiene vergogna senza assolverla"
  ]
}
```

### Esempio 6 — Post-Ricaduta anti-identità

```json
{
  "id": "post_ricaduta_002",
  "text": "La differenza enorme è tra 'ho fumato' e 'sono tornato a fumare'.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["senso di fallimento", "perdita di identità", "rassegnazione"],
  "cognitive_pattern": ["fusione episodio-identità", "generalizzazione", "auto-definizione tramite singolo evento"],
  "craving_phase": ["post-ricaduta"],
  "tone": ["lucido", "analitico", "contenitivo"],
  "intensity": "alta",
  "human_intensity": 9,
  "cognitive_depth": "medium",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["active_relapse", "recovery"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_followup"],
  "response_energy": ["disruption", "containment"],
  "silence_compatibility": true,
  "mental_effect": [
    "separa evento da identità",
    "distingue episodio singolo da ripresa abituale",
    "preserva il senso di percorso",
    "interrompe ridefinizione automatica come fumatore",
    "introduce distanza temporale tra ricaduta e decisione successiva"
  ]
}
```

### Esempio 7 — Post-Ricaduta redirect al presente

```json
{
  "id": "post_ricaduta_003",
  "text": "Questo momento conta più della sigaretta appena finita.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["confusione post-evento", "vulnerabilità", "negoziazione interna"],
  "cognitive_pattern": ["focus errato sull'evento passato", "perdita di agency presente"],
  "craving_phase": ["post-ricaduta"],
  "tone": ["lucido", "diretto", "molto umano"],
  "intensity": "alta",
  "human_intensity": 9,
  "cognitive_depth": "low",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["active_relapse", "recovery"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_closer"],
  "response_energy": ["grounding", "opening"],
  "silence_compatibility": true,
  "mental_effect": [
    "sposta focus dal passato al presente",
    "restituisce agency",
    "ridefinisce il punto critico come adesso, non come la sigaretta",
    "previene cascata",
    "trasforma momento di crisi in momento di scelta"
  ]
}
```

### Esempio 8 — Post-Ricaduta anti-vergogna

```json
{
  "id": "post_ricaduta_004",
  "text": "Hai avuto un momento. Non una sentenza definitiva.",
  "tier": "S",
  "level": "core_critical",
  "emotional_state": ["vergogna", "auto-condanna", "disperazione momentanea", "senso di permanenza del fallimento"],
  "cognitive_pattern": ["catastrofizzazione temporale", "permanenza dell'errore", "auto-giudizio assoluto"],
  "craving_phase": ["post-ricaduta"],
  "tone": ["contenitivo", "molto umano", "lucido"],
  "intensity": "alta",
  "human_intensity": 9,
  "cognitive_depth": "low",
  "trigger_context": ["qualunque"],
  "journey_stage": ["any"],
  "relapse_proximity": ["active_relapse", "recovery"],
  "processing_state": "crisis_compatible",
  "best_usage": ["SOS", "chat", "notifica"],
  "conversation_suitability": "high",
  "delivery_mode": ["standalone", "conversation_closer"],
  "response_energy": ["containment", "grounding"],
  "silence_compatibility": true,
  "mental_effect": [
    "contiene vergogna",
    "ridimensiona temporalmente l'evento",
    "separa evento da identità",
    "introduce prospettiva temporale",
    "neutralizza il pensiero 'è finita'",
    "preserva possibilità futura"
  ]
}
```

---

## Libreria completa — 115 frasi da taggare

### 1. MATTINO AL RISVEGLIO (6 frasi)

S-tier:
1. La sigaretta non rende la mattina più tua. La rende prevedibile.
2. Il cervello interpreta "mattina" come "sigaretta" prima ancora che tu scelga.
3. Non ti manca fumare. Ti manca completare una sequenza abituale.
4. L'automatismo arriva prima ancora del desiderio vero.

A-tier:
5. Quel bisogno immediato non è urgenza reale. È memoria automatica.
6. Il corpo si è appena svegliato. È il rituale che è già partito.

### 2. CAFFÈ (7 frasi)

S-tier:
1. Il piacere del caffè arriva prima della sigaretta. Solo che non lo noti più.
2. La sigaretta si è infilata nel rituale. Non ne fa parte davvero.
3. Il caffè non perde valore senza fumo. È il cervello che perde un'abitudine.
4. Non stai cercando più piacere. Stai evitando la sensazione di cambiamento.
5. Il primo sorso attiva più memoria che desiderio reale.

A-tier:
6. Quel "ci sta bene" è memoria ripetuta, non compatibilità reale.
7. La pausa esiste già. La sigaretta è stata aggiunta dopo.

### 3. DOPO PRANZO (6 frasi)

S-tier:
1. Il bisogno arriva spesso appena ti fermi. Non appena mangi.
2. Non è il pasto che chiama la sigaretta. È il silenzio subito dopo.
3. La pausa dopo pranzo è reale. La sigaretta è diventata solo la sua colonna sonora automatica.
4. La digestione non sta chiedendo nicotina. Il cervello sta completando una scena imparata.

A-tier:
5. Il craving dopo pranzo è spesso più legato alla pausa che al cibo.
6. Quel momento fermo dopo pranzo è diventato un segnale automatico per il cervello.

### 4. PAUSA LAVORO POMERIGGIO (7 frasi)

S-tier:
1. Non vuoi sempre una sigaretta. Vuoi uscire mentalmente dal lavoro per qualche minuto.
2. La pausa è un bisogno reale. La nicotina si è presa il merito.
3. Uscire dall'ufficio rilassa più della sigaretta che arriva dopo.
4. La pausa sigaretta sembra speciale perché interrompe il ritmo, non perché contiene tabacco.
5. Non ti stai premiando. Stai ripetendo una sequenza imparata.

A-tier:
6. Il cervello confonde stanchezza mentale e desiderio di fumare perché li vive insieme da anni.
7. Quel bisogno delle 16:00 spesso è esaurimento mentale travestito da craving.

### 5. DOPO CENA (8 frasi)

S-tier:
1. La sensazione di "finalmente" arriva prima della sigaretta.
2. Il cervello interpreta la fine della giornata come apertura del rituale serale.
3. La sigaretta dopo cena è spesso un segnale temporale travestito da piacere.
4. Non stai cercando gusto o relax. Stai cercando continuità con tutte le altre sere.
5. Quel "me la merito" è spesso il cervello che cerca autorizzazione a ripetere l'abitudine.
6. La nicotina si è trasformata nel simbolo della fine giornata, non nella causa del sollievo.

A-tier:
7. Il relax serale esiste già. La nicotina si è agganciata al momento.
8. Quel bisogno aumenta quando smetti di fare, non quando il corpo ha bisogno di nicotina.

### 6. SERA TARDI (7 frasi)

S-tier:
1. Il bisogno aumenta quando la casa si calma e i pensieri diventano più rumorosi.
2. La mente cerca continuità proprio quando il corpo vorrebbe solo rallentare.
3. Non stai cercando davvero nicotina. Stai cercando una transizione mentale verso il sonno.
4. Il cervello usa il silenzio serale per riaccendere abitudini molto vecchie.
5. La nicotina non prepara il sonno. Interrompe per pochi minuti il disagio che lei stessa mantiene.

A-tier:
6. Il craving serale sembra più profondo perché arriva quando resti solo con i tuoi pensieri.
7. La solitudine della sera amplifica il rituale più della nicotina.

### 7. STRESS / GIORNATA PESANTE (9 frasi)

S-tier:
1. Il cervello sta cercando un'interruzione, non una soluzione reale.
2. Non stai respirando meglio grazie alla sigaretta. Stai respirando più lentamente.
3. Il gesto rallenta il corpo. La nicotina non calma davvero il sistema nervoso.
4. La nicotina crea una tensione che poi sembra risolvere.
5. Il corpo non sta chiedendo tabacco. Sta chiedendo riduzione del sovraccarico mentale.
6. Quel bisogno improvviso è spesso stanchezza emotiva travestita da craving.
7. Il ciclo stress-sigaretta-stress continua proprio perché il cervello collega il sollievo alla nicotina invece che alla pausa stessa.

A-tier:
8. Lo stress reale non diminuisce. Cambia solo il focus mentale per pochi minuti.
9. La tensione cala per qualche minuto. La giornata resta identica.

### 8. NOIA / VUOTO MENTALE (7 frasi)

S-tier:
1. Quel "mi fuma" spesso significa solo "non so cosa fare adesso".
2. A volte non manca la sigaretta. Manca un cambio di stato.
3. Il cervello confonde assenza di stimolo con bisogno di fumare.
4. Il craving della noia è uno dei più vuoti. Ma anche uno dei più convincenti.
5. Non stai cercando davvero una sigaretta. Stai cercando qualcosa da interrompere.

A-tier:
6. La noia amplifica il craving perché il cervello vuole rumore immediato.
7. Quel bisogno improvviso spesso nasce nel momento esatto in cui smetti di essere occupato.

### 9. SOCIALITÀ / IN COMPAGNIA (8 frasi)

S-tier:
1. Il cervello teme l'esclusione più della mancanza di tabacco.
2. Uscire a fumare sembra connessione. Spesso è solo dipendenza sincronizzata.
3. Non ti manca sempre la sigaretta. Ti manca partecipare al rituale.
4. Il gruppo non sta creando il bisogno. Lo sta rendendo più visibile.
5. Il cervello interpreta "sigaretta sociale" come eccezione, anche quando mantiene il ciclo identico.
6. Non è la compagnia a richiedere il fumo. È l'abitudine che usa la compagnia come permesso.

A-tier:
7. Fumare in gruppo sembra più leggero solo perché il gesto è condiviso.
8. A volte il craving sociale è solo paura di restare fermo senza un gesto conosciuto.

### 10. GUIDA / AUTO (7 frasi)

S-tier:
1. Il cervello ha trasformato "entrare in auto" in un segnale automatico.
2. La macchina è uno dei luoghi dove l'abitudine si muove senza interruzioni esterne.
3. La nicotina si è infilata nei momenti di passaggio: partire, fermarsi, aspettare.
4. L'auto diventa uno spazio dove il cervello si aspetta meno controllo e più automatismi.
5. Quel gesto appena acceso il motore spesso parte prima ancora del pensiero cosciente.

A-tier:
6. Il craving in macchina aumenta quando il cervello percepisce tempo vuoto da riempire.
7. Il bisogno aumenta soprattutto nei tragitti automatici e ripetitivi.

### 11. POST-RICADUTA (9 frasi)

(I primi 4 sono già taggati come esempi sopra — vanno comunque inclusi nel JSON finale)

S-tier:
1. Il danno più grande non è la sigaretta. È la frase "ormai tanto vale".
2. La differenza enorme è tra "ho fumato" e "sono tornato a fumare".
3. La sigaretta è già successa. Il cervello ora sta negoziando le prossime.
4. Il senso di fallimento spinge più sigarette della nicotina stessa.
5. Hai avuto un momento. Non una sentenza definitiva.
6. Il rischio vero è smettere di osservare cosa sta succedendo adesso.
7. Questo momento conta più della sigaretta appena finita.

A-tier:
8. Il craving usa il senso di colpa per riaprire il ciclo più velocemente.
9. La mente cerca subito una narrativa totale: "allora continuo". Non è obbligatorio seguirla.

### 12. DOMENICA SERA (6 frasi)

S-tier:
1. Il craving della domenica sera è spesso più mentale che fisico.
2. L'ansia anticipatoria viene facilmente scambiata per bisogno di fumare.
3. La domenica sera non crea il craving. Lo rende più visibile.
4. Il bisogno di fumare cresce spesso insieme alla sensazione di pressione mentale.

A-tier:
5. Il cervello cerca conforto in qualcosa di familiare quando percepisce il ritorno della routine.
6. Quel bisogno improvviso nasce spesso nel momento in cui inizi a pensare a "domani".

### 13. GIORNI CHIAVE DEL PERCORSO (10 frasi)

Sotto-categoria: Giorno 7 (S-tier):
1. Il cervello inizia a trattare questi giorni come "prova superata". È lì che spesso riapre la trattativa.
2. Il craving cambia forma quando smette di sembrare emergenza.
3. Il cervello prova a trasformare il risultato ottenuto in permesso per abbassare attenzione.

Sotto-categoria: Giorno 14 (S-tier):
4. Alcuni trigger iniziano a perdere intensità proprio perché il cervello li vede meno inevitabili.
5. La mancanza fisica si abbassa. Le abitudini mentali restano più silenziose ma presenti.

Sotto-categoria: Giorno 21 (S-tier):
6. Il rischio ora non è il bisogno forte. È la falsa sensazione di neutralità.
7. "Una sola ormai non cambia niente" è spesso il tentativo più sofisticato del craving.
8. La sigaretta ora appare più come ricordo che come necessità. Ed è proprio lì che può sembrare innocua.

Sotto-categoria: Giorno 30 (S-tier):
9. Il cervello prova spesso a trasformare il traguardo in conclusione definitiva.
10. Non fumare da un mese e sentirsi "fuori dal problema" non sono sempre la stessa cosa.

### 14. CRAVING ACUTO (10 frasi)

(I primi 4 sono già taggati come esempi sopra — vanno comunque inclusi nel JSON finale)

S-tier:
1. Questo momento sembra enorme perché il cervello lo sta amplificando in tempo reale.
2. Non devi spegnere il craving. Devi lasciargli perdere forza da solo.
3. Sentire il desiderio non obbliga automaticamente a seguirlo.
4. La voce che dice "fumane una" non sta ragionando. Sta ripetendo uno schema.
5. Questo momento è più intenso che pericoloso.
6. Non serve decidere il resto della giornata adesso.
7. Il craving non è una direzione. È una richiesta automatica del cervello.
8. Questa sensazione non sta crescendo all'infinito. Sta già cambiando mentre la osservi.

A-tier:
9. Il craving convince sempre di essere l'ultima occasione possibile.
10. Questa ondata sembra compatta solo mentre ci sei dentro.

### 15. ANSIA DEL DOPO (8 frasi)

S-tier:
1. Non stai perdendo un'identità. Stai attraversando una transizione mentale.
2. Il cervello teme il cambiamento più di quanto il corpo tema l'assenza di nicotina.
3. La paura di non farcela spesso pesa più del craving reale.
4. "Sarà sempre così" è una delle distorsioni preferite del craving mentale.
5. Il cervello vuole garanzie assolute prima di lasciar andare un'abitudine vecchia.
6. La sensazione di mancanza futura cambia molto più velocemente di quanto il cervello immagini oggi.

A-tier:
7. La paura aumenta quando il cervello non riesce ancora a immaginarsi diverso.
8. Il futuro sembra vuoto soprattutto quando manca un rituale conosciuto.

---

## Totale: 115 frasi distribuite su 15 categorie

- Livello CORE CRITICAL (19 frasi): Craving Acuto (10) + Post-Ricaduta (9)
- Livello HIGH FREQUENCY (31 frasi): Stress (9) + Pausa Lavoro (7) + Dopo Cena (8) + Noia (7)
- Livello AMBIENT (65 frasi): tutte le altre categorie