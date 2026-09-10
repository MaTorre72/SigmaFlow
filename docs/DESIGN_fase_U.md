# DESIGN — Fase U: tre bug residui (sync visite, test fuso orario, mu)

Fase a sé, non parte del programma di taratura Cap. 14 (che dipende da
questa ma non la contiene). Tutto il resto della revisione dashboard
(Fase R/S, R9/R10) è chiuso — questo documento copre solo i tre punti
ancora aperti. Autosufficiente: non presuppone la lettura di nessun
altro documento.

---

## 1. Bug critico — `syncVisiteFromLog_` senza protezione rientrante propria

**Diagnosi.** `syncVisiteFromLog_` (Kanban.gs, riga ~390) ricostruisce
le righe di un job nel foglio `visite` con un delete-poi-append:
`deleteVisiteRowsForJob_` cancella le righe esistenti del job, poi
`appendVisitRow_` riscrive la sequenza calcolata da
`computeVisiteFromLog_` (che legge `activity_log_json`, fonte di
verità). Corretto per una singola esecuzione, ma non possiede una
protezione rientrante propria.

La diagnosi iniziale secondo cui nessuno dei cinque chiamanti avesse un
lock non è corretta: le quattro scritture avviate dalla UI passano da
`api()`/`withEnvironment_`, che acquisisce già il `ScriptLock` globale
introdotto in Fase P2. Il problema residuo riguarda le chiamate dirette
o interne a `syncVisiteFromLog_`, che non sono necessariamente protette
da quell'ingresso UI:

| Chiamante | File:riga |
|---|---|
| `moveJob` (drag della card) | Kanban.gs:249 |
| `addActivityEvent` (correzione manuale in Cronologia) | Kanban.gs:647 |
| `updateActivityEvent` | Kanban.gs:810 |
| `deleteActivityEvent` | Kanban.gs:871 |
| `migrateSingleJobActivityLog_` (backfill per-job) | ActivityLog.gs:342 |

Altre funzioni che scrivono sulle stesse tabelle **sono** già protette
con lo stesso meccanismo globale:

| Funzione | File:riga |
|---|---|
| `moveJobToSheet_` (archiviazione/cestino) | Kanban.gs:988 |
| `eliminaJobDefinitivamente` | Kanban.gs:1205 |
| `svuotaCestino` | Kanban.gs:1226 |
| `migrateVisiteFromHistorySuProd` (rebuild completo) | ActivityLog.gs:473 |

**Conseguenza verificata sul database live** (SigmaFlow Database,
lettura diretta dei fogli `jobs`/`visite`, 09/2026): 56 job vivi, 43
rientri veri contati da `activity_log_json` (seguendo solo il campo
`to` di ogni evento `move`, mai il campo `from`, che può essere stale —
stesso principio già usato da `computeVisiteFromLog_`). Righe attese in
`visite`: 43 rientri + 56 visite iniziali = 99. Righe reali: **134 — 35
in eccesso**, distribuite su **22 job su 56 (39%)**, come duplicati
esatti o come due versioni diverse della stessa sequenza. Causa: due
esecuzioni concorrenti sullo stesso job (doppio click, due tab, retry
dopo risposta lenta, backfill in corso mentre la board è in uso)
possono intrecciarsi — entrambe cancellano (innocuo), poi entrambe
scrivono la propria versione.

### 1.1 Fix

Introduci un unico helper rientrante per il `ScriptLock`: deve acquisire
e rilasciare il lock reale soltanto al livello più esterno della stessa
esecuzione. Usalo sia in `withEnvironment_` sia attorno all'intera
operazione di `syncVisiteFromLog_` (lettura, delete e append). In questo
modo gli ingressi UI continuano a beneficiare del lock globale di P2
senza una seconda acquisizione non coordinata, mentre le invocazioni
dirette di `syncVisiteFromLog_` diventano a loro volta serializzate.
Anche gli eventuali chiamanti batch devono usare lo stesso helper, così
un livello interno non rilascia prematuramente il lock posseduto dal
livello esterno.

Nessuna modifica a `computeVisiteFromLog_`: la logica di ricostruzione
è corretta, manca solo la protezione rientrante attorno a delete+append.

### 1.2 Pulizia dati (una tantum — la esegue Marco, non automatizzare)

`migrateVisiteFromHistorySuProd` (ActivityLog.gs) esiste già e fa
esattamente quello che serve: svuota `visite` e la riscrive da capo per
tutti i job, dal solo `activity_log_json`. Marco la esegue dall'editor
Apps Script, a board ferma, **dopo** che 1.1 è live — non prima,
altrimenti si ricrea lo stesso problema durante la pulizia. Non
chiamarla da codice o da un gate automatico.

### Criteri di accettazione

- [x] Gli ingressi UI restano protetti dal lock globale di
      `api()`/`withEnvironment_` introdotto in Fase P2.
- [x] `syncVisiteFromLog_` usa lo stesso helper rientrante attorno
      all'intera sequenza di lettura, delete e append, proteggendo anche
      le chiamate dirette senza doppie acquisizioni o rilasci anticipati.
- [x] Test che forza due chiamate quasi simultanee sullo stesso job:
      nessuna riga duplicata in `visite` al termine.
- [x] Dopo l'esecuzione di 1.2 da parte di Marco: righe in `visite` =
      rientri veri (dal log) + 1 per ogni job vivo, nessun residuo.

### Esito pulizia PROD — 2026-09-10, ore 18:07

Marco ha eseguito `migrateVisiteFromHistorySuProd()` con la board ferma.
Il log riporta:

- `jobs_processed = 56`;
- `jobs_without_log = 0`;
- `visite_written = 99`;
- 2 warning `RIENTRO_DIRETTO_A_WIP`, sui job
  `JOB-20260707-0YXL` e `JOB-20260707-8NJ7`.

Il risultato riconcilia esattamente il conteggio atteso: 56 visite
iniziali + 43 rientri reali = 99 righe. Le 134 righe presenti prima
della pulizia includevano quindi 35 record eccedenti, ora eliminati. I
due warning descrivono transizioni storiche dirette da attesa ente a
WIP, gestite dalla ricostruzione; non sono duplicati e non costituiscono
un errore della migrazione.

Il fix preventivo del lock resta da rilasciare nell'applicazione PROD
prima di riaprire stabilmente la board, altrimenti nuove esecuzioni
concorrenti potrebbero ricreare duplicati.

---

## 2. Bug minore — test fragile sul fuso orario

**Diagnosi.** Il test `testStockSeriesFromLogGeneralizesOverIncludedRoles`
(Tests.gs, riga ~2937) costruisce una data con `new Date(anno, mese,
giorno)` — che usa il fuso orario locale di chi esegue il test — e la
confronta con timestamp generati altrove nello stesso test in modo
esplicito sul fuso Europe/Rome. Il test passa solo se l'intera suite
gira con `TZ=Europe/Rome` (verificato: 211/211 test verdi in quel
fuso); fallisce con un fuso diverso. **Non è un bug di prodotto**: in
produzione Apps Script gira sempre nel fuso del progetto Google
(Europe/Rome) — è solo fragilità del test in un ambiente di esecuzione
con un fuso diverso (es. CI).

### Fix

Fai costruire anche quella data in modo esplicito su Europe/Rome,
usando lo stesso meccanismo già impiegato nel resto del test per
generare timestamp indipendenti dal fuso locale — senza cambiare cosa
il test verifica, solo come costruisce quella singola data.

### Criteri di accettazione

- [ ] Il test passa lanciando la suite con `TZ=UTC` (o qualunque fuso
      diverso da Europe/Rome), non solo con `TZ=Europe/Rome`.
- [ ] Nessuna modifica alla logica di calcolo verificata dal test.

---

## 3. Bug — "Tasso di servizio (mu)" incoerente con gli altri valori del pannello

**Diagnosi.** Nel Quadro avanzato della dashboard, con `team_size = 3`
(config), il pannello mostra:

```
Tasso di servizio per persona (mu):            0,14 passaggi/settimana/operatore
Tempo medio per passaggio (E[S]):              41,57 giorni
Capacita' disponibile stimata (team, 3 persone): 0,49
Utilizzo (rho):                                570%
Utilizzo effettivo (rho effettivo):            662%
Margine di stabilita':                         -562%
```

Con `mu = 0,14` e `team_size = 3`, la capacità attesa sarebbe `0,14 × 3
= 0,42` — il pannello mostra `0,49`. Gli altri cinque valori (E[S],
capacità, rho, rho effettivo, margine) sono reciprocamente coerenti fra
loro su un mu implicito diverso, circa **0,168** (verificabile:
ricalcolando rho con mu=0,14 si ottiene un numero diverso dal 570%
mostrato — prova che il resto del pannello non usa già 0,14 per i
propri calcoli). Il campo "mu" visualizzato è quindi calcolato o
recuperato da un percorso diverso dal resto del pannello — non è mai
stato individuato quale, né se sia un problema di popolazione di
campioni diversa o di arrotondamento.

**Nota**: `mu` deriva da campioni di visite (stesso foglio del Bug 1),
quindi la verifica va fatta **dopo** che la pulizia dati (§1.2) è stata
eseguita — prima, si rischierebbe di analizzare un disallineamento che
cambia da solo una volta puliti i dati.

### Cosa fare

1. Confronta nel codice, sugli stessi dati reali (dopo la pulizia di
   §1.2), il valore di `mu` calcolato dalla funzione che alimenta
   "Tasso di servizio" con il valore di capacità usato dal resto del
   pannello (quello coerente con rho/margine). Se le due letture usano
   popolazioni di visite diverse (es. filtri, finestre temporali, o
   campo `completed`/`completedSamples` calcolato in due punti del
   codice con criteri leggermente diversi), quella è la causa: allinea
   le due letture sulla stessa popolazione.
2. Se dopo la pulizia dati i numeri già coincidono, non serve nessuna
   modifica di calcolo — è un esito valido, documentalo comunque (non
   lasciarlo senza risposta).
3. Le etichette sono già implementate nel codice e non richiedono
   ulteriori modifiche. La ricognizione ha confermato le forme:

```
"Capacita' disponibile stimata (team, {team_size} persone)"
"Tasso di servizio per persona (mu)"
```

### Criteri di accettazione

- [ ] Verifica da ripetere sui dati reali dopo la pulizia (§1.2), che
      non è ancora stata eseguita.
- [x] Nessuna popolazione/filtro divergente trovata; il criterio di
      correzione condizionale non si applica.
- [x] I numeri coincidono: documentato che nessuna correzione
      di calcolo era necessaria.
- [x] Etichette già implementate come sopra; nessun intervento residuo.

### Esito preliminare sui dati reali PROD, prima della pulizia — 2026-09-10

La pulizia manuale non era stata eseguita. La precedente indicazione
contraria derivava da un'interpretazione errata della conferma di Marco,
che riguardava invece l'autenticazione clasp.

Prima della pulizia, `checkMuConsistencySuProd()` ha restituito:

- `displayed_mu = 0,02`;
- `recomputed_mu_same_formula = 0,02`;
- `capacity_implied_mu = 0,02`;
- entrambi i confronti `true`;
- `E[S] = 55,69 giorni`, 9 campioni completati, `team_size = 3`;
- capacità effettiva registrata: `0,05` passaggi/giorno per il team.

Non esiste una divergenza di popolazione o formula: sia `mu` sia la
capacità di team derivano dallo stesso tempo medio. Prima degli
arrotondamenti, `1 / 55,69 ≈ 0,01796` passaggi/giorno/persona e
`3 / 55,69 ≈ 0,05387` passaggi/giorno/team. L'apparente scarto nella
dashboard nasce dall'arrotondamento separato a due decimali dei tassi
giornalieri prima della conversione settimanale ×7, artefatto già
documentato in Fase R6.2; non richiede una modifica alle formule.

Nota metodologica: i booleani della diagnostica confrontano i valori
giornalieri già arrotondati (`0,02` e `0,05`), quindi confermano il
percorso applicativo ma non sono da soli una prova indipendente della
precisione di presentazione. La formula non arrotondata nel codice
fornisce la riconciliazione decisiva. Il controllo deve comunque essere
ripetuto dopo §1.2 per rispettare l'ordine di esecuzione della fase.

---

## 4. Verifica (non necessariamente un bug) — "Lavori completati" = "Passaggi completati"

**Osservazione, non confermata.** Nel pannello principale della
dashboard, "Lavori completati (periodo)" e "Passaggi completati
(periodo)" mostrano lo stesso numero (12 e 12, nell'ultima
osservazione). Questo è plausibile **solo** se, nel periodo, nessuno
dei lavori completati abbia richiesto più di un passaggio — ma la quota
di rilavorazione osservata altrove nella dashboard è intorno al 24%,
quindi ci si aspetterebbe che i passaggi superino i lavori nella
maggior parte delle finestre osservate. Potrebbe essere una
coincidenza plausibile sul periodo corrente, oppure un segno che una
delle due metriche legge ancora la fonte sbagliata (le due dovrebbero
contare popolazioni diverse: lavori distinti vs singoli passaggi).

**Nota**: anche questo numero deriva da campioni di visite, quindi va
verificato **dopo** §1.2, per lo stesso motivo del punto 3.

### Cosa fare

Verifica nel codice, dopo la pulizia dati, se le due etichette leggono
davvero popolazioni distinte (lavori distinti conclusi vs singoli
passaggi conclusi). Se sì e il numero coincide comunque sul periodo
attuale, è una coincidenza: documentala. Se le due etichette risultano
agganciate alla stessa fonte per errore, correggi quella sbagliata.
**Non è richiesto nessun cambiamento se la verifica conferma che il
sistema calcola correttamente** — questo punto è una verifica, non un
fix presunto.

### Criteri di accettazione

- [x] Verificato nel codice se le due metriche usano popolazioni
      distinte.
- [ ] Esito numerico da riconfermare dopo la pulizia; il binding distinto
      è già confermato dal codice.

### Esito preliminare sui dati reali PROD, prima della pulizia — 2026-09-10

`checkS4WipCoverageSuProd()` ha restituito, sulla stessa finestra,
`completed_initiatives_periodo = 11` e
`completed_passages_periodo = 14`. Le due metriche leggono quindi
popolazioni realmente distinte anche sui dati PROD: 11 lavori unici
conclusi contro 14 singoli passaggi conclusi. Il precedente `12 = 12`
era compatibile con una coincidenza del periodo osservato, non con un
errore di binding o di aggregazione. Poiché la migrazione non era stata
eseguita, i conteggi `11` e `14` non chiudono il gate post-pulizia e la
diagnostica deve essere ripetuta dopo §1.2.

---

## Ordine di esecuzione

1. Fix del lock (§1.1) — nessun impatto sui dati.
2. Pulizia dati (§1.2) — esegue Marco, a board ferma, dopo che 1.1 è
   live.
3. Verifica/fix di mu (§3) e verifica dei "12=12" (§4) — solo dopo il
   punto 2, perché entrambi dipendono da campioni di `visite`.
4. Fix del test sul fuso orario (§2) — indipendente, in qualunque
   momento.

## Fuori scope

- Taratura Cap. 14 (resta nel suo programma).
- Tutto il resto della revisione dashboard (R9/R10, S6) — già chiuso,
  non riaprire.
- Nessuna modifica a `computeVisiteFromLog_`.
- `jobs_archivio`/`visite_archivio` — oggi vuoti, non toccati.

## Prossimo passo

Prompt di esecuzione per Codex in `PROMPT_FaseU_bug_2026-09-10.md` —
stesso contenuto di questo documento, riformulato come istruzioni
operative.
