# SigmaFlow — Archiviazione dei casi chiusi (design definitivo)

> Riferimento concettuale: `DESIGN_modello_caso_visita.md` (chiusura
> definitiva vs consegna, §3) e le tre sessioni diagnostiche su
> performance che hanno preceduto questo documento — in particolare la
> conclusione finale: **il numero di righe di `jobs`, non il peso di
> `activity_log_json`, spiega i tempi di lettura**. L'archiviazione
> nasce quindi per ridurre righe, non byte.

---

## 1. Verifica preliminare — nessun lavoro mancante, contrariamente a quanto pensavo

Prima di scrivere questo documento avevo scritto (per errore, senza
aver controllato tutto il codice recente) che `incarico_chiuso_ts` non
fosse mai esposto in UI. **Non è vero**: la spunta "Chiuso" in UI
(etichetta storicamente "Fatturato", rinominata) agisce sul campo
`invoiced` — ma il backend, in `updateJob` (Kanban.gs), valorizza o
svuota automaticamente `incarico_chiuso_ts` ad ogni cambio di stato
di quella spunta:

```javascript
if (newInvoiced !== coerceBoolean_(job.invoiced)) {
  job.incarico_chiuso_ts = newInvoiced ? nowIso_() : '';
}
```

Già implementato, già coerente con quanto serve a questo programma:
**nessuna UI nuova da costruire**. L'eleggibilità all'archiviazione
si basa su `incarico_chiuso_ts` valorizzato — che l'utente imposta
semplicemente spuntando "Chiuso", il controllo che già conosce e usa.

---

## 2. Due eventi indipendenti, non uno

- **Chiusura definitiva** (`incarico_chiuso_ts`, sul **caso**) — fatto
  contrattuale. Non sposta nessuna riga. Un caso chiuso può restare
  sulla board per un po' senza problemi.
- **Archiviazione** — azione **fisica**: sposta le righe fuori da
  `jobs`/`visite`. Solo l'archiviazione riduce il numero di righe,
  quindi solo l'archiviazione incide sulla performance.

Un'archiviazione senza chiusura definitiva non ha senso operativo — il
bottone "Archivia" è **eleggibile solo se `incarico_chiuso_ts` è
valorizzato**. Per tutto il resto (card senza una vera chiusura che
comunque deve lasciare la board) esiste un percorso separato, il
Cestino (§4.2) — non un'archiviazione impropria.

---

## 3. Schema (additivo)

### 3.1 — Fogli nuovi, archivio

- **`jobs_archivio`** — intestazione di `JOB_HEADERS` **più un campo
  nuovo**: `archiviato_ts` (quando è stata archiviata, sempre
  valorizzato). Contiene **solo chiusure vere** — i casi senza una
  conclusione reale non ci passano più (assorbiti dal Cestino, §4.2),
  quindi non serve distinguere un "motivo" sulla stessa tabella: se è
  in `jobs_archivio`, è una chiusura vera, punto.
- **`visite_archivio`** — stessa intestazione di `VISITE_HEADERS`,
  invariata.

Un caso archiviato porta con sé **tutte** le sue visite — altrimenti
`visite` continuerebbe a crescere comunque. Nessuna prova diretta che
la stessa relazione righe→latenza valga anche lì, ma nessun motivo per
aspettarsi il contrario: stessa causa, stesso rimedio.

### 3.2 — Fogli nuovi, cestino

- **`jobs_cestino`** — intestazione di `JOB_HEADERS` più
  `cestinato_ts` (quando è stata cestinata).
- **`visite_cestino`** — stessa intestazione di `VISITE_HEADERS`,
  invariata.

Foglio **separato** da `jobs_archivio` — non uno stato in più sulla
stessa tabella, uno spostamento fisico a parte. Nessuna metrica legge
mai il cestino, per definizione: non serve nessun filtro per
escluderlo (a differenza di quanto sarebbe servito se i casi "non
chiusi" fossero rimasti mescolati dentro l'archivio).

### 3.3 — `config`, nuova chiave

- `archiviazione_giorni_default` — numero di giorni dopo
  `incarico_chiuso_ts` oltre cui un caso diventa eleggibile
  all'archiviazione automatica. Default **30**, modificabile.

---

## 4. I tre percorsi in uscita da una card

### 4.1 — Archiviazione (solo chiusure vere)

- **Manuale** — il bottone `archive-button`, già presente in UI ma
  disabilitato/segnaposto, va abilitato **solo quando
  `incarico_chiuso_ts` è valorizzato** sul caso aperto nel modale.
- **Automatico** — trigger Apps Script a tempo (giornaliero), che
  scansiona i casi con `incarico_chiuso_ts` valorizzato e
  `oggi − incarico_chiuso_ts ≥ archiviazione_giorni_default`, e li
  archivia. **Infrastruttura nuova**: nessun trigger a tempo esiste
  oggi nel progetto — va creato esplicitamente (`ScriptApp.newTrigger`
  o configurazione manuale da editor), non è un effetto collaterale di
  altro codice.

### 4.2 — Cestino (tutto il resto: errori, ripensamenti, card senza una conclusione vera)

Un solo percorso per qualunque motivo per cui una card debba lasciare
la board senza essere considerata lavoro concluso — creata per errore,
perde di significato, o qualunque altra ragione. Sostituisce **sia**
la cancellazione diretta **sia** l'idea, scartata, di un'archiviazione
"con motivo": inutile distinguerli in anticipo, dato che il Cestino è
reversibile (§6b) — la stessa azione copre ogni caso.

`deleteJob` **cambia comportamento**: invece di eliminare la riga, la
sposta in `jobs_cestino`/`visite_cestino`. Stesso bottone in UI,
rinominato **"Sposta nel cestino"** (o "Cestina"), disponibile su
**qualunque** card, in qualunque colonna, **senza** richiedere
`incarico_chiuso_ts`.

- Conferma leggera (non quella pesante di una cancellazione vera, dato
  che è reversibile): *"La card verrà spostata nel Cestino. Potrai
  ripristinarla o eliminarla definitivamente in seguito."*
- `cestinato_ts = now` sulla riga copiata.
- Va a `jobs_cestino`/`visite_cestino`, **mai** a `jobs_archivio`.

### 4.3 — Svuotamento cestino (l'unico punto senza ritorno)

Vedi §6b. Azione separata, esplicita, con conferma pesante — è l'unico
momento di reale perdita di dati in tutto questo programma.

---

Tutti e tre i percorsi condividono la stessa funzione interna di
spostamento riga:

```
moveJobToSheet_(jobId, foglioJobs, foglioVisite, campiExtra)
```

parametrizzata sul foglio di destinazione e sui campi da valorizzare —
non tre implementazioni parallele. `archiveJob_(jobId)` e
`cestinaJob_(jobId)` sono due wrapper sottili sopra questa funzione;
`ripristinaJob_(jobId)` (§6b) ne è il simmetrico inverso (da cestino a
`jobs`/`visite`).

---

## 5. `getBoard()` non richiede modifiche

Un caso spostato altrove semplicemente non è più in `jobs` — sparisce
dalla board senza bisogno di nessun filtro aggiuntivo.

---

## 6. Vista di consultazione — "Archivio"

Nuova voce di navigazione (accanto a Board/Dashboard), **lista, non
board Kanban** — coerente con "consultata molto raramente".

Mostra, per ogni caso archiviato: anagrafica (titolo, cliente),
riepilogo cronologia (`arrival_ts`, `incarico_chiuso_ts`, numero totale
di visite, eventuali note libere/`description`). Letta direttamente da
`jobs_archivio`/`visite_archivio`, nessuna ricostruzione dal log
necessaria.

---

## 6b. Vista di consultazione — "Cestino", con ripristino

Stessa forma della vista Archivio, puntata su
`jobs_cestino`/`visite_cestino`. Tre azioni per riga/vista:

- **"Ripristina"** (singola riga) — rimette job + tutte le sue visite
  in `jobs`/`visite` (wrapper simmetrico di `moveJobToSheet_`, stesso
  meccanismo, direzione inversa). Se lo `status` conservato non
  corrisponde più a nessuna colonna esistente (`columns_json` potrebbe
  essere cambiato nel frattempo), ripristina nella prima colonna di
  ruolo `backlog` come fallback — stesso pattern difensivo già usato
  altrove nel progetto per stati non riconosciuti.
- **"Elimina definitivamente"** (singola riga) — questo, non lo
  spostamento in cestino, è un vero punto senza ritorno.
- **"Svuota cestino"** (azione di gruppo) — elimina definitivamente
  tutto il contenuto in un colpo solo.

Le due azioni di eliminazione richiedono una conferma esplicita più
marcata delle altre (sono l'unico momento di reale perdita di dati in
questo intero programma). "Ripristina" richiede solo una conferma
leggera, essendo un'azione che riporta la card a uno stato attivo, non
distruttiva.

---

## 7. "Duplica", solo dall'Archivio

Un caso archiviato non rientra mai attivo com'era — un nuovo incarico
è un nuovo caso, coerente con quanto già stabilito nel design del
modello caso/visita. Bottone "Duplica" nella vista Archivio: crea un
**nuovo** `job_id` in `jobs` (attivo), copiando titolo/cliente/tag/
assegnatario/ambasciatore/taglia come punto di partenza. **Non**
copia: `arrival_ts` (nuova data, oggi), `incarico_chiuso_ts` (vuoto),
`status` (riparte dalla colonna iniziale), nessuna visita, nessun log.
Caso nuovo a tutti gli effetti.

(Non applicabile al Cestino, che ha "Ripristina" invece — coerente:
un caso cestinato torna esattamente com'era, un caso archiviato
genera sempre qualcosa di nuovo.)

---

## 8. Metriche — regola di lettura, non caso per caso

Principio unico invece di decisioni sparse metrica per metrica:

- **Stato corrente** (lavoro presente, punti aperti, workload) — **mai**
  l'archivio né il cestino, per definizione: nessuno dei due è
  "presente".
- **Storico su una finestra temporale** (Flusso, "Andamento del
  carico", Rientri, Tempi, Capacità — Parte 1 di
  `dashboard-metrics.md` — e l'intero quadro di dettaglio Cap. 13-15,
  Parte 2) — **sempre** anche l'archivio, quando la finestra osservata
  può includere dati ormai archiviati. **Mai** il cestino, in nessun
  caso: contiene solo card senza una conclusione vera, non lavoro da
  contare in nessuna metrica.

**Decisione presa**: "Andamento del carico" (unico pannello storico
già nel giro *normale*, non a richiesta, della dashboard) legge sempre
anche l'archivio — accettato come costo aggiuntivo piccolo e isolato,
dato che la dashboard si carica saltuariamente, non ad ogni interazione
sulla board. **Nessun filtro aggiuntivo necessario** (a differenza di
una versione precedente di questo documento): con il Cestino che
assorbe tutti i casi senza una conclusione vera, `jobs_archivio`
contiene solo chiusure legittime — un'unione (`UNION`) diretta tra le
due tabelle, non un calcolo con eccezioni.

`jobs_archivio` conserva lo `status` che il caso aveva al momento
dell'archiviazione — le metriche basate su "card concluse in una
colonna `done`" funzionano quindi anche sui dati archiviati senza
logica speciale.

---

## 8b. Buco trovato: `incarico_chiuso_ts` non è correggibile

La spunta "Chiuso" imposta `incarico_chiuso_ts` come effetto
collaterale automatico (§1) — ma è un'istantanea "one-shot": non
modificabile dopo, non visibile in Cronologia. Nella pratica la
spunta viene premuta spesso **dopo** la chiusura reale (la decisione
di chiudere arriva prima del momento in cui qualcuno se ne ricorda e
lo segna) — quindi la data risulterebbe sistematicamente in ritardo
rispetto alla chiusura vera, ed è proprio questa data a guidare sia
l'eleggibilità all'archiviazione sia il conteggio dei giorni del
trigger automatico (§4.1).

**Non serve un meccanismo nuovo**: il sistema ha già un tipo di evento
"correzione" in Cronologia (vecchio valore/nuovo valore/motivo,
riusato oggi per `arrival_ts`) — va esteso a `incarico_chiuso_ts`,
non reinventato. La spunta "Chiuso" continua a impostare il default
automatico; la correzione manuale via Cronologia permette di
aggiustarlo dopo, con lo stesso livello di tracciabilità di qualunque
altra correzione nel sistema.

**Da verificare in ricognizione, non assumere**: il modulo "Correzione
timestamp" nel form di Cronologia sembra essere stato ridotto (oggi il
menu tipo-evento mostra solo "Spostamento"/"Nota") in una fase
successiva a quando fu descritto originariamente — va controllato cosa
esiste davvero prima di estenderlo, non riattivato alla cieca.

## 8c. Buco trovato: un caso riaperto resta eleggibile all'archiviazione

`incarico_chiuso_ts` si svuota oggi **solo** togliendo manualmente la
spunta "Chiuso" (§1, `updateJob`) — non succede automaticamente quando
il caso rientra davvero (il modello caso/visita permette rientri anche
da `done`, e quel percorso passa da `moveJob`, un punto di codice
completamente diverso da `updateJob`). Un caso chiuso e poi riaperto
resterebbe quindi eleggibile per l'archiviazione automatica in base a
una data ormai non più valida, rischiando di archiviare un caso
attivamente in lavorazione.

**Decisione presa**: `moveJob`, quando apre una nuova visita (rientro)
per un caso con `incarico_chiuso_ts` già valorizzato, deve svuotarlo
automaticamente — un caso tornato in lavorazione non è più "chiuso",
per definizione. Stesso principio già applicato altrove nel progetto
(campi che si autocorreggono in base a eventi reali, non lasciati
disallineati).

## 8d. Altri punti da verificare durante l'esecuzione, non bloccanti

- **Concorrenza**: se un caso viene archiviato/cestinato da un utente
  mentre un altro lo ha aperto nel modale, serve un errore chiaro
  ("questo caso è stato archiviato nel frattempo"), non un fallimento
  oscuro — verificare in N2.
- **Vista Archivio/Cestino**: valutare in N4 se riusare il modale card
  esistente in sola lettura (Cronologia completa già pronta) invece di
  costruire una vista nuova con solo un riepilogo aggregato.
- **Ricerca/filtro** nella vista Archivio, se il volume nel tempo lo
  rende necessario — non bloccante all'avvio, da rivalutare quando ci
  sono dati reali.
- **Quadro di dettaglio Cap. 13-15**: l'unione `jobs`+`jobs_archivio`
  (§8) va implementata singolarmente in ogni funzione di calcolo, non
  è un cambiamento automatico — verificare in N6 che nessuna resti
  esclusa.
- **Comunicazione al team**: il bottone "Elimina" cambia comportamento
  (cancella → sposta nel cestino) — stessa nota di comunicazione già
  prevista per altri cambi di comportamento in questo progetto.

---

## 9. Piano di esecuzione — sotto-fasi atomiche

| Sotto-fase | Contenuto | Gate |
|---|---|---|
| **N1** | Schema additivo (`jobs_archivio`, `visite_archivio`, `jobs_cestino`, `visite_cestino`, `archiviazione_giorni_default`); ricognizione + estensione della Cronologia per rendere `incarico_chiuso_ts` correggibile (§8b) | 🔴 Umano |
| **N2** | `moveJobToSheet_` core; `archiveJob_`/`cestinaJob_`/`ripristinaJob_` come wrapper; bottone "Archivia" collegato (eleggibilità su `incarico_chiuso_ts`); `deleteJob` riconvertita a "Sposta nel cestino"; svuotamento automatico di `incarico_chiuso_ts` su rientro reale (§8c); test | — |
| **N3** | Trigger automatico a tempo (solo archiviazione da chiusura — il cestino resta sempre manuale, nessuna scadenza automatica) | 🔴 Umano (verifica su TEST prima di lasciarlo scattare da solo) |
| **N4** | Vista "Archivio" + vista "Cestino" (lista sola lettura + Ripristina/Elimina definitivamente/Svuota cestino) | — |
| **N5** | "Duplica" (solo da Archivio) | — |
| **N6** | Metriche: `Andamento del carico` + quadro di dettaglio estesi a leggere anche l'archivio (unione diretta, nessun filtro); "lavoro presente"/punti aperti confermati invariati (solo `jobs`); cestino mai letto da nessuna metrica | — |

Gate esplicito dopo N1 (schema confermato prima di costruire sopra) e
dopo N3 (un trigger automatico che sposta dati da solo merita verifica
umana su TEST prima di essere lasciato scattare senza supervisione).

---

## 10. Criteri di accettazione

- [ ] `incarico_chiuso_ts` sincronizzato con la spunta "Chiuso" — già
      verificato esistente e corretto in `updateJob` (Kanban.gs)
- [ ] `incarico_chiuso_ts` correggibile via Cronologia (vecchio/nuovo
      valore + motivo, visibile in lista), stesso meccanismo già usato
      per `arrival_ts` — verificato in ricognizione lo stato reale del
      modulo "Correzione timestamp" prima di estenderlo
- [ ] `moveJob` svuota automaticamente `incarico_chiuso_ts` quando un
      caso già chiuso riceve un rientro reale (nuova visita aperta) —
      un caso tornato in lavorazione non resta eleggibile
      all'archiviazione automatica
- [ ] Bottone "Archivia" eleggibile solo con `incarico_chiuso_ts`
      valorizzato
- [ ] Bottone "Sposta nel cestino" (ex "Elimina") disponibile su
      qualunque card, qualunque colonna, senza richiedere
      `incarico_chiuso_ts`; conferma leggera, distinta da quella di
      eliminazione definitiva
- [ ] `moveJobToSheet_` sposta job + tutte le sue visite, sotto lock,
      idempotente, valorizza sempre i campi extra richiesti dal
      percorso (`archiviato_ts` o `cestinato_ts`)
- [ ] "Ripristina" riporta job + visite da Cestino a `jobs`/`visite`,
      con fallback a colonna `backlog` se lo status salvato non esiste
      più
- [ ] La cancellazione vera avviene solo con "Elimina definitivamente"
      o "Svuota cestino", mai automaticamente
- [ ] Cestino mai letto da nessuna metrica (nessun filtro necessario,
      foglio separato)
- [ ] Trigger automatico verificato su TEST prima di essere attivato
      senza supervisione — riguarda solo l'archiviazione, mai il
      cestino
- [ ] Vista Archivio e vista Cestino mostrano anagrafica + riepilogo
      cronologia, nessuna board Kanban
- [ ] "Duplica" (solo da Archivio) crea un caso nuovo, nessun dato
      storico riportato
- [ ] "Lavoro presente"/punti aperti invariati (mai archivio né
      cestino); "Andamento del carico" e quadro di dettaglio Cap.13-15
      verificati che includano l'archivio (unione diretta, senza
      filtri) quando pertinente

## Gate 🔴 UMANO

Come da tabella §9 — dopo N1 e dopo N3. Nessuna scrittura su PROD senza
gate separato, come da prassi consolidata in questo progetto.
