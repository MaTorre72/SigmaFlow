# CLAUDE.md — Istruzioni operative per Claude Code
# Progetto: SigmaFlow

## Come leggere questo file
Questo file viene letto da Claude Code all'inizio di ogni sessione.
Contiene le regole operative del progetto. Seguirle sempre,
anche se il prompt di sessione non le ripete.

---

## Stato del progetto

Il programma a fasi originale (Activity Log, Fasi A-K; modello
caso/visita, Fasi L1-L5; migrazione PROD) è **completato**. SigmaFlow è
in produzione. Non c'è più un "programma" da eseguire una fase alla
volta: il lavoro prosegue come manutenzione/evoluzione ordinaria, su
richiesta esplicita di Marco in ciascuna sessione — salvo indicazione
esplicita di autonomia estesa nel prompt di sessione (vedi "Autonomia
ed esecuzione" più sotto).

- Stato corrente e prossimi passi noti: `PROGRAMMA_STATO.md`
- Cronologia completa delle fasi già chiuse: `docs/storico/PROGRAMMA_STATO_storico.md`

All'inizio di ogni sessione, leggere `PROGRAMMA_STATO.md` per il
contesto, poi seguire la richiesta di Marco. Aggiornare
`PROGRAMMA_STATO.md` quando si chiude un pezzo di lavoro significativo
(non ad ogni singola modifica).

---

## Autonomia ed esecuzione

Alcune sessioni sono esplicitamente autorizzate a procedere in
autonomia su più passi consecutivi di un programma già progettato e
documentato — questo verrà detto esplicitamente nel prompt di
sessione. In assenza di questa indicazione, vale il comportamento
ordinario: una richiesta, una sessione, fermarsi per revisione.

**Quando autorizzata, l'esecuzione segue sempre
`docs/RUNBOOK_esecuzione_autonoma.md`** — definisce cosa significa
"fatto" per una sotto-fase, come leggere un programma da un documento
`DESIGN_*.md`, e come comportarsi in caso di successo o di fallimento
dei criteri di accettazione. Non ripetuto qui per evitare due fonti di
verità sulla stessa cosa — consultarlo, non tenerlo a memoria.

### Nessuna conferma in chat per le operazioni ordinarie

Quando una sessione è autorizzata a eseguire un programma via runbook,
**non fermarsi in chat a chiedere il permesso per le normali operazioni
di sviluppo** — sono pre-autorizzate da questo file, non caso per caso:
scrivere/modificare codice sotto `apps-script/`, eseguire la suite di
test (harness Node), `git add`/`git commit` sul branch di lavoro
dedicato (mai `main`), `clasp push`/`clasp pull` verso **TEST**,
aggiornare `PROGRAMMA_STATO.md`. Chiedere prima di una di queste
operazioni, quando si è già dentro un'esecuzione autorizzata, è
esattamente il tipo di frizione che questa sezione esiste per evitare.

Lo stesso vale **tra una sotto-fase e la successiva**: se la sotto-fase
appena chiusa non aveva un gate, procedere subito, senza chiedere "vuoi
che proceda?" — come già dice il runbook. Questo resta vero anche
quando la sessione prosegue in chat in modo interattivo (es. Marco
conferma un gate rispondendo a un messaggio): la conferma di un gate
**è** il via libera a proseguire fino al gate successivo o alla fine
del programma, non un traguardo dopo cui tornare a chiedere ad ogni
passo.

**Gli unici motivi legittimi per fermarsi restano quelli che il runbook
già elenca**: un gate umano esplicito nel documento di design, un
criterio di accettazione non verificabile TRUE, un'ambiguità che il
documento di design non copre. Non aggiungerne altri di propria
iniziativa "per prudenza" — se sembra necessaria una pausa aggiuntiva,
è un segnale che il programma o questo file andrebbero aggiornati per
coprire quel caso esplicitamente, non un'occasione per fermarsi lo
stesso.

Anche in modalità autonoma restano fermi, **sempre**, senza eccezioni:
- Push o merge diretto su `main`/`master` — mai, in nessun caso.
  Rinforzato tecnicamente da un `deny` in `.claude/settings.local.json`.
- Qualunque scrittura su PROD (dati o deployment) — sempre riservata a
  un'azione eseguita da Marco stesso, mai da Claude, gate o non gate.
- Qualunque gate umano 🔴 esplicitamente indicato in un documento di
  design — vedi runbook.
- Azioni distruttive non recuperabili al di fuori del normale flusso
  sopra (force push, `reset --hard`, cancellazioni permanenti,
  eliminazione di branch) — restano governate dal buon senso ordinario
  di Claude Code, non da questa autorizzazione estesa.

I permessi tecnici in `.claude/settings.local.json` (regole
`allow`/`deny`) non sono comunque aggirabili da un prompt, per
progettazione di Claude Code stesso — sono il livello di sicurezza
sotto a tutto questo, indipendente da cosa dice questo file.

### Convenzione per file temporanei/scratch

Tutti i file di lavoro temporaneo (script di verifica, dataset di
prova, copie per il confronto `clasp pull`, ecc.) vanno creati sotto
**`/tmp/sf-scratch/`**, sempre — non in una nuova cartella con nome
diverso ad ogni sessione. Questo permette a `.claude/settings.local.json`
di autorizzare in anticipo le operazioni su quel percorso una volta
sola, invece di accumulare una riga per ogni cartella temporanea mai
creata (come accaduto nelle sessioni precedenti a questa convenzione —
decine di voci ormai inutili, legate a percorsi che non si
ripeteranno mai più).

---

## Regole di codice

- Commenti: **italiano**
- Variabili, funzioni, parametri: **inglese**
- Gestione errori: sempre esplicita — mai lasciare catch vuoti
- Output: leggibili per utenti non tecnici quando mostrati in UI

---

## Regole di progetto

- Mai modificare `main` direttamente — lavorare su un branch dedicato e
  unire tramite pull request. (Rinforzato tecnicamente da un `deny` su
  `git push` verso `main`/`master` in `.claude/settings.local.json`.)
- Ambiente TEST sempre separato da PROD.
- Nessuna scrittura su PROD (dati o deployment) senza gate umano
  esplicito — Marco esegue lui le azioni che toccano i dati reali o il
  deployment pubblicato. **Non tecnicamente imponibile da
  `settings.local.json`** (non è un percorso di file o un comando di
  sistema, è un ID di spreadsheet dentro il codice) — affidato
  interamente al rispetto di questa regola.
- Se un file non esiste dove atteso: documentarlo, non inventarlo.
- Prima di ogni consegna: eseguire la suite di test (harness Node o
  `runAllTestsAndLog`), verificare il push su TEST con `clasp pull`
  isolato + diff (sotto `/tmp/sf-scratch/`, vedi sopra), poi aggiornare
  `PROGRAMMA_STATO.md`. Due comandi pronti in
  `apps-script/test-harness/` (pre-autorizzati in
  `.claude/settings.local.json`, nessun bisogno di comporre script
  inline ogni volta): `node apps-script/test-harness/run-tests.js`
  (suite completa, exit code 1 se qualcosa fallisce) e
  `bash apps-script/test-harness/push-and-verify.sh` (push + verifica
  isolata in un solo passo).

---

## In caso di ambiguità

Se un'istruzione è ambigua rispetto al codice esistente, seguire questo
ordine di priorità:

1. Codice esistente (non rompere ciò che funziona)
2. Documentazione tecnica in `docs/` (`architecture.md`,
   `DESIGN_modello_caso_visita.md`, `DESIGN_archiviazione.md`,
   `dashboard-metrics.md`, `testing-and-security.md`)
3. Chiedere a Marco

Se l'ambiguità non è risolvibile con questi tre passi → documentare il
problema in `PROGRAMMA_STATO.md` e fermarsi.

Se durante l'esecuzione di una sessione autonoma emerge una divergenza
reale tra un documento di design e lo stato attuale del codice: se il
documento stesso descrive già come gestire quel caso, seguirlo senza
fermarsi a chiedere. Fermarsi solo se il documento non copre il caso
trovato, o se la divergenza mette in dubbio una decisione di fondo del
documento (non un dettaglio di implementazione).

---

## Riferimenti tecnici

- Architettura (schema fogli, backend, frontend): `docs/architecture.md`
- Design del modello caso/visita: `docs/DESIGN_modello_caso_visita.md`
- Design dell'archiviazione: `docs/DESIGN_archiviazione.md`
- Runbook di esecuzione autonoma: `docs/RUNBOOK_esecuzione_autonoma.md`
- Metriche dashboard: `docs/dashboard-metrics.md`
- Testing e sicurezza: `docs/testing-and-security.md`
- Setup Google Workspace: `docs/google-workspace-setup.md`

Consultare la documentazione tecnica quando serve un dettaglio di
implementazione — non tenere tutto a memoria.
