# Collaudo Fase K — checklist per Marco

Ambiente: TEST (`?env=test`). Circa 15-20 minuti.
Segna ogni riga con OK / KO. Se qualcosa è KO, descrivi cosa hai visto — mi fermo e correggo prima di andare avanti.

---

## A. Correzione eventi in Cronologia (il cambiamento principale di oggi)

1. Apri una card qualsiasi → tab Cronologia.
2. Sull'evento di **creazione** (il primo, badge AUTO) deve comparire l'icona matita. Il cestino NO.
3. Clicca la matita sull'evento di creazione, cambia solo la data, salva.
   - Atteso: si salva senza errori, la data cambia nella lista.
   - Il badge dell'evento resta AUTO o diventa MANUALE? (segna cosa vedi, non c'è una risposta sbagliata — mi serve solo saperlo)
4. Trascina una card in un'altra colonna (evento AUTO di spostamento reale). Poi clicca la matita su **quell'evento** e correggi l'orario.
   - Atteso: si salva senza errori (prima era bloccato, ora deve funzionare).
5. Sullo stesso evento appena corretto, verifica se ora compare anche il cestino (dovrebbe comparire, perché una volta corretto da un umano l'evento "diventa" modificabile a tutti gli effetti).
6. Prova a cliccare il cestino su un evento AUTO **mai toccato/corretto**: deve restare bloccato (nessun cestino visibile, oppure errore se forzato via altre vie).
7. Apri "Aggiungi evento": nel menu "Tipo evento" devono comparire **solo** "Spostamento" e "Nota" — **non** deve più esserci "Correzione timestamp".
8. Vai su Informazioni: il pannello "Correggi timestamp" **non deve più esserci**.

## B. Colonna TO DO / ruolo "In preparazione"

9. Sposta una card in TO DO (drag reale sulla board). Apri Cronologia → aggiungi un evento di spostamento non necessario qui, basta verificare che **non compaia nessun dialog** "Allinea i campi strutturati" — il salvataggio deve essere silenzioso, senza popup di conferma.
10. Verifica in Dashboard ("Lavoro presente nel sistema") che "In preparazione" mostri un numero coerente con le card effettivamente in TO DO.

## C. Campi strutturati (verifica indiretta, senza vederli mai direttamente in UI)

11. Sposta una card BACKLOG → TO DO → WIP (drag reale, tre passaggi separati). Apri il foglio TEST e controlla sulla riga di quella card:
    - `prep_ts` valorizzato dopo il passaggio in TO DO
    - `start_ts` valorizzato solo dopo il passaggio in WIP (non prima)
    - `incarico_ts` valorizzato dal primo ingresso in BACKLOG (se non già presente da prima)

## D. Rientri (rework)

12. Su una card con almeno un rientro (visit_number > 1, o creane uno: WIP → attesa → torna indietro), apri Cronologia: "Storico rientri" deve comparire **lì**, non più nel tab Informazioni.

## E. Regressioni generali (deve funzionare come prima)

13. Il tentativo di riaprire una card **direttamente** da una colonna di attesa a WIP resta bloccato con messaggio d'errore.
14. Aggiungere un evento con data futura resta bloccato con errore inline.
15. Aggiungere un evento che crea un'incoerenza di sequenza mostra ancora il dialog "Attenzione — la cronologia cambia" (questo dialog **non** è stato toccato, deve esserci ancora).
16. Eliminare un evento **manuale** funziona come prima (icona cestino, conferma, sparisce dalla lista).

---

Se tutto è OK, scrivimi "collaudo Fase K superato" e passiamo alla decisione su come/quando estendere a PROD (che resta comunque sempre una tua azione manuale separata).
