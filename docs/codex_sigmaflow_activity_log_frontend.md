# Claude Code — SigmaFlow: Activity Log — Prompt 2/2 (Frontend)

## Prerequisito obbligatorio

Questo prompt si esegue **solo dopo** che il Prompt 1 (backend) è stato
completato, i test passano tutti (≥ 34, failed: 0) e il deploy backend
è stato fatto con successo.

Verificare prima di procedere:
- `clasp pull` per avere i file aggiornati con il backend
- la Web App in modalità TEST risponde senza errori

---

## Contesto

Stai lavorando su **SigmaFlow**, sistema Kanban su Google Apps Script.
Questo prompt copre **solo il frontend**.

Il frontend è composto da template HTML inclusi da `index.html`:
- `board` — la board kanban con le card
- `dashboard` — le metriche (non toccare in questo task)
- `client` — JavaScript client (chiamate API, logica UI)
- `style` — CSS

File da leggere in ricognizione:
- `apps-script/board.html`
- `apps-script/client.html`
- `apps-script/style.html` (o equivalente)
- `apps-script/Constants.gs` — per le costanti `COLUMN_ROLES`, `DEFAULT_COLUMNS`

---

## Ricognizione obbligatoria prima di scrivere codice

1. Leggi `board.html`:
   - struttura del modal/panel della card (form di modifica)
   - dove si trovano i campi `description`, `checklist_json` (se presenti in UI)
   - come viene aperto il modal della card (evento click, funzione JS)

2. Leggi `client.html`:
   - funzione `api(action, params)` o equivalente per chiamate al backend
   - funzione di rendering della card e del modal
   - come vengono gestiti i messaggi di errore e conferma esistenti
   - se esiste già una funzione `renderChecklist` o simile

3. Leggi `style.html`:
   - variabili CSS esistenti (colori, font, border-radius, spacing)
   - classi esistenti per modal, badge, form elements

**Non scrivere codice prima di completare la ricognizione.
Mostrami l'output e attendi conferma.**

---

## Obiettivo

Modificare il modal della card per:
1. Rimuovere la sezione checklist separata dall'UI (il campo `checklist_json`
   resta nel foglio ma non è più esposto nell'interfaccia)
2. Aggiungere la sezione **Cronologia** con lista eventi e form di inserimento
3. Gestire tutti i warning bloccanti con dialog di conferma
4. Mantenere il campo **Note** invariato (testo libero)

---

## Modifica 1 — Rimozione checklist dall'UI

Rimuovere da `board.html` qualsiasi sezione, campo, pulsante o logica
relativa a `checklist_json`.

Rimuovere da `client.html` qualsiasi funzione che renderizza o aggiorna
la checklist.

**Non rimuovere** il campo `checklist_json` dalle chiamate `updateJob`
se è già incluso — lasciarlo semplicemente inutilizzato lato UI.
I dati nel foglio restano intatti.

---

## Modifica 2 — Struttura del modal card

Il modal della card deve avere questa struttura a due pannelli:

```
[ Informazioni card ]  [ Cronologia ]
```

Su mobile: due tab sovrapposti con navigazione tab.
Su desktop: due colonne affiancate se lo spazio lo consente,
altrimenti tab (verificare con la logica responsive già in uso nel progetto).

Il pannello **Informazioni card** mantiene tutti i campi esistenti:
titolo, cliente, descrizione (Note), assegnatario, taglia, priorità,
scadenza, fatturato, colore card.

Il pannello **Cronologia** è nuovo — descritto nelle modifiche successive.

---

## Modifica 3 — Pannello Cronologia

### Lista eventi

Ogni evento è visualizzato come una riga con:

- **Timestamp** — formato `gg/mm/aaaa HH:MM`
- **Badge tipo** — `SPOSTAMENTO` / `NOTA` / `CORREZIONE`
  con colori distinti (usare le variabili CSS esistenti del progetto)
- **Badge source** — `AUTO` (sfondo neutro) / `MANUALE` (sfondo diverso)
  visibile solo agli utenti avanzati — mostrarlo sempre per ora
- **Contenuto** — per `move`: "→ [nome colonna]" con indicazione del `from`
  se disponibile: "da [from] → [to]"; per `note`: testo della nota;
  per `correction`: "[campo]: [old] → [new] — [reason]"
- **Azioni** — solo per eventi `source: manual`:
  icona matita (modifica) e icona cestino (elimina), inline a destra

Se il log è vuoto: mostrare messaggio "Nessun evento registrato.
Gli spostamenti futuri verranno registrati automaticamente."

### Pulsante "Aggiungi evento"

Sotto la lista, pulsante secondario (non primario — non deve competere
con "Salva" della card).

Apre un mini-form inline (non un nuovo modal) con:

1. **Data e ora** — input datetime-local, precompilato con adesso,
   modificabile liberamente. Validazione: non accettare date future
   (disabilitare il pulsante Salva evento se la data è futura,
   con messaggio inline).

2. **Tipo evento** — select con tre opzioni:
   - `Spostamento` (default)
   - `Nota`
   - `Correzione timestamp`

3. **Se tipo = Spostamento:**
   - Select "Verso colonna" con tutte le colonne configurate del progetto
     (popolate da `getBoard` già disponibile nel client)
   - Campo testo "Nota opzionale" (placeholder: "Aggiungi una nota...")

4. **Se tipo = Nota:**
   - Campo testo multiriga "Testo" (obbligatorio)

5. **Se tipo = Correzione timestamp:**
   - Select "Campo da correggere":
     `Data creazione (arrival_ts)` / `Data inizio (start_ts)` /
     `Data completamento (done_ts)`
   - Input datetime-local "Nuovo valore" (obbligatorio)
   - Campo testo "Motivo" (obbligatorio, placeholder: "Motivo della correzione")
   - Il vecchio valore viene letto dal job corrente e passato automaticamente
     come `old` — non lo inserisce l'utente

6. **Pulsanti:** "Salva evento" (primario) e "Annulla" (secondario)

---

## Modifica 4 — Flusso di salvataggio evento con warning

Il flusso per "Salva evento" è in tre fasi:

### Fase 1 — Chiamata iniziale
```javascript
api('addActivityEvent', {
  job_id: jobId,
  type: tipo,
  ts: timestamp,
  to: colonnaSelezionata,   // solo per move
  note: testo,
  // ... altri campi per correction
  force: false
})
```

### Fase 2 — Gestione risposta

**Successo** (`ok: true`) → ricaricare il log, chiudere il form, nessun dialog.

**Hard error** (`hardErrors` presenti) → mostrare errore inline nel form,
non chiudere. L'utente deve correggere i dati.
Esempio: "La data non può essere nel futuro."

**Warning di sequenza** (`requiresForce: true`) → mostrare dialog di conferma:

```
┌─────────────────────────────────────────────┐
│  ⚠️  Attenzione — la cronologia cambia       │
│                                             │
│  Inserendo questo evento:                   │
│  • L'evento del 22/07 risulterà provenire   │
│    da "ATTESA ENTI" invece che da "WIP"     │
│  • Due soggiorni consecutivi in "WIP"       │
│    (probabile evento mancante tra i due)    │
│                                             │
│  Vuoi procedere comunque?                   │
│                                             │
│  [Annulla]           [Sì, inserisci uguale] │
└─────────────────────────────────────────────┘
```

Se l'utente conferma → richiamare con `force: true`.

**Warning di allineamento** (`alignmentRequired: true`) →
mostrare dialog di allineamento (può arrivare dopo o insieme a `requiresForce`):

```
┌─────────────────────────────────────────────┐
│  📅  Allinea i campi strutturati             │
│                                             │
│  Questo evento impatta campi di misura:     │
│                                             │
│  Data inizio lavorazione (start_ts)         │
│  Attuale: 24/07/2026 09:21                  │
│  Suggerito: 20/07/2026 10:00                │
│  ◉ Aggiorna  ○ Mantieni attuale             │
│                                             │
│  [Annulla tutto]              [Conferma]    │
└─────────────────────────────────────────────┘
```

Se l'utente sceglie "Aggiorna" → aggiungere `align_fields` alla chiamata.
Se l'utente sceglie "Mantieni" → chiamare senza `align_fields` per quel campo.
"Annulla tutto" → nessuna chiamata, chiudere il dialog.

### Fase 3 — Chiamata finale (se necessario)
```javascript
api('addActivityEvent', {
  // stessi params di prima
  force: true,                        // se c'era requiresForce
  align_fields: { start_ts: '...' }   // se l'utente ha scelto di allineare
})
```

---

## Modifica 5 — Modifica evento manuale

Il click sull'icona matita di un evento `manual` apre lo stesso mini-form
usato per l'inserimento, precompilato con i valori dell'evento.

Stessa logica di validazione e dialog della Modifica 4,
ma chiama `updateActivityEvent` invece di `addActivityEvent`.

---

## Modifica 6 — Eliminazione evento manuale

Il click sull'icona cestino di un evento `manual` mostra un dialog minimale:

```
Eliminare questo evento dalla cronologia?
L'operazione non può essere annullata.
[Annulla]  [Elimina]
```

Se confermato → chiama `deleteActivityEvent`. Ricaricare il log dopo.

Se la risposta contiene warning informativi (incoerenza con campi strutturati
dopo la cancellazione) → mostrarli come banner informativo nel pannello
Cronologia, non come blocco.

---

## Caricamento dati Cronologia

La Cronologia viene caricata **separatamente** rispetto ai dati della card,
solo quando il pannello Cronologia è attivo (lazy loading).

Chiamata: `api('getActivityLog', { job_id: jobId })`

Mostrare uno stato di caricamento ("Caricamento cronologia...") mentre attende.
In caso di errore: "Impossibile caricare la cronologia. Riprovare."

---

## Smoke test UI (da eseguire manualmente su ambiente TEST)

1. Aprire una card esistente — verificare che la sezione checklist
   non sia più visibile.
2. Aprire il pannello Cronologia — verificare il messaggio "Nessun evento"
   se il log è vuoto, oppure la lista eventi se ci sono eventi migrati.
3. Aggiungere un evento `Spostamento` con data valida → verificare che
   appaia nel log con badge `MANUALE`.
4. Tentare di aggiungere un evento con data futura → verificare blocco inline.
5. Aggiungere un evento che causa warning di sequenza → verificare il dialog
   con descrizione chiara del cambiamento.
6. Confermare il dialog → verificare che l'evento sia salvato.
7. Aggiungere un evento che impatta `start_ts` → verificare il dialog
   di allineamento con i valori corretti.
8. Scegliere "Aggiorna" nel dialog → verificare che `start_ts` sia aggiornato
   nel foglio TEST.
9. Modificare un evento manuale → verificare che i valori siano precompilati.
10. Eliminare un evento manuale → verificare che scompaia dal log.
11. Tentare modifica/eliminazione di un evento `AUTO` → verificare che
    le icone non siano presenti (o siano disabilitate).
12. Eseguire `moveJob` trascinando una card → aprire la Cronologia e
    verificare che l'evento `AUTO` sia apparso con timestamp corretto.

---

## Sequenza di esecuzione

1. Ricognizione — mostrami output e attendi conferma
2. Verificare che il branch `codex/activity-log-backend` sia presente
   e fare `git checkout -b codex/activity-log-frontend`
3. Implementare Modifica 1 (rimozione checklist UI)
4. Implementare Modifica 2 (struttura modal a due pannelli)
5. Implementare Modifica 3 (pannello Cronologia — lista + form)
6. Implementare Modifica 4 (flusso salvataggio con warning)
7. Implementare Modifica 5 (modifica evento manuale)
8. Implementare Modifica 6 (eliminazione evento manuale)
9. `clasp push`
10. Eseguire smoke test UI su ambiente TEST (tutti i 12 punti)
11. Eseguire `runAllTestsAndLog` → verificare che i test backend
    passino ancora tutti (≥ 34, failed: 0)
12. Se tutto passa:
    `clasp deploy --description "activity-log-frontend"`
13. `git add -A`
14. `git commit -m "feat(ui): pannello Cronologia card + rimozione checklist UI"`
15. `git push origin codex/activity-log-frontend`

**Non fare merge su `main`.**
**Non eseguire `migrateToActivityLog()` su PROD** — attendere
verifica umana di entrambi i branch e decisione esplicita di Marco.

---

## Vincoli

- Commenti in italiano, variabili in inglese
- Nessuna modifica a `dashboard.html` o `Model.gs`
- Nessun uso di `localStorage` o `sessionStorage` (già vietato dal progetto)
- I dialog di conferma devono essere HTML custom (non `window.confirm`)
  per coerenza con lo stile esistente del progetto
- Il lazy loading della Cronologia non deve bloccare l'apertura del modal
- Usare le variabili CSS e le classi esistenti — non introdurre nuovi
  sistemi di design
- Su mobile il pannello Cronologia deve essere completamente utilizzabile
  (form di inserimento incluso)
- Il pulsante "Salva" della card (dati principali) e il pulsante
  "Salva evento" della Cronologia sono operazioni completamente separate —
  non interferire tra i due flussi
