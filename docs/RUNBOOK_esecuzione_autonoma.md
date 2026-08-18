# RUNBOOK — Esecuzione autonoma di un programma a sotto-fasi

> Si applica a qualunque programma nella forma già usata in questo
> progetto (Fasi L1-L6, N1-N6, sessioni M0...): un documento
> `DESIGN_*.md` con una tabella di sotto-fasi ordinate, ciascuna con
> contenuto, gate, e criteri di accettazione espliciti nel corpo del
> documento. Non è legato a un meccanismo di avvio specifico — vale
> identico che la sessione parta da un prompt manuale, da una Local
> Routine schedulata, o altro.

---

## Definition of Done (per sotto-fase)

Una sotto-fase è **DONE** quando, e solo quando, valgono **tutti** e
quattro questi punti — non tre su quattro, non "probabilmente":

1. Tutti i criteri di accettazione elencati per quella sotto-fase nel
   documento di design sono verificati **TRUE**, uno per uno — non
   "il codice sembra corretto", verificati.
2. La suite di test completa passa (harness Node o
   `runAllTestsAndLog`), **senza regressioni** rispetto allo stato
   precedente.
3. Il push su TEST è verificato con `clasp pull` isolato + diff — 0
   differenze.
4. `PROGRAMMA_STATO.md` è aggiornato con l'esito, in modo verificabile
   (numeri, non aggettivi: "69/69 test", non "i test passano bene").

---

## Come leggere il programma

1. Aprire il documento di design indicato nel prompt di sessione (se
   non indicato, l'ultimo aggiunto ai "Riferimenti tecnici" di
   `CLAUDE.md`).
2. Leggere `PROGRAMMA_STATO.md` per determinare l'ultima sotto-fase
   segnata DONE.
3. La prossima sotto-fase da eseguire è la prima, nell'ordine della
   tabella del documento, non ancora DONE.
4. Se quella sotto-fase ha un Gate (colonna "Gate" = 🔴 Umano nella
   tabella): eseguire tutto il lavoro previsto (codice, test) ma **non**
   l'azione finale che il gate protegge (tipicamente: attivazione
   definitiva di un trigger, scrittura PROD, un passo irreversibile) —
   fermarsi esplicitamente e segnalare che è pronta per conferma.

---

## Comportamento in caso di successo

- Aggiornare `PROGRAMMA_STATO.md` marcando la sotto-fase come
  completata, con un riepilogo verificabile (non un semplice "fatto").
- Se la sotto-fase appena completata **non** aveva un gate: procedere
  immediatamente alla successiva, senza fermarsi a chiedere conferma —
  salvo indicazione diversa nel prompt di sessione.
- Se la sotto-fase aveva un gate: fermarsi qui. Non procedere alla
  successiva finché non arriva una conferma esplicita.

---

## Comportamento in caso di fallimento

Questo è il punto che decide se un programma eseguito in autonomia
resta affidabile o no — merita più attenzione del caso di successo.

Se un test fallisce, o un criterio di accettazione non risulta
verificabile TRUE: **fermarsi immediatamente**. In particolare:

- **Non** passare alla sotto-fase successiva.
- **Non** ritentare automaticamente la stessa sotto-fase cambiando
  approccio senza documentarlo — un secondo tentativo silenzioso
  nasconde informazione, non la risolve.
- **Non** modificare il criterio di accettazione per farlo tornare
  vero — se il criterio è sbagliato, è una decisione di design da
  discutere, non un ostacolo da rimuovere.

Scrivere in `PROGRAMMA_STATO.md`, con lo stesso livello di dettaglio
di una diagnosi:

- quale criterio non è soddisfatto, e perché;
- cosa è stato provato;
- se il sospetto è che il problema sia nel **design** (il documento
  descrive qualcosa che il codice reale non supporta più) o
  nell'**implementazione** di questa sessione.

Poi:

- **Se il documento di design descrive già come gestire quel caso**
  (es. "se X, fai Y"): seguirlo, senza fermarsi a chiedere — è già una
  decisione presa, non serve riconfermarla.
- **Se il documento non lo copre**, o se il fallimento mette in dubbio
  una **decisione di fondo** del design (non un dettaglio di
  implementazione): fermarsi e attendere una decisione — non
  improvvisare una soluzione che il documento non ha previsto.

---

## Indipendenza dal meccanismo di avvio

Questo runbook non cambia in base a come la sessione è stata invocata
(prompt manuale, Local Routine, `/loop`, o altro) — la logica di
"cosa fare" è separata da "chi/cosa fa partire la sessione".
