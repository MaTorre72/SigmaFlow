# Validazione finale V2 — 14 settembre 2026

## Perimetro ed evidenze

Backend e contratto dashboardState, non interfaccia V3. Fonte:
[SigmaFlow Database TEST](https://docs.google.com/spreadsheets/d/1kzoVGcIqcYIuGWgmRQbeuyK-37cmSaUQye3d36rhDRU/edit).
Nuova lettura alle 07:28:31 Europe/Rome: 56 job, 50 visite, archivi
vuoti. Snapshot minimizzato in directory temporanea, non nel repository.
Le letture delle tabelle sono separate, non una transazione atomica.
Il controllo esegue il codice reale nell'harness locale, non GAS remoto.
Il pull isolato conferma 17/17 file identici ai sorgenti pubblicati TEST.

Nessun dato sorgente modificato. Nessuna modifica a codice applicativo
durante questa validazione; esteso soltanto il verificatore indipendente
apps-script/test-harness/verify-v2-snapshot.js e la documentazione.

## Checklist del paragrafo 35

| Criterio | Esito ed evidenza |
| --- | --- |
| Punti e conteggi | Stock riconciliati contro ultimo to grezzo: WIP 5/47, futuro 10/71, attesa 11/87 (job/punti). Nessuna replica dei punti sulle riprese. |
| WIP solo ruolo wip | Verifica indipendente su tutta la storia; attesa e prep separati. |
| Riprese | 78 episodi: 36 primi, 42 successivi, verificati dai to grezzi. 44 ritorni dall'attesa distinti dagli episodi WIP. Limite sulle chiusure definitive esplicito. |
| Completamenti tecnici | Da consegna_ts delle visite, non done_ts; test e riconciliazione dei totali mensili/settimanali. |
| Media mobile capacita' | 26 finestre osservate controllate indipendentemente per formula e minimo campionario; null per campione insufficiente, settimane a zero mantenute. |
| Capacita' nuovo lavoro | 26 finestre controllate indipendentemente dai primi ingressi WIP; valore attuale 6,5 punti/settimana. |
| Settimane impegnate | 71 / 6,5 = 10,9230769, arrotondato a 10,92. Nessun WIP o attesa nel numeratore. |
| Cumulative | Totali di acquisizioni e consegne riconciliati con eventi su serie mensile e settimanale completa; cumulative non azzerate dalla finestra operativa. |
| CFD | 156 identita' esatte su 26 settimane operative; 1.608 identita' su tutta la storia mensile/settimanale, con stock confrontati indipendentemente coi to grezzi. |
| Ribasamento annuale | 294 identita' delle bande ribasate; offset unico per unita', base zero a t0, stock ereditati preservati. |
| Storico comparabile | Disponibilita' distinta dalla completezza: comparable_years vuoto e quality insufficient; non vengono inventati confronti robusti. |

Invarianza verificata alterando tutti i from salvati per flussi, episodi,
CFD, capacita' e storico. Le 15 incoerenze nel JSON restano segnalate,
senza influenzare questi calcoli e senza essere corrette.

## Regressioni e integrazione

- Suite completa: 230/230 in UTC e 230/230 in Europe/Rome.
- Coperti ISO 53, cambi anno/DST, duplicati WIP, rientri via prep e
  diretti, archivio, zero/insufficienza, offset e input immutati.
- calculateMetrics_ espone dashboardState dal percorso backend V2;
  la UI legacy continua a leggere systemState. Nessun calcolo V2 in UI.
- Nessun diff di ActivityLog.gs, Kanban.gs, client.html e dashboard.html.
- git diff --check superato; restano soltanto avvisi di normalizzazione
  LF/CRLF. Nessun merge/commit o deployment PROD eseguito.

## Limiti da mantenere visibili

1. Il TEST attuale non e' la fotografia del vecchio log da 58 cronologie.
   Nelle ultime 8 settimane ci sono 2 consegne valide, sotto il minimo
   configurato di 5: capacita' osservata null, non 5,63. Non e' un errore
   aritmetico e non prova da solo una diminuzione della produttivita'.
2. Nessuna prova di completezza storica: intervallo disponibile dalla
   prima evidenza, non certificazione di una raccolta senza lacune.
3. Taglie storiche basate sui punti attuali del job, non su versioni
   storiche delle taglie. In questo snapshot non ci sono job senza
   size_points positivo, duplicati di job/visita o visite orfane.
4. Riaperture definitive non ricostruibili affidabilmente: conteggio
   differito. I ritorni dall'attesa dichiarano il limite di classificazione.
5. issues[] e' solo struttura; soglie e classificazioni non configurate
   non sono stime operative. Confronto sperimentale congestione differito;
   nessun decadimento applicato al modello ufficiale plateau.
6. Verifica UI, prestazioni nel runtime GAS e accettazione operativa PROD
   non sono certificate dai test locali. Nessuna migrazione dati eseguita.

## Gate finale

Valutazione nel perimetro verificato: backend V2 pronto con i limiti
dichiarati sopra. La richiesta di validazione finale conferma il rinvio
del conteggio riaperture proposto in V2.6. Rimane da acquisire il gate
umano finale prima di considerare aperta V3; nessuna V3 avviata qui.
