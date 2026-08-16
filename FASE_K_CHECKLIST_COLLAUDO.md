# Collaudo Fase K — checklist per Marco

Ambiente: TEST (`?env=test`). Circa 15-20 minuti.
Segna ogni riga con OK / KO. Se qualcosa è KO, descrivi cosa hai visto — mi fermo e correggo prima di andare avanti.

---

## A. Correzione eventi in Cronologia (il cambiamento principale di oggi)

1. Apri una card qualsiasi → tab Cronologia. --> OK
2. Sull'evento di **creazione** (il primo, badge AUTO) deve comparire l'icona matita. Il cestino NO. --> OK
3. Clicca la matita sull'evento di creazione, cambia solo la data, salva. --> OK
   - Atteso: si salva senza errori, la data cambia nella lista. --> OK
   - Il badge dell'evento resta AUTO o diventa MANUALE? (segna cosa vedi, non c'è una risposta sbagliata — mi serve solo saperlo) --> MANUALE
4. Trascina una card in un'altra colonna (evento AUTO di spostamento reale). Poi clicca la matita su **quell'evento** e correggi l'orario.
   - Atteso: si salva senza errori (prima era bloccato, ora deve funzionare). --> OK
5. Sullo stesso evento appena corretto, verifica se ora compare anche il cestino (dovrebbe comparire, perché una volta corretto da un umano l'evento "diventa" modificabile a tutti gli effetti). --> OK
6. Prova a cliccare il cestino su un evento AUTO **mai toccato/corretto**: deve restare bloccato (nessun cestino visibile, oppure errore se forzato via altre vie). --> OK
7. Apri "Aggiungi evento": nel menu "Tipo evento" devono comparire **solo** "Spostamento" e "Nota" — **non** deve più esserci "Correzione timestamp". --> OK
8. Vai su Informazioni: il pannello "Correggi timestamp" **non deve più esserci**. --> OK

## B. Colonna TO DO / ruolo "In preparazione"

9. Sposta una card in TO DO (drag reale sulla board). Apri Cronologia → aggiungi un evento di spostamento non necessario qui, basta verificare che **non compaia nessun dialog** "Allinea i campi strutturati" — il salvataggio deve essere silenzioso, senza popup di conferma. --> OK
10. Verifica in Dashboard ("Lavoro presente nel sistema") che "In preparazione" mostri un numero coerente con le card effettivamente in TO DO. --> OK

## C. Campi strutturati (verifica indiretta, senza vederli mai direttamente in UI)

11. Sposta una card BACKLOG → TO DO → WIP (drag reale, tre passaggi separati). Apri il foglio TEST e controlla sulla riga di quella card:
    - `prep_ts` valorizzato dopo il passaggio in TO DO --> OK
    - `start_ts` valorizzato solo dopo il passaggio in WIP (non prima) --> OK
    - `incarico_ts` valorizzato dal primo ingresso in BACKLOG (se non già presente da prima) --> KO non viene valorizzata alcuna data

in generale, sarebbe opportuno che almeno la data di creazione della card venisse mostrata in cronologia, in modo da dare un riferimento all'utente
ad esempio questo è particolarmente evidente nel primo passaggio, dove non compare la colonna di origine "BACLOG", ma solo la freccia del primo spostamento
13/08/2026 14:09
SPOSTAMENTO
AUTO
→ TO DO

si vede che non è valorizzata la colonna "from"

## D. Rientri (rework)

12. Su una card con almeno un rientro (visit_number > 1, o creane uno: WIP → attesa → torna indietro), apri Cronologia: "Storico rientri" deve comparire **lì**, non più nel tab Informazioni. --> OK, compare solamente l'ultimo rientro, e solamente con dicitura tecnica e non user friendly. Esempio: Rientro 3 - causa: wait_client
NOTA: questo riquadro compare anche nella versione minima della card sulla board, come Rn e così va bene come segnale, come evidenza. Dentro la cronologia si dovrebbe vedere comunque tutti i passaggi delle varie colonne di standby. Quindi questo riquadro potrebbe essere semplicemente semplificato, magari con un segnale in alto a destra in cronologia o in informazioni, solo per scopo informativo.

## E. Regressioni generali (deve funzionare come prima)

13. Il tentativo di riaprire una card **direttamente** da una colonna di attesa a WIP resta bloccato con messaggio d'errore. --> OK
14. Aggiungere un evento con data futura resta bloccato con errore inline. --> OK
15. Aggiungere un evento che crea un'incoerenza di sequenza mostra ancora il dialog "Attenzione — la cronologia cambia" (questo dialog **non** è stato toccato, deve esserci ancora). --> OK
16. Eliminare un evento **manuale** funziona come prima (icona cestino, conferma, sparisce dalla lista). --> OK

---

Se tutto è OK, scrivimi "collaudo Fase K superato" e passiamo alla decisione su come/quando estendere a PROD (che resta comunque sempre una tua azione manuale separata).

OSSERVAZIONI:
1. il riquadro "Informazioni" è un po' squilibrato tra la parte sinistra del titolo/job/note e la fascia destra con tutto il resto che occupa uno spazio verticale maggiore. Andrebbe secondo me rivisto il layout interno della card

2. Dashboard - riquadro Lavoro presente nel sistema
oggi è così (e i numeri sono coerenti con le colonne). Ma che differenza c'è tra "Lavoro che può rientrare" e "Lavoro bloccato"?
Per il lavoro bloccato, mi sembra di capire che è la somma di tutte le card in attesa (10 = 2 + 4 + 4), anche se io lo chiamerei lavoro in attesa.
Invece lavoro che può rientrare non mi è chiaro. O meglio, se vediamo le definizioni della dispensa fsc.md ha una sua precisa definizione, ma mi fugge il calcolo in questo caso che è 12 card.
Lavoro pronto	5
In preparazione	9
Lavoro in corso	20
Lavoro che puo rientrare	12
Lavori bloccati	10
In attesa di cliente	2
In attesa di enti	4
Fermi per decisione interna	4

3. Dashboard - ordine delle taglie e delle colonne: l'ordine non è cambiato, non segue la logica XS, S, M, L, XL. Lo stesso per le colonne. 
Distribuzione per taglia
S	50 pt - 10 card
XS	21 pt - 7 card
XL	80 pt - 4 card
L	117 pt - 9 card
M	112 pt - 14 card

Punti per colonna
TO DO	96 pt - 9 card
INCARICHI	67 pt - 5 card
ATTESA MT/GC	16 pt - 4 card
ATTESA ENTI	16 pt - 4 card
ATTESA CLIENTE	8 pt - 2 card
DA INVIARE / DA FATTURARE	209 pt - 17 card
WIP	177 pt - 20 card