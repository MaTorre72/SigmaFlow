# Bug-fix — Derivazione dei gate temporali dal log (start_ts / prep_ts / incarico_ts)

> Da trattare come sessione a sé, indipendente dalla Fase K formale.
> Nasce da un'analisi diretta dei dati esportati da TEST oggi (13/08), dopo
> che una sessione precedente ha già introdotto `incarico_ts`/`prep_ts` e
> la modifica di qualunque evento in Cronologia (anche `source: auto`) —
> lavoro fatto in autonomia, non ancora documentato in
> `PROGRAMMA_ACTIVITY_LOG.md`. Prima di intervenire, questa sessione deve
> ricostruire lo stato reale del codice, non fidarsi di questo documento
> come descrizione dello stato attuale.

---

## Perché questo bug-fix esiste

Analizzando l'export dei campi strutturati di alcune card TEST sono
emerse due card con dati incoerenti:

**Card A** — log:
```
1) creazione, ts=08-08 09:34, to="wip", from=null
2) ts=08-12 21:32, to="todo", from="backlog"
```
L'evento 2 dice che la card veniva da BACKLOG, ma l'evento 1 (creazione)
dice che è entrata direttamente in WIP. Le due cose non possono essere
vere entrambe. `incarico_ts` risulta vuoto, coerentemente con "non esiste
nel log un ingresso in BACKLOG" — ma il log stesso è internamente
contraddittorio.

**Card B** — log:
```
1) ts=06-25, to="wip", from=null
2) ts=08-13, to="wip", from="wip"
```
Un evento che parte da WIP e arriva di nuovo in WIP (stessa colonna).
Il campo ricalcolato `start_ts` ha preso il timestamp dell'evento 2
(08-13), non quello dell'evento 1 (06-25) — cioè "l'ultimo ingresso in
WIP nel log", non "l'inizio della lavorazione".

## La causa (accertata, ma da riverificare in audit — vedi Fase 0)

Al momento dell'analisi risultavano **due implementazioni diverse** della
stessa regola concettuale ("quando un evento del log deve aggiornare un
campo strutturato"):

1. **`moveJob`** (spostamento reale sulla board, dal vivo) — applica un
   guardia "solo se non è già valorizzato" per il primo ingresso, più un
   reset esplicito solo quando la provenienza è una colonna `stand_by`
   (vero rientro da attesa = nuova iterazione). Questa logica è
   **corretta** rispetto al modello — non va cambiata.

2. **`checkStructuralAlignment_`** (usata sia per il dialog di
   allineamento sulle correzioni manuali, sia — a quanto risulta da
   questa sessione precedente — riusata per ricalcolare i campi durante
   la migrazione/replay dell'intero log) — segnala/applica
   l'aggiornamento a **qualunque** evento il cui `to` corrisponde al
   ruolo cercato, senza distinguere "è il primo ingresso o un vero
   rientro da attesa" da "è solo un altro evento che tocca quella
   colonna". Scorrendo l'intero log in ordine, l'effetto netto è che
   vince l'**ultimo** evento pertinente, non il primo/il rientro
   legittimo.

Il log resta comunque la fonte di verità — questo non cambia. Il
problema è che oggi esistono due modi di leggerlo che possono dare
risultati diversi sulla stessa card.

## Riferimento di modello (dispensa FSC, Cap. 11)

Il capitolo modella il lavoro su una card come **iterazioni**: la prima
lavorazione fino alla consegna è l'iterazione 1; ogni rientro da uno
stato di attesa/chiuso apre una nuova iterazione con un proprio inizio.
Un evento che ripassa per la stessa colonna senza che nel mezzo ci sia
stato un vero allontanamento (attesa) **non** apre una nuova iterazione
e non deve spostare il gate.

---

## Comportamento atteso (target, non negoziabile senza nuova conferma di Marco)

Per ciascun campo gate (`incarico_ts` per ruolo `backlog`, `prep_ts` per
ruolo `prep`, `start_ts` per ruolo `wip` — stesso principio per un
eventuale `done_ts`/ruolo `done` in futuro), il valore deve essere
**l'unica cosa** derivabile da questa regola, applicata a un evento
`move` con destinazione di quel ruolo:

- **si aggiorna** se il campo non è ancora valorizzato (primo ingresso
  mai avvenuto in quel ruolo per questa card), **oppure** se l'evento
  proviene esplicitamente da una colonna di ruolo `stand_by` (vero
  rientro da attesa — nuova iterazione);
- **non si aggiorna** in tutti gli altri casi (rientro nello stesso
  ruolo senza passare da un'attesa, evento `from`/`to` identici,
  qualunque altro passaggio "laterale").

Questa è, in sostanza, la regola che `moveJob` già implementa dal vivo.
**Il fix non deve cambiare il comportamento del drag reale sulla board**
— deve portare la stessa regola anche nel percorso di ricalcolo/replay
del log (migrazione, e qualunque ricostruzione massiva dei campi
strutturati), così che le due strade non possano più divergere.

### Cosa NON fare

- Non implementare "aggiorna sempre all'ultimo evento pertinente" per
  nessuno dei due percorsi (né live né replay) — non è la regola del
  modello, è quella che ha causato il bug sulla Card B.
- Non modificare `moveJob` se la sua logica di primo-ingresso/rientro-da-
  stand_by risulta, in audit, ancora corretta come sopra descritta.
- Non provare a "correggere automaticamente" la Card A (creazione
  contraddittoria: `to: wip` seguito da un evento che dichiara
  provenienza `backlog`) — è un log internamente incoerente, non un caso
  che la funzione di derivazione possa risolvere algoritmicamente in modo
  sicuro. Va segnalato a Marco per correzione manuale via l'editor eventi
  già disponibile in Cronologia (matita sull'evento di creazione).

---

## Fase 0 — Audit obbligatorio (fermarsi e riportare prima di scrivere codice)

Questa sessione precedente ha lavorato in autonomia su `ActivityLog.gs` /
`Kanban.gs` / `Schema.gs` senza produrre un aggiornamento di
`PROGRAMMA_ACTIVITY_LOG.md` o `PROGRAMMA_STATO.md` coerente con la Fase
K formale. Prima di toccare qualunque riga:

1. Confermare che `incarico_ts` e `prep_ts` sono effettivamente presenti
   in `JOB_HEADERS` (Schema.gs) — e con quale nome esatto (potrebbero
   differire da questi se la sessione precedente ha scelto nomi diversi).
2. Individuare la funzione (o le funzioni) usate per il ricalcolo/replay
   dei campi strutturati durante la migrazione — nome esatto, file, e se
   è effettivamente `checkStructuralAlignment_` riusata in un loop o una
   funzione dedicata scritta ad hoc.
3. Confermare lo stato attuale di `moveJob` per i tre ruoli (`backlog`,
   `prep`, `wip`): il guardia "solo se non impostato" e il ramo
   "provenienza `stand_by`" esistono ancora nella forma descritta sopra?
4. Verificare se esiste già una funzione pura di derivazione condivisa
   (es. qualcosa tipo `computeGateUpdate_` o simile) — se sì, il bug
   potrebbe essere già stato risolto o essere altrove.
5. Confermare se la funzione "modifica qualunque evento, incluso
   `source: auto`" (citata da Marco) è già stata implementata, e dove —
   rilevante perché la correzione manuale della Card A la userà.

**Riportare i risultati dell'audit prima di procedere.** Se lo stato
reale diverge sostanzialmente da quanto descritto in questo documento,
fermarsi e proporre un piano aggiornato invece di applicare le istruzioni
sottostanti alla cieca.

---

## Cosa fare (una volta confermato l'audit)

### 1 — Estrarre la regola in una funzione pura condivisa

Una sola funzione, usata sia dal percorso live (`moveJob`) sia dal
percorso di ricalcolo/replay, che dato: valore corrente del campo,
ruolo di destinazione dell'evento, ruolo di provenienza (se noto)
dell'evento — restituisce se il campo va aggiornato e a quale valore.
Nessuna logica duplicata tra i due percorsi: uno chiama l'altro,
non due implementazioni parallele.

### 2 — Correggere il percorso di ricalcolo/replay (migrazione)

Sostituire la logica "ultimo evento pertinente vince" con la funzione
pura del punto 1, applicata in ordine cronologico sull'intero log di
ogni card.

### 3 — Non toccare il percorso live se già corretto

Se l'audit conferma che `moveJob` implementa già la regola giusta,
limitarsi a farlo passare attraverso la stessa funzione pura (per
garanzia di non-divergenza futura), senza cambiarne il comportamento
osservabile.

### 4 — Ri-eseguire il ricalcolo su TEST (solo TEST)

Dopo il fix, ri-lanciare la migrazione/ricalcolo sui dati TEST esistenti
e produrre un confronto prima/dopo per le card i cui campi cambiano
valore. Nessuna scrittura su PROD.

### 5 — Report finale, non correzione automatica, per i log incoerenti

Per qualunque card il cui log risulti internamente contraddittorio (come
la Card A — evento di creazione con `to` diverso dalla provenienza
dichiarata dall'evento successivo), produrre un elenco (`job_id` +
descrizione della contraddizione) invece di provare a "indovinare" quale
dei due eventi sia quello sbagliato. Marco corregge a mano.

---

## Criteri di accettazione (tutti devono essere TRUE)

- [ ] Esiste una sola funzione di derivazione dei gate, usata sia dal
      percorso live che dal percorso di ricalcolo/replay
- [ ] Test dedicato: un log con un evento `wip → wip` (stessa colonna,
      come la Card B) non sposta `start_ts` dal primo ingresso
- [ ] Test dedicato: un log con vero rientro da `stand_by` verso `wip`
      aggiorna correttamente il gate (comportamento invariato per il
      caso legittimo)
- [ ] Il comportamento del drag reale sulla board (`moveJob`) non è
      cambiato per nessuno dei casi già coperti dai test esistenti
- [ ] Report delle card con log internamente incoerenti prodotto, nessuna
      correzione automatica applicata a quei casi

## Gate 🔴 UMANO

Fermarsi dopo il ricalcolo su TEST. Marco verifica il confronto
prima/dopo sulle card segnalate, corregge manualmente la Card A (e
qualunque altra card nel report) via l'editor eventi, poi conferma se
procedere con un'eventuale applicazione a PROD (fuori scope di questa
sessione senza ulteriore conferma esplicita).
