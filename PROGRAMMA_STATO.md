# Stato programma: SigmaFlow — Activity Log
Aggiornato: 2026-08-12 10:14

Fase corrente: H
Titolo: Frontend — struttura base
Stato: COMPLETATA (in attesa di conferma smoke test da Marco)

Criteri di accettazione:
[x] Modal card si apre senza errori JavaScript — verificato staticamente (sintassi JS valida, tutti gli ID referenziati esistono), NON con un vero browser (vedi nota sotto)
[x] Tab "Informazioni" mostra tutti i campi esistenti invariati
[x] Tab "Cronologia" carica e mostra eventi dal log (lazy, solo al click sul tab)
[x] Badge AUTO/MANUALE visibili e corretti
[x] Checklist non piu' visibile nell'UI
[ ] clasp push e smoke test: card si apre, tab funzionano — clasp push fatto e verificato con pull+diff; SMOKE TEST REALE DA FARE DA MARCO

Prossima fase: I (in attesa di conferma smoke test)

NOTA IMPORTANTE — limite di questa sessione: il browser disponibile qui
non ha una sessione Google autenticata come Marco (serve un account
sigmapiu.it per accedere alla Web App, ad accesso limitato al dominio).
Non e' stato possibile aprire davvero la board e cliccare sui tab. Ho
verificato staticamente tutto cio' che potevo (sintassi JS valida via
node, nessun riferimento residuo agli ID della checklist rimossa, tutti
gli ID dei nuovi elementi referenziati in client.html esistono in
board.html) ma questo NON sostituisce un vero smoke test nel browser.

COSA DEVE FARE MARCO: aprire la Web App in ambiente TEST, aprire una
card, verificare che compaiano i tab "Informazioni"/"Cronologia" in
cima al modal, che cliccando "Cronologia" carichi la lista eventi (o
mostri "Nessun evento registrato."), che la checklist non compaia piu'
da nessuna parte, e controllare la console del browser (F12) per
eventuali errori JavaScript. Se tutto ok, confermare per procedere alla
Fase I. Se qualcosa non va, descrivere cosa: correggo prima di
richiedere una nuova verifica.

NOTA STRUTTURALE sulla routine cloud: da questa fase in poi il lavoro
e' su codex/activity-log-frontend (creato da codex/activity-log-backend,
non da main, perche' il frontend usa le action addActivityEvent/
getActivityLog che esistono solo li'). La routine cloud
trig_01WrQXQAv2a2Rw8DfhmwGRNG e' pero' configurata sul branch
codex/activity-log-backend: NON vedra' questo aggiornamento di
PROGRAMMA_STATO.md (che vive ora sul branch frontend) finche' non la
riconfiguro sul branch giusto, o Marco non mi chiede di farlo.

Note operative permanenti (invariate):
- Gate umani reali del programma: SOLO Fase F (gia' superata) e Fase J.
- clasp run resta bloccato — verifica di logica GAS pura via harness
  Node in apps-script/test-harness/gas-harness.js; per il frontend
  (DOM/JS nel browser) non esiste un harness equivalente in questa
  sessione, da qui il bisogno di conferma umana per gli smoke test UI.
- Push sempre verificato con clasp pull + diff.
