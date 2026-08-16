# SigmaFlow — Modello caso/visita (design definitivo)

> **Stato al momento di scrivere**: Fase J (deploy programma
> `activity_log_json`) e Fase K (ruolo `prep` per TO DO, gate
> `incarico_ts`/`prep_ts`/`start_ts` distinti) **entrambe chiuse**.
> Il bug di derivazione dei gate che ha portato a questo documento
> (`BUGFIX_derivazione_gate_dal_log.md`) è emerso proprio durante la
> chiusura della Fase K, ed è stata l'occasione per rivedere il metodo
> di fondo invece di applicare una toppa locale — da qui il modello
> caso/visita. Questo documento descrive quindi il **prossimo
> programma** da avviare (non ancora numerato/collocato in
> `PROGRAMMA_ACTIVITY_LOG.md`), non una correzione della Fase K.
>
> Sostituisce l'approccio precedente (`BUGFIX_derivazione_gate_dal_log.md`,
> segmentazione a runtime su riga singola). Quel documento resta valido
> solo come riferimento per la migrazione storica dei dati esistenti
> (§7). Riferimento concettuale: dispensa FSC, Cap. 1 (terminologia),
> Cap. 6-7 (rework e ritardi), Cap. 11 (modello operativo minimo).

---

## 1. Terminologia (Cap. 1 della dispensa, fissata)

- **Caso** — l'entità persistente, *"che può rientrare più volte"*.
  Nello schema resta `jobs`/`job_id`, invariato: nessuna nuova riga,
  nessun nuovo id, board/drag-and-drop/dashboard non toccati.
- **Visita** — *"ciascun passaggio del caso nel ciclo tecnico, cioè la
  vera unità che 'fa coda'"*. Tabella nuova (oggi `cases`, da
  ridefinire).

**Nota di fedeltà al modello**: il Cap. 11 fa terminare l'iterazione
solo a "Consegnato" (le attese sono sotto-fasi interne a un'unica
iterazione). La regola adottata qui — chiusura/riapertura ad ogni
rientro da attesa, anche prima di una consegna — è un'estensione
deliberata rispetto al minimo dichiarato dalla dispensa, motivata dal
fatto che le colonne di attesa di Sigma+ stanno strutturalmente prima
di "DA INVIARE/FATTURARE". Il Cap. 11 offre anche esplicitamente questa
alternativa più granulare ("B. Un record per iterazione collegato
all'iniziativa"), scartata dal modello minimo solo perché normalmente
richiede inserimenti manuali — qui è automatica, quindi il costo che ne
sconsigliava l'uso non si applica.

---

## 2. Regola di apertura/chiusura visita (unica, senza eccezioni)

> **Chiusura visita N + apertura visita N+1** = qualunque spostamento
> con provenienza di ruolo `stand_by` **o** `done`, e destinazione di
> ruolo `backlog` **o** `prep`.

Non esistono casi ambigui: il rientro diretto in WIP da un'attesa è già
vietato dal guardia esistente, quindi ogni riattivazione del lavoro
passa per forza da questo evento.

Uno spostamento tra due colonne di attesa diverse (es. ATTESA CLIENTE →
ATTESA ENTI), o l'ingresso in `done`, **non** apre né chiude nessuna
visita — la visita resta aperta, si aggiornano solo gli accumulatori
per tipo (§4).

---

## 3. Chiusura definitiva ≠ consegna

Due concetti indipendenti, non uno:

- **`consegna_ts`** (sulla **visita**) — si valorizza al primo ingresso
  in una colonna di ruolo `done`. Non chiude la visita da sola: la
  card può ancora rientrare.
- **`incarico_chiuso_ts`** (sul **caso**, non sulla visita) — manuale,
  indipendente da qualunque movimento sulla board. Rappresenta il
  momento in cui il lavoro è chiuso nei termini contrattuali (spesso
  ma non sempre coincide con la fatturazione). Un nuovo incarico dopo
  la chiusura è un nuovo caso, non un rientro — fuori scope di questo
  meccanismo per definizione.

**Comportamento**: un tentativo di spostare verso lavoro attivo un caso
con `incarico_chiuso_ts` già valorizzato genera un avviso esplicito
("questo incarico risulta chiuso il [data]: sei sicuro di non voler
creare un nuovo caso?"), non un blocco automatico.

---

## 4. Attese per tipo, accumulate per visita

Campi sulla visita aperta: `t_cliente_d`, `t_ente_d`, `t_interno_d`.

Si incrementano ad ogni **uscita** da una colonna di ruolo `stand_by`
(qualunque sia la destinazione — un'altra attesa, backlog/prep, o
done), sommando la durata della permanenza appena conclusa in quella
colonna specifica. Il timestamp di ingresso in quella colonna si
recupera dal log riusando la stessa ricerca all'indietro già
implementata in `computeFrom_` (ActivityLog.gs) — nessuna struttura
dati nuova.

---

## 5. Tempo di servizio della visita

`consegna_ts − start_ts` (o `chiusura_ts − start_ts` se la visita si
chiude su un rientro senza mai raggiungere `done`). Nessun accumulatore
aggiuntivo per il tempo in WIP: la sequenza di stati che una visita può
attraversare è vincolata dal guardia esistente in modo tale che questo
calcolo diretto sia sempre corretto.

---

## 6. Schema

### 6.1 — `visite` (rinomina di `cases`, ridefinita)

| Campo | Tipo | Note |
|---|---|---|
| `job_id` | rif. a `jobs` | il caso a cui appartiene |
| `numero_visita` | intero | 1, 2, 3... |
| `apertura_ts` | timestamp | creazione caso (visita 1) o evento di rientro |
| `incarico_ts` | timestamp | primo ingresso in ruolo `backlog`, entro questa visita |
| `prep_ts` | timestamp | primo ingresso in ruolo `prep`, entro questa visita |
| `start_ts` | timestamp | primo ingresso in ruolo `wip`, entro questa visita |
| `consegna_ts` | timestamp | primo ingresso in ruolo `done`, entro questa visita (non chiude) |
| `chiusura_ts` | timestamp | valorizzato solo se/quando si apre la visita successiva |
| `chiusura_tipo` | testo | colonna di provenienza dell'evento che ha aperto la visita successiva |
| `t_cliente_d` | numero | giorni cumulati, §4 |
| `t_ente_d` | numero | giorni cumulati, §4 |
| `t_interno_d` | numero | giorni cumulati, §4 |
| `rework_cause` | testo | = `chiusura_tipo` della visita precedente (ridondanza voluta per query dirette) |

### 6.2 — `JOB_HEADERS` — campi rimossi (spostati su `visite`)

`incarico_ts`, `prep_ts`, `start_ts`, `done_ts`, `service_time_d`,
`lead_time_d`, `wait_time_d`, `is_rework`, `rework_cause`,
`visit_number` (diventa `MAX(numero_visita)` su `visite` filtrate per
`job_id`).

### 6.3 — `JOB_HEADERS` — campi che restano (nessuna duplicazione)

`job_id`, `title`, `client`, `status` (stato live del caso — resta qui,
non è proprietà della visita), `arrival_ts` (nascita del caso, coincide
sempre con `apertura_ts` della visita 1 — unica ridondanza tollerata,
per accesso rapido in UI senza query aggiuntiva), `incarico_chiuso_ts`
(nuovo), `activity_log_json` (invariato — registro granulare, fonte
per Cronologia e per la migrazione storica, §7).

`getBoard()` non cambia: legge `jobs` esattamente come oggi.

---

## 7. Migrazione dati storici (unico uso residuo della segmentazione via log)

I casi già esistenti in TEST/PROD non hanno mai avuto righe `visite`.
La funzione di segmentazione dal log progettata nel documento
precedente (`computeVisiteFromLog_`) si riusa qui, ma con ruolo diverso:
non più "derivazione a runtime ad ogni lettura", ma **materializzazione
una tantum** — si esegue una sola volta per ogni caso esistente,
scorrendo `activity_log_json` con la regola del §2, e scrive le righe
`visite` corrispondenti. Da eseguire solo su TEST, mai su PROD senza
gate umano esplicito (stesso pattern già seguito per le migrazioni
precedenti).

---

## 8. Copertura delle metriche FSC (verificata)

| Metrica | Fonte | Copertura |
|---|---|---|
| $L_{WIP}(t)$ | `jobs.status` corrente, ruolo `wip` | invariata |
| $T_{ciclo}$ | `consegna_ts − start_ts` per visita (§5) | ok |
| $T_{cliente}$, $T_{ente}$, $T_{interno}$ | accumulatori per visita, sommabili su finestra | ok |
| $c(t)$ | conteggio `consegna_ts` per finestra | ok |
| $p_1$, $r$, $\mathbb{E}[K]$ | due letture possibili: rientro dopo `consegna_ts` (Cap. 6 stretto) o qualunque riapertura (Cap. 11 esteso, adottato) | ok, entrambe disponibili |
| $\mathbb{E}[S_0]$, $\mathbb{E}[S_1]$ | `GROUP BY (numero_visita = 1 vs > 1)` su tempo di servizio | ok |
| $B_{lat}(t)$ | visite con `consegna_ts` in $[t-H,t]$, ultima visita del caso, `incarico_chiuso_ts` nullo | ok — prima non implementabile, ora diretta |
| Board/dashboard/drag-and-drop | `jobs` invariata | nessun impatto |

---

## 9. Modello di raccolta dati definitivo — pochi campi, tutto il resto calcolabile

> Verificato con una simulazione manuale di 100 casi (70% con ≥1
> rientro, 50% con ≥2, 20% con ≥3): tutte le grandezze dei Cap. 3-15
> risultano calcolabili dai soli campi elencati sotto, senza doverne
> aggiungere altri. Principio guida: **si raccoglie solo ciò che non è
> derivabile da altro** — tutto ciò che è una semplice funzione di campi
> già presenti resta un calcolo, mai un campo salvato.

### 9.1 — Campi da misurare, tabella `jobs` (il caso)

| Campo | Natura |
|---|---|
| `job_id` | identità persistente |
| `title`, `client` | anagrafica |
| `status` | colonna corrente (stato live) |
| `arrival_ts` | nascita del caso — unica ridondanza dichiarata con `apertura_ts` della visita 1, per accesso diretto in UI |
| `incarico_chiuso_ts` | chiusura definitiva, manuale — indipendente dalla board |
| `activity_log_json` | registro granulare — fonte per Cronologia e per ricostruire tutto il resto |

### 9.2 — Campi da misurare, tabella `visite` (il ciclo)

| Campo | Natura |
|---|---|
| `job_id`, `numero_visita` | identità della visita |
| `apertura_ts` | evento osservato |
| `incarico_ts`, `prep_ts`, `start_ts` | eventi osservati (gate) |
| `consegna_ts` | evento osservato |
| `chiusura_ts`, `chiusura_tipo` | evento osservato — stesso istante di `apertura_ts` della visita successiva: ridondanza dichiarata e sicura (scritta una sola volta, dallo stesso evento, non può disallinearsi — diversa dalle duplicazioni eliminate in questo documento, che rischiavano di essere scritte due volte in momenti diversi) |
| `t_cliente_d`, `t_ente_d`, `t_interno_d` | accumulatori — richiedono somma sul log, non triviali da un solo campo, quindi mantenuti come cache scritta all'evento |
| `rework_cause` | ridondanza dichiarata con `chiusura_tipo` della visita precedente, per query dirette senza join |

**Rimosso rispetto alle versioni precedenti di questo documento**:
`tempo_servizio_d` — è una sottrazione banale (`consegna_ts − start_ts`,
o `chiusura_ts − start_ts`) tra due campi già presenti sulla stessa riga.
Calcolarlo al volo dove serve costa nulla; salvarlo come campo
introdurrebbe esattamente il rischio di disallineamento che il resto di
questo documento elimina altrove.

---

## 10. Metriche di governo — poche, sempre visibili (Cap. 11-15)

Set minimo per la gestione corrente, non il quadro teorico completo:

| Metrica | Fonte | Cosa dice |
|---|---|---|
| $L_{WIP}(t)$ | conteggio live su `jobs.status` | carico attuale |
| $c(t)$ | conteggio `consegna_ts` per finestra | produttività |
| $p_1$, $r$ (lettura estesa, Cap. 11) | frazione visite riaperte / rientri medi | intensità del rework |
| $T_{cliente}$, $T_{ente}$, $T_{interno}$ | somma `t_*_d` per finestra | dove si blocca il lavoro |
| $B_{lat}(t)$ | consegne recenti non ancora chiuse definitivamente | esposizione futura a rientri |
| $\alpha$, kernel $k[m]$ (Cap. 13) | frazione consegne riaperte + distribuzione del ritardo | quanto e quando rientra il lavoro |
| Margine di stabilità (Cap. 15) | $\text{spr}(A)$ o, in forma semplice, $\rho$ rispetto a 1 | quanto siamo lontani dal punto di rottura |

Non fanno parte del cruscotto corrente ma restano calcolabili su
richiesta dagli stessi dati, come quadro di dettaglio: $\lambda$, $\mu$,
$\rho$, $L$, $L_q$, $W$, $W_q$ puntuali (Cap. 3-4); $C_v^2$ e la
correzione di Pollaczek-Khinchine (Cap. 5); $\mathbb{E}[S_0]$,
$\mathbb{E}[S_1]$, $\mathbb{E}[K]$ (Cap. 6); scomposizione di $W_q$ in
attesa-incarico/preparazione; conteggio dei rientri per causa; matrice
linearizzata $A$ e autovalori con intervalli di incertezza (Cap. 14-15).
Nessuno di questi richiede campi aggiuntivi rispetto a §9 — sono tutti
letture diverse degli stessi dati, non un sistema parallelo.

**Presentazione (opzionale, non un requisito)**: "mai salvato" riguarda
i dati (nessun campo nuovo in schema) — non esclude che in dashboard
compaia comunque, ad esempio in un riquadro collassabile separato dal
cruscotto principale, calcolato al momento dell'apertura del riquadro
invece che ad ogni caricamento. Da valutare in fase di implementazione
frontend, non vincolante per il modello dati.

---

## 11. Fase L — piano di esecuzione (sotto-fasi atomiche)

> **Audit obbligatorio prima di L1**: i riferimenti a file/righe usati
> nel resto di questo documento (es. `Kanban.gs:225,229`) risalgono a
> una lettura **precedente alla chiusura della Fase K** — il codice è
> quasi certamente cambiato (la Fase K ha toccato esattamente
> `Kanban.gs`, `Schema.gs`, `ActivityLog.gs`, `Model.gs`, `Constants.gs`).
> Questo documento va letto come **specifica del comportamento
> desiderato**, non come patch con numeri di riga esatti. Ogni sotto-fase
> inizia con una ricognizione mirata sullo stato attuale, non con
> l'applicazione cieca dei riferimenti sopra.

Riga da aggiungere alla tabella "Schema fasi" di `PROGRAMMA_ACTIVITY_LOG.md`:

```
| L    | Modello caso/visita — ricostruzione backend gate/rework  | 🔴 Umano |
```

Con Fase J e Fase K entrambe chiuse, la Fase L può iniziare. Dato il
peso della modifica (rimozione campi da schema, riscrittura di
`moveJob`, migrazione dati storici), si esegue in sotto-fasi separate,
**una sessione Claude Code per sotto-fase**, non un'unica sessione:

### L1 — Ricognizione + schema (additivo)

Ricognizione mirata su `Constants.gs`, `Schema.gs`, `Kanban.gs`,
`ActivityLog.gs`, `Model.gs` nello stato attuale (post-Fase K).
Confermare esplicitamente prima di procedere:
- nomi e ruoli colonna attuali (`COLUMN_ROLES`, `DEFAULT_COLUMNS`);
- contenuto esatto di `JOB_HEADERS` e `CASE_HEADERS` oggi;
- posizione e forma attuale del guardia anti-reingresso-in-WIP e del
  ramo di marcatura rework in `moveJob`;
- se `markRework` è ancora presente e scollegata dal frontend;
- **se `refreshCaseVisitCount_` è ancora attiva** (verificato in
  ricognizione L1 reale: sì, gira ad ogni `moveJob`/`addJob`, a
  differenza di `markRework` che è dormiente) — punto decisivo per lo
  step successivo.

**Correzione rispetto alla stesura originale di questa sezione**: dato
che `refreshCaseVisitCount_` scrive attivamente su `cases` ad ogni
spostamento, **non ridefinire `CASE_HEADERS` sul foglio `cases`
esistente** — cambiarne l'intestazione mentre quella funzione continua
a scriverci sopra romperebbe ogni spostamento sulla board subito dopo
L1. Creare invece un **foglio nuovo e separato**, `visite`
(`SIGMAFLOW.SHEETS.VISITE = 'visite'` in `Constants.gs`,
`VISITE_HEADERS` in `Schema.gs` secondo §9.2, registrato con
`ensureSheet_` in `setupSigmaFlow` come già fatto per
`jobs`/`cases`/`config`). Il foglio `cases` e
`refreshCaseVisitCount_`/`markRework` restano **completamente
invariati e funzionanti**, ignorati ma non rotti. La loro dismissione
è un passo di pulizia separato, da fare quando `visite` sarà comprovata
e nulla leggerà più `cases` (non prima di L5).

Poi, solo additivo: bump `SCHEMA_VERSION`; creazione del foglio `visite`
come sopra; aggiunta di `incarico_chiuso_ts` a `JOB_HEADERS`. **Non
rimuovere ancora nulla da `JOB_HEADERS`** in questa sotto-fase — la
rimozione (§9.1, campi che restano) avviene solo in L5, dopo che L2-L4
hanno dimostrato che la lettura da `visite` funziona, per non trovarsi
senza dati strutturati validi durante lo sviluppo delle sotto-fasi
intermedie.

### L2 — `moveJob`: regola di apertura/chiusura visita

Implementare la regola §2 (chiusura N + apertura N+1 su provenienza
`stand_by`/`done` verso `backlog`/`prep`), il guardia esteso a `done`
(§9, nota su Kanban.gs), gli accumulatori per tipo di attesa (§4), e
`consegna_ts` (si valorizza, non chiude). Scrive su `visite`, **in
aggiunta** alla mutazione in-place esistente su `jobs` (non ancora
rimossa — L1 l'ha lasciata per compatibilità temporanea). Test dedicati
per ogni caso del §12 di `BUGFIX_derivazione_gate_dal_log.md` (`wip→wip`
non deve aprire nulla; ciclo completo attesa→rientro deve aprire una
nuova visita; rientro da `done` deve essere trattato come rientro da
`stand_by`).

### L3 — `ActivityLog.gs`: allineamento su visita aperta

Adattare `checkStructuralAlignment_`/migrazione per scrivere sulla
visita aperta corrente. Verificare che il dialog "Allinea i campi
strutturati" (frontend, Fase I) continui a funzionare leggendo dalla
fonte corretta.

### L4 — `Model.gs`: metriche di governo

Le metriche di §10 (governo) e quelle di dettaglio (Cap. 3-15, calcolo
a richiesta) leggono da `visite`. Le metriche di stato-corrente
(workload, board) restano su `jobs`, invariate — verificare che
`currentWorkload_` non sia stata nel frattempo modificata dalla Fase K
in un modo che questa sotto-fase deve rispettare.

### L5 — Migrazione storica + rimozione campi duplicati

Solo dopo che L2-L4 sono verificate su TEST: eseguire la
materializzazione una tantum di `visite` per i casi storici (§7),
**poi** rimuovere da `JOB_HEADERS` i campi ora duplicati (§9.1, elenco
"campi rimossi"). Solo TEST. Gate umano esplicito prima di qualunque
rimozione — è l'unico passo irreversibile del programma.

### L6 — Frontend (se necessario)

Verificare se `client.html`/`board.html` leggono direttamente uno dei
campi rimossi da `jobs` (es. `visit_number` per il badge "R1/R2" in
`renderReworkHistory`, citato in sessione precedente). Se sì, adattare
per leggere da `visite` (es. `MAX(numero_visita)` per il caso). Solo
lettura — nessuna modifica al comportamento visibile della board.

---

## 12. Criteri di accettazione (per l'intera Fase L, verificati a fine L5)

- [ ] `visite` popolata correttamente per ogni movimento che soddisfa
      la regola §2, con tutti i campi di §9.2
- [ ] Nessun campo duplicato tra `jobs` e `visite` oltre ad `arrival_ts`
      (duplicazione dichiarata e voluta) dopo L5
- [ ] Guardia esteso a `done`, verificato con test dedicato
- [ ] `getBoard()`/dashboard invariati nel comportamento osservabile
- [ ] Migrazione storica eseguita su TEST, verificata da Marco, nessun
      dato grezzo sovrascritto prima della rimozione campi in L5

## Gate 🔴 UMANO

Gate esplicito dopo L1 (schema confermato prima di costruire sopra),
e gate esplicito dopo L5 (migrazione + rimozione campi verificata da
Marco prima di procedere a L6 o a un eventuale deploy PROD). Nessuna
sotto-fase scrive su PROD senza conferma esplicita separata.

