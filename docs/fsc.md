---
title: "Fisica dei sistemi di lavoro complessi"
subtitle: "Teoria delle code, variabilità, retroazione e controllo applicati ai sistemi di consulenza tecnica"
author: "Marco Torresendi"
date: "Versione 0.3 – 2026"
lang: it-IT
documentclass: extreport
fontsize: 9pt
papersize: a4
geometry: margin=2.5cm
mainfont: "DejaVu Serif"
sansfont: "DejaVu Sans"
monofont: "DejaVu Sans Mono"
header-includes:
  - |
      \usepackage{fancyhdr}
      \usepackage{mdframed}
      \usepackage{xcolor}
      \usepackage{microtype}
      \usepackage{booktabs}
      \usepackage{enumitem}
      \usepackage{titlesec}
      \usepackage{titling}
      \usepackage{tocloft}
	  \usepackage{graphicx}

      \setlist{nosep}
      \setlength{\headheight}{18pt}

      \definecolor{SigmaQuoteGray}{gray}{0.75}

      \makeatletter

      \pagestyle{fancy}
      \fancyhf{}

      \renewcommand{\headrulewidth}{0.4pt}
      \renewcommand{\footrulewidth}{0pt}

      \renewcommand{\chaptermark}[1]{\markboth{Cap.\ \thechapter\ —\ #1}{}}

      \fancyhead[L]{\textbf{Sigma+}}
      \fancyhead[R]{\nouppercase{\footnotesize\leftmark}}

      \fancyfoot[L]{\footnotesize\nouppercase{\@title}}
      \fancyfoot[R]{\thepage}

      \fancypagestyle{plain}{
        \fancyhf{}
        \fancyhead[L]{\textbf{Sigma+}}
        \fancyhead[R]{\nouppercase{\footnotesize\leftmark}}
        \fancyfoot[L]{\footnotesize\nouppercase{\@title}}
        \fancyfoot[R]{\thepage}
      }

      \titlespacing*{\chapter}{0pt}{40pt}{0pt}

      \newcommand{\chaptersubtitle}[1]{\begingroup\setlength{\parskip}{0pt}\par\vspace{-3.5\baselineskip}\noindent{\itshape\footnotesize #1}\par\vspace{3.0\baselineskip}\endgroup}

      \renewenvironment{quote}{
        \begin{mdframed}[
          leftline=true,
          rightline=false,
          topline=false,
          bottomline=false,
          linecolor=SigmaQuoteGray,
          linewidth=3pt,
          innerleftmargin=10pt,
          innerrightmargin=10pt,
          innertopmargin=6pt,
          innerbottommargin=6pt,
          skipabove=2pt,
          skipbelow=6pt
        ]
        \itshape\small
      }{
        \end{mdframed}
      }

      \setlength{\cftchapnumwidth}{4.0em}
      \setlength{\cftsecnumwidth}{5.5em}
      \setlength{\cftsubsecnumwidth}{6.5em}
      \setlength{\cftsubsubsecnumwidth}{7.5em}
      \setlength{\cftparanumwidth}{9.0em}

      \newcommand{\@subtitle}{}
      \providecommand{\subtitle}[1]{}
      \renewcommand{\subtitle}[1]{\gdef\@subtitle{#1}}

      \renewcommand{\maketitle}{
        \begin{titlepage}
          \thispagestyle{empty}
          \centering
          \vspace*{2.5cm}

          {\fontsize{32}{36}\selectfont\bfseries \@title\par}
          \vspace{0.2em}
          {\fontsize{11}{14}\selectfont \@subtitle\par}

          \vspace{1.2cm}
          \IfFileExists{cover.png}{\includegraphics[width=0.55\textwidth]{cover.png}\par}{}

          \vspace{1.4cm}
          {\large \@author\par}

          \vfill
          {\normalsize \@date\par}
        \end{titlepage}
      }


      \makeatother
---

\newpage
\tableofcontents
\newpage

# Introduzione ai sistemi di lavoro complessi

## Sistemi complicati e sistemi complessi

Nel linguaggio comune i termini *complicato* e *complesso* sono spesso utilizzati come sinonimi. In ambito scientifico e ingegneristico, tuttavia, essi descrivono **categorie di sistemi profondamente diverse**, con implicazioni radicalmente differenti sul modo in cui tali sistemi possono essere analizzati, compresi e governati.

Un **sistema complicato** è un sistema costituito da molte parti, talvolta anche numerose e altamente specializzate, ma caratterizzato da relazioni sostanzialmente **lineari** e **deterministiche**. In un sistema complicato:

- le relazioni causa–effetto sono stabili;
- il comportamento del sistema può essere ricondotto alla somma dei comportamenti delle singole parti;
- il sistema è, almeno in linea di principio, completamente descrivibile tramite modelli statici o quasi-statici.

Esempi tipici di sistemi complicati (nel senso: altamente strutturati ma dominati da relazioni prevalentemente deterministiche e analizzabili per decomposizione) sono:

- un motore a combustione interna,
- un riduttore meccanico o un sistema di trasmissione,
- un circuito elettrico lineare in regime stazionario.

In questi casi, l’aumento della complessità strutturale richiede competenze specialistiche, ma **non cambia la natura del problema**: il sistema resta prevedibile e governabile tramite analisi dettagliata e ottimizzazione delle singole componenti.

Un **sistema complesso**, al contrario, è caratterizzato da:

- interazioni **non lineari** tra le parti;
- presenza di **retroazioni**;
- dipendenza dallo stato e dalla storia del sistema;
- comportamento emergente non riducibile alla semplice somma delle parti.

Nei sistemi complessi:

- piccole variazioni locali possono produrre effetti globali sproporzionati;
- la relazione causa–effetto può essere ritardata nel tempo;
- il comportamento del sistema può cambiare qualitativamente al variare di pochi parametri.

Esempi di sistemi complessi includono:

- ecosistemi naturali,
- sistemi economici e sociali,
- traffico veicolare,
- sistemi di produzione e di servizio ad alta variabilità.

I **sistemi di lavoro contemporanei**, e in particolare i sistemi di consulenza tecnica e professionale, rientrano a pieno titolo in questa seconda categoria.

***

## Perché i sistemi di lavoro sono sistemi complessi

Un sistema di lavoro moderno non è semplicemente un insieme di attività da svolgere, ma un **sistema dinamico aperto**, immerso in un ambiente esterno che ne condiziona continuamente il comportamento.

Nel caso dei sistemi di consulenza tecnica, le caratteristiche che rendono il sistema complesso sono molteplici:

1. **Variabilità intrinseca del lavoro**
   Le attività non sono omogenee: coesistono incarichi brevi e standardizzati e attività lunghe, esplorative e ad alta incertezza. Questa eterogeneità introduce una varianza elevata nei tempi di completamento.

2. **Retroazione strutturale (rework)**
   Una parte significativa del lavoro rientra nel sistema dopo una prima consegna, sotto forma di richieste di integrazione, chiarimenti o modifiche. Il lavoro non fluisce in modo unidirezionale, ma circolare.

3. **Ritardi esterni**
   Il sistema è fortemente condizionato da attori esterni (clienti, enti, autorità), i cui tempi di risposta sono:

   - poco prevedibili,
   - spesso lunghi,
   - altamente variabili.

4. **Interdipendenza delle attività**
   Le attività non sono isolate: la saturazione del sistema in un punto si riflette sull’intero flusso, generando code, attese e congestioni.

5. **Limitatezza delle risorse**
   La capacità del sistema (numero di persone, competenze disponibili, attenzione cognitiva) è finita e non scalabile nel breve periodo.

Queste caratteristiche fanno sì che il comportamento globale del sistema **non possa essere dedotto** semplicemente dalla buona volontà, dalla competenza tecnica o dall’impegno delle singole persone.

***

## Il fallimento dell’intuizione e dell’approccio locale

Nei sistemi complicati, l’approccio naturale consiste nell’analizzare le singole parti e ottimizzarle separatamente. Nei sistemi complessi, questo approccio conduce spesso a risultati opposti a quelli desiderati.

In particolare, nei sistemi di lavoro complessi:

- aumentare l’impegno individuale non garantisce una riduzione dei tempi complessivi;
- “lavorare più velocemente” su singole attività può aumentare la congestione globale;
- ridurre i tempi di una fase può semplicemente spostare il collo di bottiglia altrove.

Questo fenomeno è ben noto in fisica dei sistemi complessi e in teoria dei sistemi dinamici: **l’ottimizzazione locale non coincide con l’ottimizzazione globale**.

L’intuizione manageriale tradizionale tende a fallire perché:

- è basata su relazioni lineari;
- trascura la dinamica temporale;
- ignora l’effetto cumulativo delle retroazioni e dei ritardi.

Ne deriva una percezione soggettiva di “caos” o “disorganizzazione”, che in realtà è l’espressione di **leggi strutturali non riconosciute**.

***

## Obiettivo e approccio della trattazione

L’obiettivo di questa dispensa non è fornire:

- tecniche motivazionali,
- strumenti di pianificazione fine,
- metodi di controllo individuale del lavoro.

L’obiettivo è invece:

> **comprendere e modellare il sistema di lavoro come un sistema fisico**,  
> soggetto a leggi statistiche e dinamiche precise,  
> al fine di individuarne le condizioni di stabilità e i meccanismi di controllo.

L’approccio adottato è quello della:

- **teoria delle code**,
- integrata con concetti di
  - sistemi complessi,
  - retroazione,
  - ritardi,
  - controllo dei sistemi dinamici.

La trattazione procede per livelli successivi:

1. introduzione dei modelli base;
2. evidenziazione dei loro limiti;
3. estensione ai casi realistici;
4. traduzione dei risultati teorici in principi operativi.

Il focus non è l’ottimizzazione puntuale delle prestazioni, ma la **stabilizzazione del sistema**, intesa come capacità di:

- mantenere tempi prevedibili,
- assorbire la variabilità,
- evitare collassi dinamici.

***

## Ambito di validità e limiti del modello

È importante chiarire fin dall’inizio che i modelli presentati in questa dispensa:

- sono modelli **astratti**;
- non descrivono ogni dettaglio della realtà;
- non hanno l’obiettivo di fornire previsioni puntuali.

Il loro valore risiede nella capacità di:

- spiegare fenomeni ricorrenti;
- individuare relazioni strutturali;
- guidare decisioni di progetto del sistema.

I limiti principali includono:

- l’ipotesi di stazionarietà locale;
- la riduzione del lavoro a unità astratte (job);
- l’aggregazione delle competenze individuali in capacità media.

Tali semplificazioni sono deliberate e necessarie: come in ogni disciplina ingegneristica, **un modello utile non è un modello perfetto, ma un modello controllabile**.

***

## Struttura della dispensa

Nei capitoli successivi verranno progressivamente introdotti:

- i modelli classici dei sistemi a coda;
- il ruolo della variabilità e del secondo momento;
- la modellazione del rework come retroazione;
- l’effetto dei ritardi e della memoria;
- i principi di controllo applicabili ai sistemi di lavoro.

Il percorso è concepito come una sequenza coerente: ciascun capitolo introduce gli strumenti necessari per comprendere il successivo, fino a giungere a una formulazione completa e operativa del problema.

***

## Mini glossario

Queste definizioni servono a “tradurre” il linguaggio operativo (attività, richieste, priorità, tempi) nel linguaggio dei modelli probabilistici e dei sistemi a coda che useremo nei capitoli successivi.

- **Job (lavoro / richiesta / unità di lavoro)**: un **job** è l’unità minima che decidiamo di **trattare come “oggetto” del sistema**: una pratica, una richiesta cliente, una verifica, un’analisi, una consegna, un ticket, una telefonata strutturata, ecc.
Nei modelli non importa la natura “amministrativa” o “tecnica” del job: importa che abbia **un ingresso**, **un tempo di lavorazione**, eventualmente **un’attesa** e un’**uscita**.

- **Arrivo (arrival)**: un job “arriva” quando entra nel sistema: viene richiesto, registrato, assegnato o comunque diventa **visibile** e **lavorabile**.
Formalmente: il numero di arrivi in un intervallo, o i tempi tra arrivi, sono variabili casuali che descrivono **domanda** e **variabilità** del flusso.

- **Servizio (service) e tempo di servizio (service time)**: il **servizio** è il lavoro effettivo svolto sul job (analisi, redazione, verifica, chiamate, implementazione, ecc.).
Il **tempo di servizio** (spesso indicato con $S$) è il tempo “a mani sopra” necessario per completare quel job *una volta iniziato*.

- **Attesa (waiting) e tempo di attesa (waiting time)**: l’**attesa** è il tempo in cui il job è nel sistema ma **non viene lavorato** (in coda, in attesa di un input, in attesa di approvazione, in attesa di priorità).
Il **tempo di attesa** (spesso $W$) misura quanto il job resta fermo prima di ricevere servizio.

- **WIP — Work In Progress (lavori in corso)**: il **WIP** è il numero di job **presenti nel sistema** in un dato istante: comprende job in coda + job in lavorazione + (a seconda delle convenzioni) job “bloccati” in attesa di informazioni.
Operativamente: il WIP è un indicatore di **congestione**; se cresce troppo spesso significa che il sistema sta accumulando lavoro più velocemente di quanto riesca a smaltirlo.

- **Coda (queue)**: la **coda** è l’insieme dei job **in attesa** di essere lavorati. La coda può essere fisica (lista) o “virtuale” (mail, chat, backlog).
Nei modelli di coda, la dinamica nasce dall’interazione tra **arrivi** e **capacità di servizio**.

- **Capacità (capacity) e server**: la **capacità** è quanta lavorazione il sistema può erogare per unità di tempo.
Un **server** è una risorsa che può “servire” job: una persona, un team, una macchina, uno sportello, un software, un laboratorio.

- **Throughput (tasso di completamento / produttività di uscita / flusso di attraversamento o flusso di consegne)**: il **throughput** è la velocità con cui il sistema **completa** job (job/ora, job/giorno), cioè il **flusso di consegne**.
È diverso dalla “velocità individuale”: è una proprietà del sistema complessivo (regole, WIP, vincoli, blocchi, capacità).

- **Lead time (tempo di attraversamento)**: il **lead time** è il tempo totale dal momento in cui il job **entra** nel sistema al momento in cui **esce completato**.
In termini di grandezze: spesso vale
$$\text{Lead time} = \text{Waiting time} + \text{Service time}.$$

- **Classi / dimensioni / taglie dei job (S/M/L/XL…)**: le **classi** (o **taglie**) sono una discretizzazione utile per rappresentare job che non sono tutti uguali: differiscono per complessità, volume di lavoro, rischio, urgenza, impatto economico o reputazionale.
Per “taglia/dimensione” non intendiamo solo quanto dura in media, ma un mix operativo di **sforzo**, **complessità**, **rischio** e **incertezza** (quante dipendenze, quante informazioni mancanti, quanta probabilità di rilavorazioni).  
In tal caso le classi possono assumere valori come $\{S,M,L,XL\}$ (etichette qualitative come per le taglie degli indumenti) oppure come $\{1,3,8,20\}$ (etichette quantitative in **punti** definiti sotto).
È comune usare scale **non lineari** (ad esempio progressioni “a salti”) perché, aumentando la taglia, cresce anche l’incertezza della stima: il lavoro grande non è solo più lungo, è anche più imprevedibile (ad esempio in molte pratiche di stima si usano sequenze prendendo spunto dalla serie di Fibonacci: una scala crescente non lineare per riflettere l’aumento dell’incertezza). Infatti, in questi contesti diventa difficile fare delle "misure" precise, è più facile confrontare tra loro i job in termini ordinali (primo, secondo, terzo...) ovvero in termini di grandezza relativa o proporzionale ("job1 è il doppio/triplo/... di job2").

- **Punti (unità di misura “convenzionale” della taglia)**: i **punti** sono una unità **adimensionale** usata per stimare la “dimensione” di un job quando le ore non sono note a priori (o quando stimare ore induce falsa precisione). I “punti” sono un’unità **relativa**: non sono ore, ma una misura convenzionale che permette di confrontare lavori eterogenei e di ragionare sulla capacità del sistema senza fingere una precisione che non abbiamo.
I punti diventano utili se esiste una regola di conversione *a posteriori* o per classi, ad esempio:

  - punti $\rightarrow$ stima delle ore attese (per capacità lavorativa interna),
  - punti $\rightarrow$ valore economico atteso (per pricing o marginalità),
  - punti $\rightarrow$ rischio/attenzione (per priorità e presidio).

- **Variabilità (dispersione) e perché conta**: due sistemi con la stessa media possono comportarsi in modo molto diverso se cambia la variabilità.
Nei capitoli successivi vedremo che molte grandezze operative (attese, congestione) dipendono non solo dalla media dei tempi, ma anche da misure come varianza e secondo momento (es. $\mathbb{E}[S^2]$).

- **Utilizzazione / carico ($\rho$)**: il **carico** (o utilizzazione) $\rho$ misura quanto il sistema è “occupato” rispetto alla capacità. In molte code compare come rapporto tra domanda e capacità.
Quando $\rho$ cresce fino a saturazione (100% di utilizzazione) il sistema diventa fragile e le attese tendono a crescere rapidamente.

- **Blocco (blocked) e lavoro “in attesa di input”**: un job può essere “nel sistema” ma non lavorabile (manca un dato, risposta cliente, autorizzazione).
A seconda delle convenzioni, questi job possono essere conteggiati nel WIP o trattati separatamente: la scelta va esplicitata perché cambia interpretazioni e metriche.

- **i.i.d. (indipendenti e identicamente distribuite)**: una sequenza di variabili casuali $\{X_n\}$ si dice **i.i.d.** (*independent and identically distributed*) se:
  1. **Indipendenza**: le variabili non si influenzano tra loro (conoscere alcuni valori non cambia la distribuzione degli altri).
   In forma operativa: $X_n$ non “dipende” dai precedenti $X_1,\dots,X_{n-1}$.

  2. **Stessa distribuzione**: tutte le $X_n$ hanno la stessa legge di probabilità (stessa forma, stessa media, stessa varianza, ecc.).
   In particolare: $\mathbb{E}[X_n]$ e $\mathrm{Var}(X_n)$ sono uguali per ogni $n$ quando esistono.

  Nel contesto delle code, dire che i tempi tra arrivi $\{T_n\}$ sono i.i.d. significa assumere che ogni intervallo tra due arrivi sia generato dallo stesso meccanismo e che non ci siano dipendenze temporali (niente stagionalità, niente “arrivi a ondate”, niente autocorrelazione).


> **Nota terminologica (anticipazione ai capitoli su rework e ritardi)**  
> Nei primi modelli useremo *job* come unità che entra nel sistema a coda ed è servita dal server.  
> Nei capitoli su rework distingueremo invece tra:
>
> - **caso / iniziativa**: l’entità persistente (record/incarico/pratica/progetto), che può rientrare più volte;
>
> - **visita / iterazione**: ciascun passaggio del caso nel ciclo tecnico, cioè la vera unità che “fa coda”.
>
> Questa distinzione evita ambiguità nella notazione quando un caso genera più iterazioni.

***

# Richiami di probabilità e variabili casuali
\chaptersubtitle{(definizioni, notazione e convenzioni per i capitoli successivi)}

Questo capitolo introduce, in modo progressivo e autoconsistente, la notazione probabilistica minima necessaria per formalizzare i modelli dei capitoli successivi. L’obiettivo non è esaurire la teoria della probabilità, ma fissare **definizioni operative**, **convenzioni** e **strumenti** che useremo ripetutamente.

## Perché un richiamo di probabilità qui?

In questo testo useremo la probabilità come **linguaggio minimo** per descrivere fenomeni reali in cui c’è incertezza, variabilità e rumore: non perché “non sappiamo nulla”, ma perché **anche sapendo molto** (processo, regole, competenze) resta sempre una parte aleatoria.

L’obiettivo pratico di questo capitolo non è fare teoria astratta, ma costruire una cassetta degli attrezzi per:

- parlare di **tempi** (quanto dura un’attività, con quanta variabilità);
- parlare di **arrivi** (quante richieste arrivano in un intervallo);
- parlare di **rischi** (probabilità che accada un evento rilevante);
- preparare le basi per i modelli di **code e sistemi di lavoro** (capitoli successivi), dove *media* e *variabilità* fanno la differenza.

Quando leggi formule e simboli, tieni a mente una domanda guida: **“Che grandezza reale sto rappresentando? Un tempo? Un conteggio? Un sì/no? Un costo?”**

***

## Sistema di probabilità e interpretazione operativa

Un modello probabilistico si fonda su uno **sistema di probabilità** $(\Omega,\mathcal{F},\mathbb{P})$, dove:

- $\Omega$ è l’insieme degli esiti possibili (eventi elementari);
- $\mathcal{F}$ è una $\sigma$-algebra di sottoinsiemi di $\Omega$ (gli eventi osservabili, cioè l’insieme degli eventi di cui ha senso parlare e che possiamo osservare/contare);
- $\mathbb{P}$ è una misura di probabilità su $(\Omega,\mathcal{F})$, con $\mathbb{P}(\Omega)=1$.

Nel seguito non lavoreremo quasi mai esplicitamente con $\Omega$ e $\mathcal{F}$: ciò che ci interessa è che, una volta specificata una variabile casuale, esista una regola coerente per attribuire probabilità a insiemi di valori.
Dal punto di vista applicativo, $\mathbb{P}$ può essere pensata come una “regola di assegnazione” delle probabilità che nasce da due fonti (spesso combinate):
1) **dati storici** (osservazioni ripetute: tempi misurati, conteggi giornalieri, frequenze di eventi);
2) **modello** (assunzioni esplicite che schematizzano il fenomeno: ad esempio indipendenza, stazionarietà, o una certa forma della distribuzione).
Nei capitoli successivi useremo questa idea in modo pragmatico: quando facciamo un’ipotesi probabilistica, la useremo perché rende il problema trattabile e perché è ragionevolmente compatibile con ciò che si osserva (o con ciò che è prudente assumere in assenza di dati).

> **Interpretazione operativa**: nel contesto dei sistemi di lavoro, introdurre la probabilità non significa “rinunciare a capire”, ma riconoscere che una parte del fenomeno resta non deterministica anche quando processo e regole sono chiari.  
> In pratica, la probabilità serve a rappresentare **variabilità residua** dovuta, per esempio, a:
>
> - differenze reali tra iniziative (input, vincoli, interlocutori, qualità dei dati);
>
> - tempi di risposta di attori esterni (clienti, fornitori, enti, reparti interni);
>
> - durate di attività che *sembrano* simili ma non lo sono (dipendenze, interruzioni, rilavorazioni, priorità concorrenti).
> Questo è il punto chiave: molte prestazioni di sistema (tempi di attesa, accumuli, instabilità) dipendono non solo dalla media, ma anche dalla **dispersione** e dalla presenza di **eventi rari ma molto grandi**.

***

## Variabili casuali: definizione e notazione

Una **variabile casuale** è il modo standard con cui “trasformiamo” un esito $\omega \in \Omega$ in un numero che rappresenta una grandezza osservabile. Dire che $X$ è *misurabile* significa, in sostanza, che per insiemi di valori del tipo “$X$ cade in un certo intervallo” (o in un certo insieme) ha senso assegnare una probabilità in modo coerente. Formalmente scriviamo:

$$X:\Omega \to \mathbb{R},$$

cioè ad ogni esito $\omega\in\Omega$ associamo un valore reale $X(\omega)$. Questa impostazione è volutamente generale: la stessa notazione copre variabili che rappresentano tempi, conteggi, costi, indicatori di stato, ecc.

Nel seguito useremo variabili casuali per rappresentare grandezze come:

- durata di un’attività;
- tempi tra arrivi;
- tempo di permanenza in uno stato.

Noterai che alcune grandezze sono naturalmente **continue** (ad esempio una durata: 2.3 ore, 2.31 ore, ecc.), mentre altre sono naturalmente **discrete** (ad esempio un numero di richieste: 0, 1, 2, ...). Questa distinzione non è un dettaglio: determina se descriviamo la distribuzione con una **massa di probabilità** (PMF) oppure con una **densità** (PDF), come vedremo in seguito.


### Convenzioni di notazione

- Variabili casuali: lettere maiuscole $X,Y,S,T,\dots$
- Valori realizzati (osservazioni): lettere minuscole $x,y,s,t,\dots$
- Probabilità: $\mathbb{P}(\cdot)$
- Valore atteso: $\mathbb{E}[\cdot]$
- Varianza: $\mathrm{Var}(\cdot)$

***

## Distribuzione, funzione di ripartizione e densità

### Funzione di ripartizione (CDF)

La **funzione di ripartizione** di $X$ è

$$F_X(x)=\mathbb{P}(X\le x).$$

Proprietà fondamentali:

- $F_X$ è non decrescente;
- $\lim_{x\to -\infty}F_X(x)=0$, $\lim_{x\to +\infty}F_X(x)=1$;
- è continua da destra.

La CDF è il modo più generale di descrivere la distribuzione di $X$.

>Dal punto di vista applicativo, $F_X(x)=\mathbb{P}(X\le x)$ risponde alla domanda: **“con quale probabilità la grandezza è al più pari a $x$?”**.  
Se $X$ rappresenta un **tempo di completamento**, allora $F_X(3\,\text{giorni})=0.8$ si legge: “la probabilità che il completamento avvenga **entro 3 giorni** è pari a 0.8”, cioè “nell’80% dei casi finisco entro 3 giorni”.
>Questa lettura è particolarmente utile perché collega direttamente la distribuzione a misure decisionali come i **quantili** (o percentili). Per esempio, il **95-esimo percentile** (o quantile 0.95) è definito come la soglia temporale $t_{0.95}$ tale che $F_X(t_{0.95})=0.95,$ e si interpreta come: “nel 95% dei casi finisco **entro $t_{0.95}$**”. Nei capitoli successivi questo linguaggio diventa naturale quando parliamo di affidabilità delle consegne e di tempi di attesa.

***

### Variabili discrete (PMF)

Se $X$ assume valori in un insieme numerabile $\{x_1,x_2,\dots\}$, definiamo la **funzione di massa di probabilità** (PMF):

$$p_X(x_i)=\mathbb{P}(X=x_i).$$

Valgono:
$$ p_X(x_i)\ge 0,\qquad \sum_i p_X(x_i)=1.$$

> **Esempio tipico (classi di taglia e “punti”)**: in molti contesti conviene rappresentare la “dimensione” di un job non come un tempo esatto, ma come una **classe discreta**, ad esempio come $\{S,M,L,XL,...\}$.

***

### Variabili continue (PDF)

Se $X$ è continua, spesso esiste una **densità di probabilità** (PDF) $f_X(x)$ tale che:

$$\mathbb{P}(a\le X\le b)=\int_a^b f_X(x)\,dx.$$

In tal caso:
$$F_X(x)=\int_{-\infty}^x f_X(u)\,du,\qquad f_X(x)\ge 0,\qquad \int_{-\infty}^{+\infty} f_X(x)\,dx=1.$$

È importante tenere a mente che $f_X(x)$ (la densità) **non è** una probabilità: è una funzione che “distribuisce” probabilità lungo l’asse dei valori. La probabilità vera e propria si ottiene sempre integrando su un intervallo, cioè come **area** sotto la curva.  
Dal punto di vista dimensionale, se $X$ è un tempo misurato in ore, allora $f_X(x)$ ha unità $[1/\text{ora}]$: questa è un’ulteriore ragione per cui non va interpretata come probabilità puntuale.

>**Nota concettuale**: per variabili continue, $\mathbb{P}(X=x)=0$ per ogni singolo valore $x$: la probabilità è associata a intervalli, non a punti.
>
> **Esempio di lettura corretta**: se $X$ è la durata di un’attività, ha senso chiedere $\mathbb{P}(2\le X\le 3)$ (probabilità di finire tra 2 e 3 ore), mentre $\mathbb{P}(X=2.5)$ è sempre zero in un modello continuo. La precisione “al minuto” si rappresenta con intervalli più stretti, non con probabilità puntuali.

***

## Valore atteso: definizione e significato

Il **valore atteso** (o media) di $X$, se esiste, è definito come:

- caso discreto:
$$\mathbb{E}[X]=\sum_i x_i\,p_X(x_i).$$

- caso continuo:
$$\mathbb{E}[X]=\int_{-\infty}^{+\infty} x\,f_X(x)\,dx.$$

In applicazioni reali, $\mathbb{E}[X]$ è un parametro del modello: spesso non lo conosciamo a priori e lo stimiamo da osservazioni ripetute. Se misuriamo $n$ realizzazioni $x_1,\dots,x_n$ di $X$, la quantità

$$\bar{x}=\frac{1}{n}\sum_{j=1}^n x_j$$

è la **media campionaria**: è il modo più diretto (e spesso sufficiente, in prima approssimazione) per “ancorare” il modello ai dati. Nei capitoli successivi useremo questa idea in modo pragmatico: non ci interessa la media come numero isolato, ma come ingrediente di modelli che dipendono anche dalla variabilità.

>**Interpretazione operativa**: $\mathbb{E}[X]$ rappresenta una misura “media” della variabile, ma va interpretata con cautela:
>
>- nei sistemi ad alta variabilità, la media può essere poco rappresentativa;
>
>- distribuzioni con coda lunga possono avere media dominata da eventi rari ma grandi.
>
>Una conseguenza pratica è che la media può non coincidere con ciò che “succede di solito”. In distribuzioni asimmetriche o con coda lunga, può accadere che molti casi siano sotto la media e pochi casi molto grandi la spingano verso l’alto. Per questo, accanto a $\mathbb{E}[X]$ è spesso utile ragionare in termini di **quantili** (ad esempio “entro quale tempo finisco nel 90% dei casi”), che si leggono direttamente dalla CDF introdotta sopra.

***

## Momenti: secondo momento, varianza e deviazione standard

### Momento di ordine $k$

Il **momento** di ordine $k$ è:

$$\mathbb{E}[X^k],$$

quando esiste (finito).

In particolare:

- primo momento: $\mathbb{E}[X]$
- secondo momento: $\mathbb{E}[X^2]$

### Varianza

La **varianza** misura la dispersione attorno alla media:
$$\mathrm{Var}(X)=\mathbb{E}\big[(X-\mathbb{E}[X])^2\big].$$

Espansione utile:
$$\mathrm{Var}(X)=\mathbb{E}[X^2]-\big(\mathbb{E}[X]\big)^2.$$

La **deviazione standard** è:
$$\sigma_X=\sqrt{\mathrm{Var}(X)}.$$

### Coefficiente di variazione

Definiamo il **coefficiente di variazione**:
$$C_X=\frac{\sigma_X}{\mathbb{E}[X]},$$
quando $\mathbb{E}[X]>0$. È una misura adimensionale della variabilità relativa.

Il vantaggio di $C_X$ è che permette di confrontare variabilità su scale diverse: ad esempio una deviazione standard di 2 ore ha significati diversi se la media è 3 ore oppure 30 ore.  

- Se $C_X$ è **piccolo**, i valori sono relativamente concentrati attorno alla media (fenomeno più “regolare”).
- Se $C_X$ è **grande**, la dispersione è elevata (fenomeno più “irregolare”), e nei capitoli successivi questo si traduce tipicamente in maggiore difficoltà di previsione e maggiore tendenza a generare code.

>**Nota metodologica**: nei capitoli successivi, il secondo momento $\mathbb{E}[X^2]$ sarà cruciale: in molti modelli di coda, la variabilità non entra solo tramite la varianza, ma attraverso $\mathbb{E}[X^2]$.
>
>Per intuizione, $\mathbb{E}[X^2]$ “pesa” molto di più i valori grandi rispetto a $\mathbb{E}[X]$. Questo è rilevante nei sistemi di lavoro perché proprio i casi grandi (o molto lunghi) sono quelli che tendono a generare accumulo: occupano risorse a lungo, bloccano dipendenze e amplificano gli effetti a catena.  
Quando si modellano code e attese, la sensibilità agli eventi grandi emerge naturalmente: non basta sapere “quanto dura in media”, serve sapere quanto spesso compaiono durate molto lunghe e quanto incidono sul sistema.

***

## Covarianza, correlazione e indipendenza

### Covarianza

Per due variabili casuali $X$ e $Y$, la **covarianza** è:

$$\mathrm{Cov}(X,Y)=\mathbb{E}\big[(X-\mathbb{E}[X])(Y-\mathbb{E}[Y])\big].$$


### Correlazione

La **correlazione** (di Pearson) è:

$$\mathrm{Corr}(X,Y)=\frac{\mathrm{Cov}(X,Y)}{\sigma_X\sigma_Y},$$

quando $\sigma_X,\sigma_Y>0$. Vale $\mathrm{Corr}(X,Y)\in[-1,1]$.

### Indipendenza

$X$ e $Y$ sono **indipendenti** se, per ogni $a,b$:

$$\mathbb{P}(X\le a, Y\le b)=\mathbb{P}(X\le a)\,\mathbb{P}(Y\le b).$$

Nel continuo, ciò equivale (quando esistono densità) a:

$$f_{X,Y}(x,y)=f_X(x)f_Y(y).$$

>**Osservazione**: indipendenza implica covarianza nulla, ma non viceversa.
>
>Operativamente, assumere indipendenza significa dire che conoscere $Y$ non mi dà alcuna informazione utile su $X$ (e viceversa). Nei sistemi reali questa assunzione va trattata con prudenza: molte dipendenze nascono da **cause comuni** (ad esempio carico di lavoro, qualità degli input, disponibilità di una stessa risorsa critica).  
Per questo la correlazione è un segnale utile: quando $\mathrm{Corr}(X,Y)$ è lontano da zero, spesso indica che esiste un fattore condiviso o una dipendenza di processo. Viceversa, $\mathrm{Corr}(X,Y)\approx 0$ non garantisce indipendenza: può darsi che la relazione sia non lineare o che le dipendenze compaiano solo in certe condizioni operative.

***

## Condizionamento e legge dell’attesa iterata

### Probabilità condizionata

Per eventi $A,B$ con $\mathbb{P}(B)>0$:

$$\mathbb{P}(A\mid B)=\frac{\mathbb{P}(A\cap B)}{\mathbb{P}(B)}.$$

> **Come leggere la notazione**  
>
> - $A$ e $B$ sono **eventi** (affermazioni del tipo “succede qualcosa”), cioè insiemi di esiti possibili.
>
> - $\mathbb{P}(A)$ si legge “probabilità che accada $A$”.
>
> - $A\cap B$ (intersezione) si legge “accadono **sia** $A$ **sia** $B$”, cioè “$A$ e $B$ insieme”.
>
> - $\mathbb{P}(A\mid B)$ si legge “probabilità di $A$ **sapendo che** $B$ è avvenuto” (o: “condizionata a $B$”).
>
> - La condizione $\mathbb{P}(B)>0$ serve solo a evitare divisioni per zero: ha senso parlare di $\mathbb{P}(A\mid B)$ solo se $B$ può effettivamente accadere.
>
> **Interpretazione intuitiva**  
> $\mathbb{P}(A\mid B)$ è la probabilità di $A$ quando restringiamo l’attenzione **solo ai casi in cui $B$ è vero**.  
> La formula
> $$\mathbb{P}(A\mid B)=\frac{\mathbb{P}(A\cap B)}{\mathbb{P}(B)}$$
> dice esattamente questo: prendiamo la probabilità dei casi in cui accadono sia $A$ che $B$ e la “normalizziamo” per la probabilità totale dei casi in cui accade $B$.

### Valore atteso condizionato

Il **valore atteso condizionato** $\mathbb{E}[X\mid Y]$ rappresenta la media di $X$ una volta noto $Y$.

Dal punto di vista interpretativo, condizionare significa aggiornare la previsione quando si dispone di informazione aggiuntiva. Per esempio, se $X$ è la durata di una lavorazione e $Y$ è una classe di taglia (S/M/L/XL), allora $\mathbb{E}[X\mid Y=\text{L}]$ rappresenta il tempo medio **sapendo** che il job è di taglia L.  
Questa idea è utile perché molte decisioni operative (priorità, assegnazioni, limiti, politiche di servizio) dipendono non solo dalla durata “in assoluto”, ma dalla durata attesa *dato* un certo contesto.

### Legge dell’attesa totale

Una relazione fondamentale è:

$$\mathbb{E}[X]=\mathbb{E}\big[\mathbb{E}[X\mid Y]\big].$$

>**Lettura operativa (media pesata delle medie)**
>
>La relazione sopra si interpreta come: **prima** si calcola la media di $X$ *all’interno di ciascun caso* determinato da $Y$, **poi** si fa la media (complessiva) di queste medie, pesandole per quanto spesso ciascun caso di $Y$ si verifica.
>
>Se $Y$ è una variabile **discreta** che può assumere i valori $\{y_1,y_2,\dots\}$, la legge dell’attesa totale si scrive esplicitamente come una **somma di medie pesate**:
$$\mathbb{E}[X] \;=\; \sum_j \mathbb{E}[X\mid Y=y_j]\;\mathbb{P}(Y=y_j).$$
>
>**Esempio (classi di taglia S/M/L)**  
>
>Sia $Y\in\{S,M,L\}$ la “taglia” di un job (ad es. stimata in base a complessità/peso/rilevanza) e sia $X$ la durata (in ore) del job. Supponiamo di avere:
>
>- $\mathbb{P}(Y=S)=0.5,\;\mathbb{P}(Y=M)=0.3,\;\mathbb{P}(Y=L)=0.2$;
>
>- $\mathbb{E}[X\mid Y=S]=1$ ora, $\mathbb{E}[X\mid Y=M]=3$ ore, $\mathbb{E}[X\mid Y=L]=10$ ore.
>
>Allora la durata media complessiva risulta:
$$\mathbb{E}[X] = 1\cdot 0.5 + 3\cdot 0.3 + 10\cdot 0.2 = 3.4\ \text{ore}.$$
>
>Questo esempio mostra un punto pratico importante nei sistemi di lavoro: anche se i job “grandi” (classe $L$) sono meno frequenti (cioè il 20% dei casi), possono contribuire in modo rilevante alla media complessiva delle durate.

***

## Variabili non negative e tempi

Nei modelli dei capitoli successivi, molte variabili rappresentano **tempi** o **durate**. In tal caso:

- $X\ge 0$ quasi sicuramente;
- la distribuzione è supportata su $[0,\infty)$.

### Unità di misura (convenzione)

Useremo una variabile di tempo generica $t$ con unità $[t]$ (es. ore, giorni, settimane). Le variabili dovranno essere dimensionalmente coerenti:

- una durata $S$ ha unità $[t]$;
- un tasso $\lambda$ ha unità $[1/t]$;
- quantità adimensionali come $\rho$ devono risultare prive di unità.

In modo analogo, se $X$ è un tempo con unità $[t]$, allora una densità $f_X(x)$ ha unità $[1/t]$: questo aiuta a ricordare che la densità non è una probabilità puntuale, ma una funzione che deve essere integrata su un intervallo per produrre una probabilità.

***

## Sommatorie e integrali: convenzioni operative

- variabili discrete $\rightarrow$ sommatorie $\sum$
- variabili continue $\rightarrow$ integrali $\int$

In entrambi i casi, la struttura concettuale è la stessa; cambia la rappresentazione matematica.

Ad esempio, la definizione di valore atteso ha la stessa logica in entrambi i casi: nel discreto “sommiamo” i valori pesati dalle probabilità, nel continuo “integriamo” i valori pesati dalla densità. Questo parallelismo torna continuamente nei capitoli successivi: le formule cambiano aspetto, ma la lettura concettuale resta invariata.

***

## Sintesi del capitolo

Abbiamo introdotto:

- variabili casuali e distribuzioni;
- funzione di ripartizione, massa/densità;
- valore atteso, varianza e momenti;
- indipendenza e condizionamento;
- convenzioni dimensionali e notazione.

Questi strumenti sono sufficienti per formalizzare i primi modelli di sistema a coda, che verranno introdotti nel Capitolo 3.

***

# Sistemi a coda: definizioni fondamentali
\chaptersubtitle{(costruzione progressiva del modello di base e delle grandezze osservabili)}

Questo capitolo introduce in modo graduale il linguaggio e le grandezze fondamentali dei **sistemi a coda**. L’obiettivo non è ancora risolvere modelli specifici, ma costruire con rigore:

- che cosa intendiamo per “sistema” e per “coda” in senso matematico;
- quali variabili descrivono il comportamento nel tempo;
- quali grandezze medie useremo come metriche;
- quali condizioni elementari sono necessarie perché il sistema sia “stabile”.

Nel §1.7 abbiamo fissato il vocabolario minimo (job, arrivi, servizio, attesa, WIP, lead time, flusso di consegne/throughput).  
Qui facciamo il passaggio “matematico”: per ogni concetto operativo introdurremo **una variabile osservabile nel tempo**.

Un’idea guida utile è questa:

- il glossario parla “per oggetti” (job, richieste, attività);
- la teoria delle code parla “per processi nel tempo” (quanti job sono dentro *adesso*, quanto tempo aspettano *in media*, quanto spesso arrivano *nel lungo periodo*).

Nel resto del capitolo useremo quindi definizioni che si possono misurare con log (timestamp di arrivo, inizio servizio, fine servizio), anche quando la coda è “invisibile” (email, backlog, ticket, richieste in chat).

***

## Perché una “coda” è un modello generale dei sistemi di lavoro

Un sistema di lavoro, in forma astratta, può essere visto come un meccanismo che:

1. riceve richieste di lavoro nel tempo (arrivi);
2. le mette in attesa se non possono essere servite subito (coda);
3. le elabora usando risorse limitate (servizio);
4. produce un’uscita (completamento della lavorazione).

Questa struttura è generale: descrive sia code fisiche (sportello, traffico, call center) sia code “invisibili” (backlog e WIP). Molte proprietà qualitative (congestione, saturazione, esplosione dei tempi) dipendono da poche variabili aggregate.

> **Convenzione (WIP nel modello)**  
> Nel §1.7 abbiamo introdotto WIP come “lavori presenti nel sistema”. Qui fissiamo la convenzione matematica che useremo nei modelli a coda:  
>
> - $Q(t)$ = numero di job **in attesa** al tempo $t$;
>
> - $B(t)$ = indicatore di server occupato (caso a un server): $B(t)=1$ se c’è un job in lavorazione, $0$ altrimenti;
>
> - $N(t)$ = numero di job **nel sistema** al tempo $t$, quindi
>   $$N(t)=Q(t)+B(t).$$  
> In questo testo useremo **WIP come sinonimo operativo di $N(t)$** (job in attesa + job in lavorazione). Se introdurremo stati aggiuntivi (es. “bloccati”), specificheremo come vengono contati.

***

## Componenti di un sistema a coda: definizioni

### Job (unità di lavoro)

Chiamiamo **job** l’unità elementare di lavoro che attraversa il sistema. Nel contesto applicativo, un job può corrispondere a:

- una pratica;
- un progetto;
- una richiesta di integrazione;
- un “pacchetto” di attività coerenti.

In questa fase il job è un’entità astratta: ciò che conta è che per ogni job possiamo definire un tempo di servizio.

### Server (risorsa di servizio)

Chiamiamo **server** la risorsa che esegue il lavoro. Può essere:

- una persona;
- un team (trattato come un server aggregato);
- una macchina.

Per semplicità inizieremo dal caso di **un solo server**.

### Coda (buffer)

La **coda** è il luogo (fisico o logico) in cui i job attendono di essere serviti quando il server è occupato.

### Disciplina di servizio

Assumeremo **FIFO** (First-In-First-Out) come disciplina standard. In pratica chi arriva prima viene servito prima (come una fila allo sportello).

***

## Processo di arrivo: tempi tra arrivi e tasso $\lambda$

### Tempi di arrivo

Indichiamo con:

$$A_1, A_2, A_3,\dots$$

gli istanti di arrivo dei job.

Definiamo i **tempi tra arrivi**:
$$T_n = A_{n} - A_{n-1}, \quad n\ge 2.$$

Quando vogliamo ragionare in termini di “job tipico”, useremo $T$ per indicare una variabile casuale rappresentativa dei tempi tra arrivi (ad esempio nel caso in cui $\{T_n\}$ siano i.i.d. con media finita). In generale, ciò che ci interessa è che esista un **tasso medio di ingresso nel lungo periodo**.

### Tasso medio di arrivo $\lambda$

Quando i tempi tra arrivi hanno media finita $\mathbb{E}[T]$, definiamo:

$$\lambda = \frac{1}{\mathbb{E}[T]}.$$

Interpretazione: $\lambda$ è il numero medio di arrivi per unità di tempo, quindi $[\lambda]=[1/t]$.

> **Nota tecnica (definizione di $\lambda$ nel lungo periodo)**  
> La relazione $\lambda = 1/\mathbb{E}[T]$ è naturale quando i tempi tra arrivi $T_n$ sono descritti da un meccanismo “regolare” (ad esempio un processo di rinnovo con $T_n$ i.i.d. e media finita).  
> In generale, l’idea che useremo è: $\lambda$ misura il **tasso medio di ingresso** nel lungo periodo, cioè “quanti job arrivano per unità di tempo, in media”.


>**Nota importante.** Nei sistemi reali i job possono avere dimensioni diverse: distingueremo sempre tra tasso di arrivo di job (conteggio, ad esempio numero di lavori che arrivano in un mese) e carico di lavoro (che dipende dalla durata del servizio, vale a dire il tempo che serve per svolgere il singolo job).

***

## Tempo di servizio: variabile $S$ e tasso $\mu$

### Definizione

Il **tempo di servizio** è la quantità di tempo durante la quale il server è impegnato su un job.

Indichiamo con $S$ una variabile casuale che rappresenta il tempo di servizio di un job tipico, quindi $[S]=[t]$.

### Tasso di servizio $\mu$

Se $\mathbb{E}[S]$ esiste e $\mathbb{E}[S]>0$, definiamo:

$$\mu = \frac{1}{\mathbb{E}[S]}.$$

Interpretazione: $\mu$ è la capacità media del server in job per unità di tempo, quindi $[\mu]=[1/t]$.

***

## Stato del sistema nel tempo: $N(t)$, $Q(t)$, $B(t)$

### Numero nel sistema $N(t)$

Definiamo:

$$N(t) = \text{numero di job presenti nel sistema al tempo } t.$$

“Nel sistema” significa in coda + in servizio.

### Numero in coda $Q(t)$

Definiamo:

$$Q(t) = \text{numero di job in attesa al tempo } t.$$

### Stato del server $B(t)$

Definiamo:
$$B(t) = \begin{cases} 1 & \text{se il server è occupato al tempo } t,\\ 0 & \text{se il server è libero al tempo } t. \end{cases} $$

Nel caso di un solo server:

$$N(t) = Q(t) + B(t).$$

> **Nota pratica (job “bloccati” e WIP reale)**  
> In molti sistemi di lavoro esistono job che sono “dentro” il processo ma **temporaneamente non lavorabili** (manca un input, attesa cliente/ente, attesa decisione interna).  
> Dal punto di vista modellistico hai due scelte, entrambe legittime, ma vanno dichiarate:
>
> 1. **Contarli nel WIP**: allora $N(t)$ include anche questi job, perché occupano attenzione, memoria e coordinamento (anche se non consumano tempo di servizio in quell’istante).
>
> 2. **Trattarli come stato separato**: introduci una variabile $H(t)$ (hold/blocked) e scrivi, ad esempio,
>    $$N(t)=Q(t)+B(t)+H(t).$$  
>
> In questo capitolo, per semplicità, lavoriamo con $N(t)=Q(t)+B(t)$. Se più avanti servirà distinguere “in attesa lavorabile” e “in attesa per blocco”, introdurremo esplicitamente $H(t)$.

***

## Tempi caratteristici di un job: attesa e permanenza

Per il job $n$-esimo che arriva al tempo $A_n$:

- $W_n$ è il **tempo nel sistema** (detto anche ‘tempo di attraversamento’);
- $W_{q,n}$ è il **tempo di attesa in coda**;
- $S_n$ è il tempo di servizio effettivo.

Vale l’identità:

$$W_n = W_{q,n} + S_n.$$

Questa relazione è definitoria.

> **Interpretazione operativa (timestamp)**  
> Per rendere le grandezze osservabili, è utile introdurre due istanti aggiuntivi:
>
> - $V_n$ = istante di **inizio servizio** del job $n$ (quando il server comincia davvero a lavorarci);
>
> - $D_n$ = istante di **fine servizio / completamento** del job $n$.
>
> Allora:
> $$W_{q,n} = V_n - A_n,\qquad S_n = D_n - V_n,\qquad W_n = D_n - A_n.$$
>
> Questa scrittura “a differenze di timestamp” chiarisce perché $W_n = W_{q,n}+S_n$ non è un’ipotesi: è una decomposizione definitoria.

***

## Utilizzazione $\rho$: carico medio del server

Definiamo:

$$\rho = \lambda \, \mathbb{E}[S]=\lambda/\mu.$$

Controllo dimensionale: $\lambda$ ha unità $[1/t]$, $\mathbb{E}[S]$ ha unità $[t]$, $\mu$ ha unità $[1/t]$, quindi $\rho$ è adimensionale.

Interpretazione: $\rho$ rappresenta la frazione media di tempo in cui il server è occupato (in condizioni stazionarie). Questa interpretazione verrà formalizzata nel prossimo capitolo.

***

## Stabilità: quando la coda non “esplode”

### Idea intuitiva

Se in media entrano job più velocemente di quanto il server riesca a servirli, la coda cresce senza limite.

### Condizione di stabilità (necessaria)

Una condizione necessaria per la stabilità è:

$$\rho < 1.$$

Nel Capitolo 4 vedremo che nel modello più semplice questa condizione è anche sufficiente per l’esistenza del regime stazionario.

***

## Grandezze medie: cosa vogliamo misurare

Definiamo:

- numero medio nel sistema: $$L = \mathbb{E}[N]$$

- numero medio in coda: $$L_q = \mathbb{E}[Q]$$

- tempo medio nel sistema: $$W = \mathbb{E}[W_n]$$

- tempo medio di attesa: $$W_q = \mathbb{E}[W_{q,n}]$$

***

## La legge di Little: enunciato e interpretazione (senza dimostrazione)

La **legge di Little** afferma che, in un sistema stabile sotto ipotesi molto generali:

$$L = \lambda W,\qquad L_q = \lambda W_q.$$

Interpretazione fisica: come per un serbatoio, il “contenuto medio” è pari al flusso in ingresso moltiplicato per il tempo medio di permanenza.

> **Lettura operativa (WIP = flusso di consegne × lead time)**  
> In regime stabile, il tasso medio di uscita (flusso di consegne) coincide con il tasso medio di ingresso:  
> $$\lambda_{\text{out}}=\lambda_{\text{in}}=\lambda.$$
> Se interpretiamo $L$ come WIP medio (job mediamente “dentro”), e $W$ come lead time medio, Little dice:
>
> - se aumenti il WIP medio senza aumentare la capacità, il lead time medio tende a crescere;
>
> - se vuoi ridurre il lead time, spesso la leva più rapida è ridurre il WIP (limitare quante cose sono aperte contemporaneamente).
>
> La legge è “agnostica” rispetto alle distribuzioni: richiede coerenza di perimetro (che cosa conto “dentro” il sistema) e stabilità (medie ben definite).

***

## Sintesi e preparazione ai capitoli successivi

Abbiamo costruito:

- arrivi ($A_n$, $T_n$, $\lambda$),
- servizio ($S$, $\mu$),
- stato ($N(t)$, $Q(t)$, $B(t)$),
- tempi ($W$, $W_q$),
- utilizzo ($\rho$),
- stabilità intuitiva ($\rho<1$),
- legge di Little (enunciato).

Il passo successivo è introdurre un primo modello completamente specificato (M/M/1) per calcolare esplicitamente distribuzioni e valori medi.

***

# Il modello M/M/1
\chaptersubtitle{(primo modello completo di sistema a coda)}

Il modello **M/M/1** è il punto di partenza classico della teoria delle code. Il suo valore non sta nel realismo, ma nel fatto che consente di:

- formalizzare completamente le grandezze del Capitolo 3;
- introdurre il concetto di **regime stazionario**;
- derivare esplicitamente distribuzioni e valori medi;
- comprendere quali ipotesi semplificative rendono il problema trattabile.

Nei capitoli successivi mostreremo perché queste ipotesi sono spesso non realistiche, ma è essenziale partire da questo modello per capire cosa accade quando vengono rimosse.

***

## Significato della notazione M/M/1

La notazione **M/M/1** riassume le ipotesi fondamentali del modello:

- prima **M**: gli **arrivi** sono Markoviani nel senso “memoryless”; in pratica ciò equivale ad assumere un **processo di Poisson** di intensità $\lambda$ per il numero di arrivi, oppure (in modo equivalente) **tempi tra arrivi esponenziali**;
- seconda **M**: i **tempi di servizio** sono esponenziali con parametro $\mu$ (anche qui vale l’assenza di memoria);
- **1**: esiste **un solo server**.

Queste ipotesi hanno una conseguenza cruciale: il processo del numero di job nel sistema $N(t)$ è un **processo di Markov a tempo continuo** (CTMC) con transizioni elementari di tipo **nascita–morte**.  
Il valore del modello M/M/1 non è la fedeltà al reale, ma il fatto che la dinamica risulti completamente trattabile e permetta di derivare in forma chiusa distribuzioni e valori medi.


***

## Processo di arrivo Markoviano (prima “M”)

### Arrivi come processo di Poisson

Dire che il processo di arrivo è Markoviano significa assumere che gli arrivi siano descritti da un **processo di Poisson** con parametro $\lambda$.

La **distribuzione di Poisson** spiega la probabilità che un certo numero di eventi (es. chiamate, guasti) si verifichi in un intervallo fisso di tempo o spazio, conoscendo il loro tasso medio ($\lambda$), assumendo eventi indipendenti e rari. Ad esempio, immaginiamo di sapere che in media arrivano 4 clienti all'ora ($\lambda=4$). La distribuzione di Poisson ti aiuta a calcolare la probabilità che in quell'ora arrivino esattamente 0, 1, 2, 3, 4, 5... clienti.

Per evitare ambiguità con $N(t)$ (numero nel sistema), indichiamo con $N_A(t)$ il **numero di arrivi** nell’intervallo $[0,t]$.

Un processo di Poisson modella eventi che avvengono “a caso” con intensità costante. La proprietà chiave è che il numero di arrivi dipende solo dalla durata dell’intervallo.

$$\mathbb{P}(N_A(t)=k)=\frac{(\lambda t)^k}{k!}e^{-\lambda t}.$$

*Per approfondimenti si rimanda agli Allegati A1–A12.*

### Tempi tra arrivi esponenziali

Nel processo di Poisson, i tempi tra arrivi sono esponenziali:

$$f_T(t)=\lambda e^{-\lambda t}, \quad t\ge 0,$$

con media $\mathbb{E}[T]=1/\lambda$.

La distribuzione esponenziale è **senza memoria**: la probabilità di osservare un arrivo nei prossimi $\Delta t$ non dipende da quanto si è già atteso.

> **Box — Assenza di memoria (richiamo)**
>
> L’ipotesi esponenziale implica che “il tempo residuo non dipende da quanto si è già atteso”.  
> Per dettagli e dimostrazione si rimanda agli Allegati A1–A12.

***

## Tempo di servizio Markoviano (seconda “M”)

### Servizio esponenziale

Il tempo di servizio $S$ è esponenziale con parametro $\mu$:

$$f_S(s)=\mu e^{-\mu s}, \quad s\ge 0.$$

Valgono:
$$\mathbb{E}[S]=\frac{1}{\mu}, \qquad\mathrm{Var}(S)=\frac{1}{\mu^2}.$$

Anche qui vale l’assenza di memoria vista sopra.

***

## Stato del sistema come processo di Markov

### Stato $N(t)$

Nel modello M/M/1 lo stato del sistema è completamente descritto da:

$$N(t)=\text{numero di job nel sistema al tempo } t.$$

Questo è possibile perché:

- gli arrivi dipendono solo da $\lambda$;
- le partenze dipendono solo da $\mu$ e dallo stato attuale.

Il processo $\{N(t)\}_{t\ge 0}$ è un processo di Markov a tempo continuo.

‘A tempo continuo’ significa che i cambiamenti di stato possono avvenire in qualunque istante (non solo a passi discreti), e sono governati da tassi.

### Transizioni di stato: nascita–morte

Due tipi di eventi:

- **nascita**: arrivo di un job

  $$n \to n+1 \quad \text{con tasso } \lambda$$

- **morte**: completamento del servizio

  $$n \to n-1 \quad \text{con tasso } \mu \quad (n\ge 1)$$

Questo tipo di processo è detto **catena di nascita–morte**.

***

## Distribuzione stazionaria

### Regime stazionario

Se il sistema è stabile, esiste una distribuzione $\{\pi_n\}$ tale che:

$$\pi_n = \lim_{t\to\infty}\mathbb{P}(N(t)=n).$$

Questa è la distribuzione stazionaria del numero di job nel sistema.

### Idea di bilancio (spiegazione intuitiva)

In stazionarietà, la probabilità di trovarsi nello stato $n$ non cambia nel tempo. Quindi, in media, gli “ingressi” nello stato $n$ devono compensare le “uscite” dallo stato $n$.

### Forma della soluzione

Si ottiene:

$$\pi_n = (1-\rho)\rho^n, \quad n=0,1,2,\dots$$

dove
$$\rho = \frac{\lambda}{\mu}.$$

Poiché $\mu = 1/\mathbb{E}[S]$, la definizione è coerente con quanto anticipato nel Capitolo 3:

$$\rho=\frac{\lambda}{\mu}=\lambda \mathbb{E}[S].$$

Questa distribuzione è ben definita se e solo se:

$$\rho < 1.$$

*Per approfondimenti si rimanda agli Allegati A1–A12.*

***

## Interpretazione dell’utilizzazione $\rho$

Nel modello M/M/1:

- $\rho$ coincide con la probabilità che il server sia occupato;
- $1-\rho$ coincide con la probabilità che il server sia libero.

Infatti:

$$\mathbb{P}(B=1)=1-\pi_0=\rho.$$

***

## Valori medi nel sistema M/M/1

### Numero medio di job

Usando la distribuzione geometrica:

$$L = \mathbb{E}[N] = \sum_{n=0}^{\infty} n\pi_n = \frac{\rho}{1-\rho}.$$

### Tempo medio nel sistema

Richiamiamo che $W=\mathbb{E}[W_n]$.

Applicando la legge di Little (Cap. 3, §3.10):

$$W = \frac{L}{\lambda} = \frac{1}{\mu-\lambda}.$$

### Attesa media in coda

Poiché $\mathbb{E}[S]=1/\mu$:
$$W_q = W - \mathbb{E}[S] = \frac{\rho}{\mu-\lambda}.$$

*Per approfondimenti si rimanda agli Allegati A1–A12.*

***

## Comportamento vicino alla saturazione

Quando $\rho \to 1^{-}$:

- $L = \frac{\rho}{1-\rho} \to \infty$;
- $W = \frac{L}{\lambda} \to \infty$.

Questo mostra un fatto strutturale: anche un sistema “quasi saturo” può avere tempi di attraversamento enormi. Piccoli aumenti del carico possono produrre grandi aumenti dei tempi.

***

## Perché il modello M/M/1 è insufficiente

Il modello M/M/1 assume:

- job omogenei;
- servizio esponenziale (varianza relativa fissata);
- assenza di memoria nei tempi.

Nei sistemi di lavoro reali:

- i job hanno dimensioni molto diverse;
- la variabilità è spesso superiore a quella esponenziale;
- esistono retroazioni e ritardi esterni.

Il M/M/1 tende quindi a sottostimare congestione e attese quando la variabilità reale è elevata.

***

## Ruolo del M/M/1 nella trattazione

Il modello M/M/1 è volutamente semplice: serve a isolare l’effetto della saturazione e introdurre gli strumenti formali. Nei capitoli successivi reintrodurremo gradualmente gli elementi di complessità del lavoro reale (variabilità elevata, classi di job, retroazioni e ritardi).

***

## Sintesi del capitolo

In questo capitolo abbiamo:

- costruito un modello completo di sistema a coda;
- definito regime stazionario e distribuzione stazionaria;
- derivato $L$, $W$, $W_q$;
- evidenziato il ruolo centrale di $\rho$ e della condizione $\rho<1$;
- mostrato il comportamento divergente vicino alla saturazione.

Nel Capitolo 5 introdurremo il modello **M/G/1**, in cui il tempo di servizio è generale. Qui emergerà il ruolo del secondo momento, che è cruciale per descrivere sistemi con job di taglia molto diversa.


***

# Il modello M/G/1 e la variabilità
\chaptersubtitle{(perché compare il secondo momento e perché la “coda lunga” domina)}

Nel Capitolo 4 abbiamo studiato il modello M/M/1, nel quale sia gli arrivi sia i tempi di servizio sono esponenziali. Quel modello è prezioso perché chiuso e trasparente, ma ha un limite strutturale: impone una variabilità del servizio “fissata” (il coefficiente di variazione del servizio è pari a 1).

Nei sistemi di lavoro reali, invece, i tempi di servizio sono raramente esponenziali: spesso sono asimmetrici, con varianza elevata e talvolta coda lunga. Il modello **M/G/1** serve proprio a questo: mantenere gli arrivi “semplici” (Poisson) ma rendere il servizio generale.

L’obiettivo del capitolo è duplice:

1. capire cosa cambia quando il servizio non è esponenziale;
2. arrivare, in modo graduale, al risultato fondamentale: nel tempo medio di attesa compare il **secondo momento** del tempo di servizio.

***

## Notazione e ipotesi del modello M/G/1

La sigla **M/G/1** significa:

- **M** (arrivi Markoviani): arrivi secondo processo di Poisson con intensità $\lambda$;
- **G** (servizio Generale): tempo di servizio $S$ con distribuzione generale;
- **1**: un solo server.

### Arrivi: processo di Poisson

Gli arrivi sono come nel M/M/1: se $N_A(t)$ è il numero di arrivi in $[0,t]$, allora:

$$\mathbb{P}(N_A(t)=k)=\frac{(\lambda t)^k}{k!}e^{-\lambda t}.$$

I tempi tra arrivi sono esponenziali con media $1/\lambda$.

### Servizio: distribuzione generale

Il tempo di servizio $S$ è una variabile casuale non negativa con distribuzione qualsiasi (purché esistano i momenti necessari). Indichiamo:

- media: $\mathbb{E}[S]$
- secondo momento: $\mathbb{E}[S^2]$
- varianza: $\mathrm{Var}(S)=\mathbb{E}[S^2]-(\mathbb{E}[S])^2$

Definiamo come prima:

- tasso medio di servizio: $\mu = 1/\mathbb{E}[S]$
- utilizzazione:

$$\rho=\lambda \mathbb{E}[S]=\frac{\lambda}{\mu}.$$

Anche in questo modello la condizione di stabilità è: $\rho<1$.

***

## Obiettivo: calcolare $W$, $W_q$ e capire il ruolo della variabilità

Come nel Capitolo 4, distinguiamo:

- $W$ = tempo medio nel sistema
- $W_q$ = tempo medio di attesa in coda

Vale sempre l’identità (definizione):

$$W = W_q + \mathbb{E}[S].$$

Quindi è sufficiente trovare $W_q$.

Nel M/M/1 ottenevamo $W_q$ in forma semplice perché il servizio esponenziale ha proprietà di assenza di memoria. Nel M/G/1 questa proprietà manca: il “passato” del job in servizio influenza ciò che resta da attendere.

Questo porta naturalmente a introdurre un concetto cruciale: il **tempo residuo**.

***

## Il concetto di tempo residuo: definizione e interpretazione

### Disegno mentale (concetto, non formula)

Immagina un job che sta occupando il server. Tu arrivi “a caso” durante la sua lavorazione. Quello che ti interessa non è quanto dura in totale quel job, ma **quanto tempo manca alla fine**.

Questa quantità è il **tempo residuo**.

> **Esempi pratici**:
>
>- se vai dal medico e arrivi quando qualcuno è già dentro, non ti interessa la durata totale della visita, ma quanto manca alla fine e arriva il tuo turno;
>
>- alla cassa del supermercato, se arrivi e c’è un cliente con carrello enorme, è molto più probabile che tu lo trovi con lo scontrino ancora da chiudere, facendoti aspettare.

### Definizione formale

Definiamo $R$ come:

> $R$ = tempo residuo del job in servizio visto da un arrivo casuale.


        tempo --→
        |------------------- job in servizio (durata totale s) -------------------|
                                                ^ arrivo casuale (istante di osservazione)
                                                |----------- residuo R -----------|


Se l’arrivo cade “a caso” durante l’esecuzione di un job di durata totale $s$, allora il punto di arrivo è (idealmente) uniforme lungo l’intervallo di servizio e il residuo $R$ è la parte rimanente fino al completamento.

Questa definizione è concettualmente semplice, ma contiene un dettaglio importante: “visto da un arrivo casuale” significa che noi campioniamo il sistema in un istante che non è scelto “per job”, ma “nel tempo”.

Questa differenza porta al fenomeno del **size-bias**: i job lunghi si osservano più spesso perché occupano il server più a lungo.

***

## Perché i job lunghi si “vedono” più spesso: size-bias

### Caso discreto (esempio didattico)

Supponiamo che esistano solo quattro tipi di job con durate:

- job A: $s_1=1$
- job B: $s_2=2$
- job C: $s_3=4$
- job D: $s_4=7$

e che, “per job”, ogni tipo abbia la stessa probabilità $1/4$.

Se noi scegliessimo un job a caso “dalla lista”, tutte le durate sarebbero equiprobabili.

Ma qui non scegliamo un job: scegliamo un **istante nel tempo**. E un job di durata 7 occupa il server per un intervallo 7 volte più lungo di un job di durata 1. Quindi è 7 volte più probabile che un arrivo cada “dentro” quel job.

Formalmente, la probabilità di osservare il job $i$ mentre è in servizio è proporzionale a:

$$s_i \cdot \mathbb{P}(\text{job } i).$$

Quindi la probabilità di “vedere” il job $i$ è:

$$\mathbb{P}(\text{vedere } i)=\frac{s_i \, \mathbb{P}(i)}{\sum_j s_j \, \mathbb{P}(j)}.$$

Qui $\mathbb{P}(i)=1/4$ per tutti i job. Quindi:
$$\sum_j s_j\,\mathbb{P}(j)=\frac{1+2+4+7}{4}=3.5.$$
Perciò:
$$\mathbb{P}(\text{vedere } i)=\frac{s_i\cdot (1/4)}{3.5}=\frac{s_i}{14}.$$

Ne segue:

- job A ($s=1$): $\mathbb{P}(\text{vedere A}) = 1/14 \approx 0.071$
- job B ($s=2$): $\mathbb{P}(\text{vedere B}) = 2/14 \approx 0.143$
- job C ($s=4$): $\mathbb{P}(\text{vedere C}) = 4/14 \approx 0.286$
- job D ($s=7$): $\mathbb{P}(\text{vedere D}) = 7/14 = 0.5$

Quindi, pur avendo la stessa probabilità “per job” (1/4), il job D è osservato metà delle volte nel campionamento “nel tempo”.
Questo è il cuore del meccanismo: i job lunghi pesano di più nel campionamento temporale.

### Passaggio al continuo

Nel continuo, se $S$ ha densità $f_S(s)$, la densità “vista nel tempo” (size-biased) è proporzionale a $s f_S(s)$ e si normalizza dividendo per $\mathbb{E}[S]$:

$$f_{S^*}(s) = \frac{s f_S(s)}{\mathbb{E}[S]}, \quad s\ge 0.$$

Qui $S^*$ è la durata del job che “vedo” quando arrivo casualmente.

***

## Calcolo di $\mathbb{E}[R]$: perché compare il secondo momento

Vogliamo calcolare il valore atteso del tempo residuo $R$.

### Residuo condizionato

Se sto osservando un job di durata totale $s$, e arrivo in un istante uniforme durante la sua esecuzione, allora il tempo residuo è uniforme su $[0,s]$.

Quindi:

- condizionando a $S^*=s$, si ha

$$\mathbb{E}[R \mid S^*=s] = \frac{s}{2}.$$

Ora togliamo il condizionamento:

$$\mathbb{E}[R] = \mathbb{E}\left[\mathbb{E}[R \mid S^*]\right] = \mathbb{E}\left[\frac{S^*}{2}\right] = \frac{1}{2}\mathbb{E}[S^*].$$

Quindi tutto si riduce a calcolare $\mathbb{E}[S^*]$.

### Media della size-biased

Per definizione:

$$\mathbb{E}[S^*] = \int_0^\infty s \, f_{S^*}(s)\, ds = \int_0^\infty s \cdot \frac{s f_S(s)}{\mathbb{E}[S]} \, ds = \frac{1}{\mathbb{E}[S]} \int_0^\infty s^2 f_S(s)\, ds.$$

Ma $\int_0^\infty s^2 f_S(s)\, ds = \mathbb{E}[S^2]$. Quindi:

$$\mathbb{E}[S^*] = \frac{\mathbb{E}[S^2]}{\mathbb{E}[S]}.$$

Sostituendo in $\mathbb{E}[R]$:

$$\mathbb{E}[R] = \frac{1}{2}\frac{\mathbb{E}[S^2]}{\mathbb{E}[S]}.$$

**Risultato fondamentale:**

$$\mathbb{E}[R] = \frac{\mathbb{E}[S^2]}{2\mathbb{E}[S]}.$$

Questo spiega in modo preciso perché compare il **secondo momento**: non è un artificio, è una conseguenza del campionamento temporale che sovrapesa i job lunghi.

***

## Come si collega il tempo residuo all’attesa in coda

Ora passiamo al cuore operativo: come entra $R$ nell’attesa?

Quando un job arriva e trova il server occupato, deve almeno attendere:

1. il **tempo residuo** del job in servizio;
2. più il servizio dei job già in coda davanti a lui.

Per collegare queste quantità al valore medio $W_q$ servono due idee chiave.

### Un arrivo “vede” le medie del sistema: proprietà PASTA

Nel modello M/G/1 gli arrivi sono Poisson. Vale quindi la proprietà **PASTA** (*Poisson Arrivals See Time Averages*):  
gli arrivi osservano il sistema “come se” campionassero un istante casuale nel tempo. In particolare, in regime stazionario:

- la probabilità che un arrivo trovi il server occupato coincide con la frazione di tempo in cui il server è occupato,
- cioè con l’utilizzazione $\rho$.

Quindi:

$$\mathbb{P}(\text{arrivo trova server occupato})=\rho.$$

### Decomposizione concettuale dell’attesa

In media, l’attesa in coda può essere vista come somma di due contributi:

- un contributo dovuto al **residuo** del job eventualmente in servizio al momento dell’arrivo;
- un contributo dovuto al lavoro già in coda.

Il primo contributo è presente solo quando l’arrivo trova il server occupato; quindi pesa come:

$$\text{(contributo residuo medio)} = \rho\,\mathbb{E}[R].$$

Il secondo contributo richiede una relazione tra:

- numero medio di job in coda,
- e tempi medi di servizio.

Qui entrano le relazioni di equilibrio (flussi in regime stazionario) e la legge di Little, che permettono di chiudere il conto e ottenere la formula di Pollaczek–Khinchine.

Nel seguito useremo direttamente il risultato classico, ma è importante notare che l’ingresso del secondo momento $\mathbb{E}[S^2]$ nasce già dal primo pezzo: $\mathbb{E}[R]$ dipende da $\mathbb{E}[S^2]$ (size-bias + campionamento temporale).

***

## Formula di Pollaczek–Khinchine (PK): enunciato e interpretazione

### Enunciato (M/G/1)

Per un sistema M/G/1 stabile ($\rho<1$), il tempo medio di attesa in coda è:

$$W_q = \frac{\lambda \mathbb{E}[S^2]}{2(1-\rho)}.$$

e quindi il tempo medio nel sistema è:

$$W = W_q + \mathbb{E}[S] = \frac{\lambda \mathbb{E}[S^2]}{2(1-\rho)} + \mathbb{E}[S].$$

In termini di varianza (sostituendo $\mathbb{E}[S^2]=\mathrm{Var}(S)+(\mathbb{E}[S])^2$):

$$W_q = \frac{\lambda(\mathrm{Var}(S)+(\mathbb{E}[S])^2)}{2(1-\rho)}.$$

*Per approfondimenti si rimanda agli Allegati A1–A12.*

### Interpretazione fisica

La formula PK separa in modo netto tre fattori:

1. **Carico**: entra tramite $\rho=\lambda \mathbb{E}[S]$ e il termine $1/(1-\rho)$
   Quando $\rho$ si avvicina a 1, tutto esplode (come nel M/M/1).

2. **Variabilità**: entra tramite $\mathbb{E}[S^2]$
   Un aumento della varianza aumenta $\mathbb{E}[S^2]$ e quindi aumenta $W_q$ anche a parità di media.

3. **Intensità di arrivo**: entra tramite $\lambda$
   Più arrivi, più attesa.

Questa è la ragione per cui in sistemi con job molto diversi (S/M/L/XXL) la coda lunga domina: anche pochi job enormi aumentano molto $\mathbb{E}[S^2]$.

***

## Coefficiente di variazione e forma “normalizzata” della PK

Per rendere la formula più “leggibile” in termini di variabilità relativa, introduciamo il quadrato del coefficiente di variazione del servizio:

$$C_S^2 = (\frac{\sigma_S}{\mathbb{E}[S]})^2 = \frac{\mathrm{Var}(S)}{(\mathbb{E}[S])^2}.$$

Allora:

$$\mathbb{E}[S^2] = (\mathbb{E}[S])^2(1+C_S^2).$$

Sostituendo nella PK:

$$W_q = \frac{\lambda (\mathbb{E}[S])^2(1+C_S^2)}{2(1-\rho)}.$$

Poiché $\rho=\lambda \mathbb{E}[S]$, otteniamo:

$$W_q = \frac{\rho}{1-\rho}\cdot \frac{\mathbb{E}[S]}{2}(1+C_S^2).$$

Questa forma è didatticamente utile perché mostra:

- la parte $\rho/(1-\rho)$ è il “moltiplicatore di congestione”;
- la variabilità compare come fattore $(1+C_S^2)$.

Nel caso esponenziale (M/M/1), vale $C_S^2=1$ e infatti si recupera il comportamento coerente con il Capitolo 4.

***

## Esempio numerico guidato: stesso carico, variabilità diversa

Vogliamo mostrare un fatto cruciale: a parità di $\rho$ e $\mathbb{E}[S]$, la sola variabilità può cambiare drasticamente l’attesa.

Supponiamo:

- $\mathbb{E}[S]=1$ (unità di tempo)
- $\rho=0.8$

Allora $\lambda=\rho/\mathbb{E}[S]=0.8$.

Usiamo la formula:

$$W_q = \frac{\rho}{1-\rho}\cdot \frac{\mathbb{E}[S]}{2}(1+C_S^2).$$

Calcoliamo $\rho/(1-\rho)=0.8/0.2=4$ e $\mathbb{E}[S]/2=0.5$. Quindi:

$$W_q = 4 \cdot 0.5 \cdot (1+C_S^2) = 2(1+C_S^2).$$

- Se $C_S^2=0$ (servizio quasi deterministico): $W_q=2$
- Se $C_S^2=1$ (esponenziale): $W_q=4$
- Se $C_S^2=4$ (variabilità molto alta): $W_q=10$

Stesso carico, stessa media del servizio, ma attese completamente diverse.

***

## Perché questo capitolo è “il ponte” verso il reale

Il M/G/1 ci dice che due sistemi possono avere:

- stesso $\lambda$
- stesso $\mathbb{E}[S]$
- stesso $\rho$

eppure avere prestazioni diversissime se cambiano i secondi momenti.

Questa è una lezione fondamentale per i sistemi di lavoro reali: la congestione non dipende solo dal “quanto lavoro entra” o da “quante persone ho”, ma dalla combinazione tra carico e variabilità.

In particolare, se una piccola parte dei job è molto grande (pochi XXL), questi job possono dominare $\mathbb{E}[S^2]$ e quindi dominare il tempo medio di attesa di tutti gli altri job.

***

## Sintesi del capitolo

Abbiamo:

1. definito il modello M/G/1: arrivi Poisson, servizio generale;
2. introdotto il concetto di tempo residuo $R$;
3. spiegato e formalizzato il size-bias;
4. dimostrato il risultato fondamentale:

$$\mathbb{E}[R] = \frac{\mathbb{E}[S^2]}{2\mathbb{E}[S]};$$

5. enunciato la formula di Pollaczek–Khinchine:

$$W_q = \frac{\lambda \mathbb{E}[S^2]}{2(1-\rho)};$$

6. interpretato il ruolo della variabilità tramite $C_S^2$ e un esempio numerico.

Nei capitoli successivi useremo questi risultati per modellare in modo più aderente i sistemi di lavoro reali: classi di job (S/M/L/XXL), rework come retroazione, ritardi e memoria.

***

# Rework: modelli con retroazione
\chaptersubtitle{(quando il lavoro “rientra” e perché la stabilità cambia natura)}

Nei Capitoli 4–5 è stato studiato un flusso “a senso unico”: i job arrivano, vengono serviti, escono dal sistema. Questo è utile per comprendere saturazione e variabilità, ma non descrive una caratteristica centrale di molti sistemi di lavoro reali: **il rework**.

In numerosi contesti professionali e tecnico-amministrativi, una quota rilevante delle iniziative consegnate:

- rientra per richieste di integrazione dell’ente,
- rientra per chiarimenti richiesti dal cliente,
- rientra per revisioni interne.

In termini di sistemi dinamici, questa struttura è una **retroazione**: una parte dell’uscita del sistema alimenta un nuovo ingresso.

Questo capitolo introduce un modello progressivo del rework come retroazione, con due obiettivi:

1. comprendere come la retroazione modifica i tassi effettivi e la stabilità;
2. definire metriche e grandezze utili minimizzando la necessità di tracciamenti manuali.

Nei capitoli precedenti un *job* indicava l’unità che entra nel sistema a coda ed è servita dal server.  
Con il rework, però, la stessa iniziativa può rientrare più volte: se non distinguiamo i livelli, $\lambda$, $S$, $W$ diventano ambigui.

Da qui in avanti useremo quindi due concetti distinti:

- **Caso / iniziativa** (record): l’entità “persistente” richiesta dall’esterno (una pratica, un progetto, un’istanza). Un caso può rientrare più volte.
- **Visita / iterazione**: ciascun passaggio del caso nel ciclo tecnico (una lavorazione che fa coda, viene servita, e produce una consegna di iterazione).

I modelli di coda (M/M/1, M/G/1) descrivono la dinamica delle **visite**.  
Il rework descrive come i **casi** generano un numero aleatorio di visite nel tempo.

Convenzioni di tasso:

- $\lambda_0$ = tasso di arrivo dei **casi** (nuove iniziative);
- $\lambda$ = tasso complessivo delle **visite** che il sistema deve servire (prime iterazioni + rework).

Scomposizione utile (sul piano delle **visite**):

$$\lambda(t)=\lambda_0(t)+\lambda_{\text{rw}}(t).$$

Qui $\lambda_0(t)$ rappresenta il flusso di **prime visite** associate ai nuovi casi (se ogni caso, entrando nel ciclo tecnico, genera una prima iterazione), mentre $\lambda_{\text{rw}}(t)$ è il flusso delle **visite di rework** innescate dalle consegne precedenti.

Convenzioni sui tempi:

- $S$ = tempo di servizio per **visita** (tempo “a mani sopra” per un’iterazione);
- $W$ = lead time per **visita** (attesa + servizio nel ciclo tecnico di quella iterazione).

Quando serva, introdurremo tempi “per caso” (sommando le visite associate), ma la fisica della congestione (Little, PK) si applica alle visite.

***

## Definizione operativa di rework (coerente con il processo)

**Definizione generale.** Si definisce *rework* qualunque lavoro aggiuntivo generato da un job già consegnato, che richieda nuove attività sullo stesso “caso” (medesimo record o record logicamente collegato).

Per ridurre ambiguità, è utile distinguere tre famiglie:

1. **Rework interno**
   Correzioni/integrazioni richieste da standard di qualità interni (review tecnica, revisione commerciale post-tecnica, controlli di conformità).

2. **Rework da cliente**
   Cambiamenti di scopo, chiarimenti, modifiche progettuali richieste dal cliente.

3. **Rework da ente**
   Richieste di integrazione, chiarimenti procedurali, interpretazioni divergenti, prescrizioni.

Nel modello matematico di base, tutti e tre sono "retroazioni”; operativamente conviene distinguerli perché presentano leve di controllo differenti (interno maggiormente controllabile, esterno spesso meno controllabile).

***

## Perché la retroazione cambia il problema: intuizione fisica

In un sistema senza rework, il flusso è:

$$\text{Arrivi esterni} \rightarrow \text{Servizio} \rightarrow \text{Uscite}.$$

Con rework, una parte delle uscite ritorna come nuovi ingressi:

$$\text{Arrivi esterni} \rightarrow \text{Servizio} \rightarrow \text{Uscite} \rightarrow \text{Rientri} \rightarrow \text{Servizio} \rightarrow \dots$$

Questa struttura ha una conseguenza fondamentale:

> anche se il flusso esterno è moderato, il flusso *totale* che il sistema deve servire può risultare molto più alto, perché include cicli ripetuti.

In analogia con sistemi di controllo, la retroazione può:

- stabilizzare (retroazione di smorzamento),
- oppure amplificare e generare congestione (retroazione autoalimentata).

Nei sistemi di lavoro, il rework costituisce spesso una retroazione “autoalimentata” in senso dinamico: backlog e ritardi aumentano la probabilità di nuovi rientri, che incrementano ulteriormente nuovi backlog e ritardi.

***

## Un modello minimo: rework come probabilità di ritorno

### Variabile chiave: probabilità di rientro

Introduciamo un parametro semplice:

- $p$ = probabilità che un job, dopo una consegna, generi almeno un ciclo di rework (un “rientro”).

Il parametro $p$ può essere stimato empiricamente come frazione di iniziative consegnate che vengono riaperte almeno una volta entro una finestra temporale definita.

### Numero di visite al sistema: modello geometrico

Si supponga che, dopo ogni consegna, un caso:

- esca definitivamente con probabilità $1-p$,
- rientri (una nuova visita) con probabilità $p$.

Allora il numero totale di “visite” al sistema (prima lavorazione + rientri) è una variabile geometrica:

- $K$ = numero di volte in cui il job viene lavorato.

Si ha:

$$\mathbb{P}(K=k) = (1-p)\,p^{k-1}, \quad k=1,2,3,\dots$$

e il valore atteso è:

$$\mathbb{E}[K] = \frac{1}{1-p}.$$

Interpretazione: la retroazione introduce un **fattore moltiplicativo** del carico. Anche valori elevati ma plausibili di $p$ possono produrre moltiplicatori molto grandi.

*Per approfondimenti si rimanda agli Allegati A1–A12.*

***

## Tasso di arrivo effettivo con retroazione

### Arrivi esterni e arrivi totali

Definiamo:

- $\lambda_0$ = tasso di arrivi esterni (nuove iniziative),
- $\lambda$ = tasso totale di “job-visite” che il sistema deve servire (arrivi esterni + rientri).

Se ogni arrivo esterno genera in media $\mathbb{E}[K]$ visite, allora:

$$\lambda = \lambda_0 \,\mathbb{E}[K] = \frac{\lambda_0}{1-p}.$$

**Esempio numerico esplicativo.**  
Si consideri un sistema con $\lambda_0 = 10$ iniziative/mese.

- Se $p=0.5$, allora $\lambda = 10/(1-0.5)=20$ visite/mese.
- Se $p=0.8$, allora $\lambda = 10/(1-0.8)=50$ visite/mese.
- Se $p=0.9$, allora $\lambda = 10/(1-0.9)=100$ visite/mese.

L’incremento è non lineare: al crescere di $p$, il carico effettivo può crescere rapidamente.

### Utilizzazione effettiva

Dal Capitolo 3:

$$\rho = \lambda \mathbb{E}[S].$$

Con retroazione:

$$\rho_{\text{eff}} = \frac{\lambda_0}{1-p}\,\mathbb{E}[S].$$

Condizione di stabilità:

$$\rho_{\text{eff}} < 1.$$

La retroazione rende la condizione di stabilità più severa: a parità di $\lambda_0$ e $\mathbb{E}[S]$, l’aumento di $p$ può spingere $\rho_{\text{eff}}$ oltre la soglia critica.

***

## Rework non è solo sì/no: numero di rientri e distribuzione

Il modello geometrico è un primo passo, ma in molti sistemi reali i rientri hanno una struttura tipica: quasi tutti i casi rientrano almeno una volta, ma solo una parte rientra più volte.

Per rappresentare questo comportamento con pochi parametri, si separano:

1. probabilità di almeno un rientro;
2. numero di rientri condizionato all’aver già rientrato almeno una volta.

### Modello a due parametri

Definiamo:

- $p_1 = \mathbb{P}(\text{almeno un rientro})$,
- $r = \mathbb{E}[\text{numero di rientri} \mid \text{almeno un rientro}]$.

Allora il numero medio di visite è:

$$\mathbb{E}[K] = 1 + p_1\,r.$$

**Esempio numerico esplicativo (realistico).**  
Si considerino valori:

- $p_1=0.9$ (il 90% rientra almeno una volta),
- $r=2$ (tra quelli che rientrano, mediamente due rientri).

Allora:

$$\mathbb{E}[K]=1+0.9\cdot 2 = 2.8,$$

e dunque:

$$\lambda \approx 2.8\,\lambda_0.$$

Questo modello è spesso più robusto del geometrico puro quando i rientri sono frequenti ma in numero medio contenuto.

***

## Impatto del rework sul tempo di servizio: “visite” non identiche

Nel Capitolo 5 (M/G/1) è stato mostrato che la variabilità del servizio entra nelle attese tramite $\mathbb{E}[S^2]$. Con retroazione, occorre considerare anche che le visite associate a rework possono avere distribuzioni di servizio diverse dalla prima visita.

Un modello minimale a due classi introduce:

- $S_0$ = tempo di servizio della prima lavorazione,
- $S_1$ = tempo di servizio di una visita di rework.

Allora il tempo medio di servizio associato a un’iniziativa esterna (comprensivo dei rientri attesi) è:

$$\mathbb{E}[S_{\text{tot}}] = \mathbb{E}[S_0] + p_1\,r\,\mathbb{E}[S_1].$$

Se si desidera stimare anche l’effetto sulle attese, occorre analizzare come la combinazione di $S_0$ e $S_1$ modifica i momenti (in particolare $\mathbb{E}[S^2]$). In questa fase è sufficiente fissare il concetto: la retroazione aumenta il carico e può aumentare la variabilità complessiva.

***

## Rework e legge di Little: perché cresce il WIP

Richiamiamo la legge di Little:

$$L = \lambda W.$$

Se la retroazione aumenta $\lambda$ (tasso totale di lavoro che circola), allora, a parità di $W$, aumenta $L$. In pratica, però, l’aumento di $\lambda$ spinge in alto anche $\rho$, e quindi aumenta $W_q$ (Capitolo 5). Ne risulta un circuito dinamico tipico:

1. più rework $\Rightarrow$ più $\lambda$,
2. più $\lambda$ $\Rightarrow$ più $\rho_{\text{eff}}$,
3. più $\rho$ $\Rightarrow$ più $W_q$,
4. più $W$ $\Rightarrow$ più $L$ (Little),
5. più $L$ $\Rightarrow$ maggiore probabilità di ulteriori rientri (meccanismi operativi: perdita di contesto, richieste incomplete, aggiornamenti normativi, ecc.).

Questo circuito descrive una retroazione autoalimentata: non è un problema “morale”, ma una dinamica di sistema.

***

## Leve di controllo: classificazione

In un sistema con rework, le leve possono essere distinte in:

### Leve esterne (poco controllabili)
- interpretazioni, richieste di integrazioni o chiarimenti dell’ente,
- tempi di risposta dell’ente,
- indecisione o variazioni del cliente.

### Leve interne (controllabili)
- qualità della prima consegna (riduce $p_1$ e/o $r$),
- politica di ingresso (riduce rientri per mancanza dati),
- politica di revisione interna (riduce rework interno),
- gestione del WIP (riduce $W$, interrompendo il circuito di congestione).

In termini di modello:

- ridurre $p_1$ o $r$ è molto efficace ma spesso difficile quando la causa esterna è dominante;
- ridurre $\mathbb{E}[S_1]$ e la sua varianza può essere più praticabile tramite standardizzazione e template;
- ridurre $W$ agendo sul WIP è una leva sistemica immediata.

***

## Metriche minime per misurare il rework

Per minimizzare l’inserimento manuale, le metriche dovrebbero essere ricavate da eventi naturali del flusso (cambi di stato, riaperture, consegne).

Un set minimo è:

1. **Tasso di riapertura per consegna**
   stima di $p_1$ come frazione di iniziative consegnate che vengono riaperte almeno una volta entro una finestra (es. 90 giorni).

2. **Numero medio di riaperture tra quelle che riaprono**
   stima di $r$ come numero medio di cicli addizionali condizionato all’evento di riapertura.

3. **Tempo di ciclo tecnico per iterazione**
   tempo tra “presa in carico” e “consegna” per ciascuna iterazione, misurato tramite date di passaggio.

4. **WIP medio (o proxy)**
   conteggio medio di iniziative in stati “in corso” e “in attesa” (in molti contesti lo stand-by genera comunque switching e perdita di contesto).

Questo set consente di stimare:

- il moltiplicatore del carico $\mathbb{E}[K]$,
- l’utilizzazione effettiva $\rho_{\text{eff}}$,
- e l’impatto atteso su WIP e tempi tramite Little e PK.

***

## Sintesi del capitolo

In questo capitolo è stato introdotto il rework come **retroazione** e si è mostrato che:

1. Il rework può essere modellato come ritorno probabilistico dopo una consegna.
2. Il numero medio di visite per iniziativa esterna può essere rappresentato:
   - in forma geometrica: $\mathbb{E}[K]=1/(1-p)$,
   - oppure con due parametri: $\mathbb{E}[K]=1+p_1 r$.
3. Il tasso totale effettivo diventa $\lambda=\lambda_0\mathbb{E}[K]$ e l’utilizzazione effettiva:

$$\rho_{\text{eff}}=\lambda_0\mathbb{E}[K]\mathbb{E}[S].$$

4. Aumentando $\lambda$ e $\rho$, crescono $W$ e $L$ (Little), e può instaurarsi un circuito di congestione e ulteriori rientri.
5. Le leve interne più praticabili spesso sono: qualità/politiche, riduzione della varianza dei rientri, gestione WIP.

Nel Capitolo 7 verrà introdotto il secondo elemento strutturale della realtà: **ritardi e memoria** (attese cliente/ente), che rendono il sistema non solo a retroazione, ma anche con dinamica temporale non istantanea. Qui compariranno modelli con ritardo e la formalizzazione tramite profilo di ritardo e convoluzione.

***
# Ritardi e memoria nei sistemi di lavoro
\chaptersubtitle{(attese, accumulo temporale e dinamiche non istantanee)}

Nei Capitoli 4–6 il sistema di lavoro è stato modellato come un sistema dinamico in cui gli effetti delle decisioni e degli eventi (arrivi, servizio, rework) si manifestano in modo sostanzialmente immediato. Questa ipotesi è utile per comprendere saturazione, variabilità e retroazione, ma non è ancora sufficiente a descrivere un elemento cruciale dei sistemi reali: **il ritardo**.

In molti sistemi di lavoro, infatti, una parte significativa del tempo totale non è occupata da lavoro attivo, ma da **attese**:

- attesa di dati o decisioni da parte del cliente;
- attesa di risposte o integrazioni da parte di enti;
- attesa di finestre temporali procedurali o amministrative.

Queste attese non sono semplicemente “tempi morti”: introducono **memoria** nel sistema e modificano profondamente la sua dinamica. Questo capitolo ha l’obiettivo di introdurre, con gradualità, il concetto di ritardo e di mostrare come esso possa essere formalizzato in modo coerente con i capitoli precedenti.

***

## Perché i ritardi cambiano la natura del sistema

### Sistema istantaneo vs sistema con ritardo

Un sistema **istantaneo** è un sistema in cui l’effetto di un ingresso si manifesta immediatamente sull’uscita. Nei capitoli precedenti, ad esempio:

- un arrivo aumenta immediatamente il numero di job nel sistema;
- una partenza lo diminuisce immediatamente.

Un sistema **con ritardo** è invece un sistema in cui:

- l’effetto di un evento si manifesta dopo un certo intervallo di tempo;
- il comportamento attuale dipende non solo dallo stato presente, ma anche da stati passati.

Nei sistemi di lavoro reali, il ritardo è strutturale: tra una consegna e il suo possibile rework può trascorrere un tempo lungo e variabile, durante il quale il sistema “ricorda” implicitamente il lavoro già svolto.

***

## Ritardi come attese esterne: definizione operativa

Definiamo **ritardo esterno** qualunque intervallo di tempo in cui un job:

- non richiede lavoro attivo dal server,
- ma non può essere considerato concluso,
- e può rientrare nel sistema in un momento futuro.

Esempi tipici includono:

- attesa di risposta da un ente dopo una consegna;
- attesa di chiarimenti o decisioni del cliente;
- sospensione procedurale in attesa di eventi esterni.

Dal punto di vista del sistema, questi job:

- non consumano capacità di servizio,
- ma occupano spazio cognitivo, attenzione, contesto,
- e possono generare lavoro futuro (retroazione differita).

***

## Variabile di ritardo con indicatore di rientro

Introduciamo un indicatore aleatorio:

- $I \in \{0,1\}$ = indicatore di rientro dopo una consegna,
  dove $I=1$ significa che la consegna genera almeno un rientro (rework) e $I=0$ significa nessun rientro.

Sia inoltre:

- $D$ = tempo di ritardo esterno **condizionato a $I=1$**, cioè il tempo che intercorre tra:
  - il momento di consegna,
  - e l’istante in cui si manifesta un rientro.

Formalmente, $D \mid (I=1)$ è una variabile casuale non negativa con:

- densità $f_D(\tau)$,
- media $\mathbb{E}[D]$.

**Osservazione importante.**  
Se $I=0$, il rientro non avviene e dunque il ritardo “non si realizza”: per evitare ambiguità, nel seguito useremo sempre $D$ come ritardo **condizionato all’evento di rientro**. La probabilità/intensità del rientro è invece incorporata nel fattore $\alpha$ introdotto in §7.6.

***

## Ritardo e memoria: cosa significa “memoria” in un sistema

### Memoria in senso dinamico

In un sistema dinamico, si dice che un sistema ha **memoria** quando il suo comportamento attuale dipende da ingressi passati.

Nel nostro contesto:

- una consegna avvenuta oggi può generare un rientro tra settimane o mesi;
- il carico futuro dipende quindi dal flusso passato di consegne.

Il sistema “ricorda” le consegne passate perché esse sono potenziali sorgenti di lavoro futuro.

### Confronto intuitivo

- Sistema senza memoria: solo ciò che entra ora conta.
- Sistema con memoria: ciò che è entrato in passato può tornare a influenzare il sistema.

Questa distinzione è fondamentale perché rompe l’idea di equilibrio istantaneo: anche se il flusso esterno si riduce oggi, il sistema può continuare a essere carico a causa del passato.

***

## Dal discreto al continuo: flusso di consegne nel tempo

Per formalizzare questo concetto, introduciamo una descrizione continua del flusso.

### Flusso di consegne

Sia:

- $c(t)$ = flusso di consegne nel tempo (numero di consegne per unità di tempo).

$c(t)$ rappresenta l’uscita “primaria” del sistema tecnico: ciò che viene consegnato agli attori esterni. Ha come unità di misura [job/tempo].

### Densità dei ritardi

Sia:

- $f_D(\tau)$ = densità di probabilità del ritardo $D$.

$f_D(\tau)\,d\tau$ rappresenta la probabilità che un rientro avvenga dopo un ritardo compreso tra $\tau$ e $\tau+d\tau$. Si misura in [1/tempo].

***

## Convoluzione: come il passato influenza il presente

### Idea intuitiva

Vogliamo descrivere il **flusso di rientri** (visite di rework) al tempo $t$.

Un rientro al tempo $t$ può essere generato da:

- una consegna (di iterazione) avvenuta al tempo $t-\tau$,
- seguita da un ritardo pari a $\tau$.

Per ottenere il contributo totale occorre sommare (integrare) i contributi di tutte le consegne passate, pesandoli con la probabilità che il ritardo assuma proprio quel valore.

### Definizioni coerenti

- $c(t)$ = flusso di **consegne di iterazione** (visite completate) nel tempo, misurato in [visite/tempo].
  È l’uscita del ciclo tecnico che può innescare rework.

- $\lambda_{\text{rw}}(t)$ = flusso (tasso) di **rientri** al tempo $t$, misurato in [visite/tempo].

- $D$ = tempo di ritardo esterno **condizionato al fatto che un rientro avvenga** (vedi §7.3).

- $f_D(\tau)$ = densità del ritardo condizionato, con unità [1/tempo], quindi $\int_0^{+\infty} f_D(\tau)\,d\tau = 1$.

- **Profilo di ritardo** (o *profilo dei ritardi*): è la descrizione di *quando* i rientri si manifestano dopo una consegna.
  Nel continuo è $f_D(\tau)$; nel discreto è la sua controparte $k[m]$ (massa di probabilità per intervallo temporale).

- $\alpha$ = numero medio di rientri generati **per consegna di iterazione** (intensità media di retroazione), adimensionale.
  In termini del Capitolo 6, una scelta minimale è:
  $$  \alpha = p_1\,r,$$
  dove $p_1$ è la probabilità di almeno un rientro e $r$ è il numero medio di rientri condizionato all’evento di rientro.

### Definizione matematica (convoluzione)

Il flusso di rientri $\lambda_{\text{rw}}(t)$ è dato da:

$$\lambda_{\text{rw}}(t) = \alpha \int_0^{+\infty} c(t-\tau)\, f_D(\tau)\, d\tau.$$

Questa espressione è una convoluzione tra:

- il flusso di consegne $c(t)$,
- il profilo di ritardo $f_D(\tau)$,

In altri termini: il flusso di rientro $\lambda_{\text{rw}}$ che vedo "oggi" al tempo $t$ è pari alla somma di ogni consegna $c$ avvenuta nel "passato" al tempo $(t-\tau)$ pesata con la sua **probabilità** di avvenire, che è $f_D(\tau)\,d\tau$, e scalata dal fattore $\alpha$ che rappresenta **quanto** rework viene mediamente generato dalle consegne (in figura si riporta un esempio grafico).


![Simulazione rientri con profilo di ritardo](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnYAAAHWCAIAAAB1wlPdAAAQAElEQVR4AexdB5wUxfLu3b3M3ZGjgEeUDAqKiASRrD4xIgaEh/gXRUXEgAEw+xQDvIeiKGJCUFQwIKgoKJIEREWQfOR0wB13u5d3/19P7a3Lhb0NM7szs7W/uqGnp7u6+uumv6nq2Vmriz+MACPACDACjAAjoAECVsEfRoARYAQYAUaAEdAAAabYYEHleowAI8AIMAKMgE8EmGJ9wsMXGQFGgBFgBBiBYBFgig0WOa4XLAJcjxFgBBiBKEGAKTZKBpq7yQgwAowAIxBuBJhiw404t8cIBIsA12MEGAGDIcAUa7ABY3MZAUaAEWAEjIIAU6xRRortZAQYgWAR4HqMQIQQMCTFOp3OAwcOZGVlneYPI8AIMAKMACMQIQRAQyAjUFJFDG5Iij106FCjRo2qVatWlT+MACPACDACmiHAin0jABoCGYGSTEWxKSkp6M/+/ftxB8HCCDACjAAjwAhEBAHQEMiIKAmJsmJIL9ZisaAnqfxhBBgBRoARYAQiigDIyGKRlISEl7iThqRYt+38DyPACDACjAAjoGMEmGJ1PDhsGiPACDACjICREWCKDXj0uAIjwAgwAowAI+APAkyx/qDEZRgBRqBCBIqLi3P5wwiYGgFM8gr/A/i8wBTrEx6+qCYCrMtsCLhcrgMHDvz11187+MMImBoBTHJMdUz4QP8PM8UGihiXZwQYATcCBw8ePHnyZL169Zo1a9aCP4yASRHA9MYkx1THhHdPfb//YYr1GyouyAhECgFdtovQGRYdLD116tSpUqVKIn8YAZMigOmNSY6pjgmPaR/Qf0em2IDg4sKMACPgRqCgoAAprD44sjACpkeApjpNe/87yxTrP1ZckhFgBEojYLXqeg0pbS6fMwLBIhDcVOf/HsHizfUYAUZA9wi8/fbb/fv3L9fMjIwMRP8OHDhQ7lXOZARUQYApVhUYWQkjwAjoDoG8vLzHH3988uTJZNmIESOGDBlCaRxr1ao1fPhwz1XksHghwEl1ENCWYn/66acrrriiQYMGFotl4cKFFZm8fPny8847Lz4+vnnz5nPmzKmoGOczAowAI+A/AgsWLEhNTe3evXtFVUaOHPnhhx+ePHmyogKczwiEiIC2FGu32zt27DhjxgwfVu7Zs+eyyy675JJLNm3aNG7cuNtuu23p0qU+yvMlRoARYAS8EXA6nS+88AJu0HGb3rhx42eeeYauzps3D7f4lJ4yZcq77767aNEi3O5Dli9fjvy2bdvCAfj888+RLiu//PJL7969k5KSqlevPmDAgFOnTqFMfn7+PffcgwhzQkLCxRdf/OuvvyITAoVQu2zZsi5duqDKRRddtG3bNuRDfv/9d6xvKSkp4PvOnTuvX78emZCVK1f26NEjMTGxUaNG0InVEpmQw4cPY0lEfpMmTebOnZuWlvbqq68iH4Im3nrrrauuugpNtGjR4osvvkAmyebNmwcNGpScnFy3bt1bbrkFYXDK52O4ETizPW0pFkP+9NNPY0Kc2egZZzNnzsRMeumll1q3bj127Nhrr732lVdeOaMEnzACjAAjUDECEydOfP755xET3rJlCzgJHENlwWEgPEpPmDDh+uuvHzhwIAgMAgqk/AsuuODnn3+mtPcRd/yXXnppmzZtVq9eDT2gavq2xoMPPvjpp5++++67GzduBKmDer2d4EcffRRLGUg0Jibm3//+Nym86aabGjZsCDLesGHDww8/HBsbi/xdu3bBmGuuueaPP/6YP38+msDqh3wIwteHDh0CZ6OhN99889ixY8j0yBNPPIGOoNbgwYOhmVrPzMzs06fPueeei6aXLFly9OhRlPFU4UQEEdCWYv3pGGZw3759PSUxZZHjOfUkcPN42uvjyeeEgRA4lJk748edWw6dNpDNbKo/CLhcLkdBkSqSlVtwPDsvO6/Qow3KfdiQnZ09bdo0eLG33nprs2bN4FkiEobyYJ2srCw4qUhD4N7BL4SbW0/5xMXFIROCAnv37kWilEAh6Pm1115DHA7OLvgPe7dwNF9//fUXX3wRzgPYd9asWdD59ttve+rCge7VqxcugUpXrVqFzWBc2rdvH5a4Vq1awe+87rrroBCZzz33HAgScTtkgu+nT5/+3nvvofzff//9/fffQ3PXrl2xfQafNTc3F+U9MmLEiGHDhoHdn3322ZycnHXr1uHS//73P/ArctAKErNnz/7xxx+3b9+OSyyRRSDyFHvkyBHPXSewQBpMWmpWIR8z0vPr84irICfswg2GhAAWyhHvrHtx6bYb3lyd6ZBfqQxJHVfWEwK5hcVtJi1VRTo+8d35zyxrP+VbjzYo99HXrVu34v4bHmepMrSGIJxbKr/UKTjS4XCUysQpebFIeAtcz8LCwu4lm7vwR+EEwwBPmQ4dOlC6fv36SJADOn78eLA+WPb555+HBuRDED2eM2cOiJ8ErgXC3dg1Q3gZHjDIFWUgoFKEqZHwiKeJKlWqIPJMTUAbOJVU4QiiRXlPW0izRAqByFOsnz1HLAj3pCT79+/3sxYX0w8Cq3ef2H40B/acziv6ZvMRJFgYgdARAEeWq6RmzZrYuaQN1HILUCYCrbVr16a097Eitd5lyqZBupSJppEAa+I4ZcqUv/76C9urP/zwAxxc2vqFA/p///d/IHIScOSOHTvghaO8b/E0gWJohZqANoSySRUdoa1nz54owxJZBCJPsQjbYOfAgwLSuDUrO78R4UG+RzzlOWEABBQTl287rvwrD99tOSr/4T+zIJAYa9vy5IDQZfXDfZZP6E2y9pE+pBDKfeCEQCuWi2XLlpUqg1Aw+Ay7s5585NB+qicHic2bNyOyikQpgbNYVicoEEp++eUXKgyPFjusaIVOfRxbtmx53333ffvtt1dfffU777yDkvBTYRucVG+B8nPOOaeoqOi3335DGcjOnTsrvUtAMWgDi6elpXlrg5uLSyyRRSDyFNutWzfvqfzdd98hJ7KgcOtaILA+XX41Yni3s6F80/5MxI2RYDEHAnCnkuJiQhRQaYzNkhhnq1ElDsdYmy1J0QnlPlBCKPihhx568MEHsZe5a9euNWvWeDZHEX1duXKlpy4Y6I8//ti2bVtGRgbYEfkIEW/YsKF/ee+mQNgM9HnnnXeiCvZHsQWLWiCtMWPGPPDAA0uWLAFBjh49GhpGjRoFVRUJ4tXYx12+fDl2fMHN0Nm6dWsUfuihh7BZi0twOuFxLlq0CGnkI8aLkPLtt9+OTVYQLRK4gfCNAGrdddddcMexRwv9AGHp0qUjR44sez+BkixhRkBbikX4AhMIgl5hmwGJffv2IY3pO3z4cCQgd9xxx+7du/E/BPP4tdde+/jjj3G7h3wWMyFQ7HT9pTzldFPXs2NtlpP2ggOnzniIw0ydVbEvUaXK6RIQdDkpzoZjISaNy4VEpfL444/ff//9kyZNAnsNHTqUtidRC+S3ePHirKwspCFgRPiIXbp0QWQYbIccEFvjxo179OiBdCmB3wmnE/Fb7Lbiph8lsUWKMthPveaaa2655RY4jnAxQWal9kpRxltsNtuJEyew3EHh9ddfP2jQoCeeeAIF4CWvWLFi+/btaB1uNIxv0KAB8iG4V6hbty7CvFdddRVsTklJwW0E8n0I6qJH4FTcLrRv337cuHHVqlWz8rstfUAWrkvaUuz69esxeyDoDvb8kcBMQvrw4cPEtUg3adLk66+/hvPasWPHl1566a233sK9J/JZzITAoczc/CJnnM3avE5ys9rJ6NqOY9k4sjACHgSKnE6kbVYLxIKUECBZ5d9KDlar9dFHH01PTy8oKICziDt4qoAQLnZAceNOp2BWsGZ2djYiKL1790bmtGnTaEVCuqz06tULvJWXl4dQLdxWkBbKgO2mT59+/Phx5MNFPv/885EJgUKopTI47dSpE07hNyP2+9FHH2G5y8/PP3jw4H//+19oQAEI6pI9cEXA5Y888ggyIfXr18edAfSjRyBg3DEg/It8CHQOGTIECZLMzMwRI0ZQGgHzzz77DKbCsd66desrr7xSqe9LFfmoKQLaUmzv3r0xJ7xlzpw56A+Oy5cvR4IExRASwRREiMMzY+gSH82BwK7j8kGntFpJNqulSa0q6NSejHIe40Q+S9QiQIQaYwU1SJYFDkXk1SIVsLgrvPjii8nJ8pbOfe71DwK/2BlFcNUrTxfJH3744YsvvkDYD5HkG264ATwNj1YXlrERgSOgLcUGbg/XMCcCu4/b0THyX9MUik3PkDnIZGEECIGiYhkWBsXiNMYmlyYiXZwGLeCnu+++u9zqtWrVwv4U+LzcqxHMxD4xPNq2bdsiUAzPG96I91PEETSMmw4CATmPg6jGVRiBgBAgL7Zpbem/Nqkpj+knmGIDgtD8hclntVnlomSzyFBx6BRrRNSwU7Z582bEe48ePfr555+ffbZ8QjB8HeGWVEVAzmZVFbIyRqAcBPadlGHhNIVcyYvdw15sOThFdZZTebjJZpXkalNWpmIlJ6pB4c4bHAFlIhu8D2y+/hE4nJUHI8+qlojj2TWTcDyUmVtULB9vQZqFEXC5XOSzErlaFaJ1hrwXy8AyAmFDoNyGmGLLhYUz1UQAq+fhTPkVnXpVE6C3VnK8zWrB4pmRw69RBB4sEgHMB/mPEFYlROwJFGPyUD4fGQEjIsAUa8RRM5jN2flF9oJiGF2/qvRiwa91UuJxeuS0dG2RYGEEnEpMGPxqsViABiYJji4hlGwkWRgBQyLAFOvHsHGR0BA4nCmptFpSbGKcfKUAlNVNle7sESV6jFMWRqAkSiz5FWhYLBbQLRK8HQsQWIyLAFOsccfOMJYfzlKixAqtktH1lPQRJZ9y+BjlCNC2q9XNsBIMSlO+POc/RsCACDDFGnDQjGMyWUrean1lI5ZyaFP2yOl8OuUjI0DeKsWHCQ33E08IFtN5IEc4wQsXLgykRmBlR4wY4f2WpVKVb7nllmeffbZUJp2mp6fDtk2bNtGpWkff9qjVSih6evfuPW7cuIA0pKWlvfrqqwFVCbFwQUEBGl2/fn2IeryrM8V6o8FpTRA4qlApBYepAaLYo7wXS3DwUbjfTmy1/OPG0hNPtEcbKEKHDx8eNGhQoLU85bHO+l7cp02bNmfOHE9578Tvv/++ePHie+65xzvTk27UqBFsa9euHXKWL19usVgyMzORZtEDAnFxcRMmTHjooYdUNIYpVkUwWVX5CJy0S2+1VrJ8xIlK1E2VaaZYQqO8Y9TlEZV6U6xVYVvybv2HA44ICterVy8+Xs4xpNWV4uJip9NZtWpVz+uIS+n/73//e91115X71kbYZrPZYBv9okCpiv6fFhYW+l/Yn5K4pQDf+1PS9GVuuummlStX/vXXX2r1lClWLSRZT4UIZNjll3NqVInzlKhZJR7pk0o+EiyMgFP51g7RKqHhDhQr+ZRT0RFByLFjxyIOWatWrQEDBqAYvENPoHj//v3XX389GLFGHpkCSQAAEABJREFUjRpXXnlleno6CkAouDp16tT69evXrFnzrrvuIuqCtr179953331QAkHJOXPmoPoXX3zRpk0bMPe+ffuoLi6VEhDwggULrrjiCk8+2Oupp54aPnx4amrq7bffjtahE4FiJC655BIUq169OnKgEOklS5ZcfPHFaAv2XH755bt27UImBIVRZv78+b169UpISPjwww/R0Pjx46nkgw8+6P3Vpvz8/HvuuadOnTooefHFF//666/QELpALdw7eOFAoHnz5p5fDFyxYsUFF1yATMD48MMPFxUVUVt2ux29xq0G8l966SXKpOP777/fpUuXlJQU3G3ceOONx44do/yKjtR9gEYF4PcDDbonwBHpZcuWQWFSUtJFF120bds2Kobj008/DRzQ0G233QbbOnXqhEwIMOnXrx9mC26VAOnGjRuRSYLh6N69+7x58+g09CNTbOgYsoZKEDiRI73Ymsn/UCzR7Qmm2EqQi6LLxKREq9Rtq0W6sZRPOT6O7777LqJ8v/zyy8yZM72LgTVBulhkf/75Z1zFij9w4EB4k1Tmxx9/BI3hiOrgUQjyP/vss4YNGz755JOI6EKQA3E4HP/5z3/eeust+DdYtZFTrvzxxx9ZWVlY7r2vgsU7duz422+/Pf744558cNWnn36KU1ACWpk2bRrSoCUQJ/YCwRlWq/Wqq65yKr8+hEsQkMS99967detW9AikBWtnz54Nl+vkyZOff/45CpCAcaEZPQJzgAtRGAXoUihH8OVHH300ffp0GPDGG28ASWg7ePDg4MGDzz//fITHX3/9dfAuWA35kAceeADsu2jRom+//RZECGOQSYJBwW0HquA2CPRJtxd0Kbjjo48+CkCAG8ID//73v0kJbkSeeeYZjNqGDRsaN24M8ygfx+zs7FtvvRXQrVmzpkWLFugCcpBPgjsGzBZKh35kig0dQ9ZQCQLkrXoHioluT9kLvO++K9HCl/WMgMslCuxBiys/x1mQIwrt1sJ/lFgLHchx5uf4891YLJQvvPDCOcrHGyd4fmApUGP79u1bt279zjvvwAfFik9l4LL873//a9WqFVzGyy67DMSGfDi7COeCleFjQZADASu89tprcJLQArwl5JQre/fuRd1SHNynT5/777+/mfLx1EIxNIRTFEYrcKeQvuaaa66++mrwIvwt0Oeff/65ZcsW5JPATcfVJk2awC/EVvHEiRNxik7NnDmTqqMYSBpc8uKLL2IrGj73rFmzEhMTwXy4FIps3779448/hklg/aZNm1566aVDhw6FQmCCewXCcMiQIU888QSoDoDn5OSgUdxboCSQB997vFvUAgvCPOi58MILwdnffPMNyiM/aAGVwhlFf3EXsmrVqrw8+S1BROxHjRo1cuTIli1bTpo0CWZ49GNEbr75Zow70HvzzTdx/4S7Ac/VBg0aYBw9pyEmmGJDBJCrV47ACeUtTuS5UmlKFzldp3PdYSXK56NREQAdPttABCuW586q+9+mENvzDT1K4l5oiJxa05sIKK8Ml86dO5dbBK7Szp07wZfwuiBgNay/8FypcNu2bUF1lAZv+YhYwkXu0KEDlfRxzM3NjY+Pt1ik/+0pVsqp9eSXTezYsWPYsGHgHkSV09LSUAA3BDiSePTAUYbj27VrV8qH6+a5hK7hbgChTroUGxsLnwx+J516H++44w4AQoJWBg0aRGkcvYtRGkFaAAUao1PPEZq7detmsbj7i3ZBlgcOHIAZCBV4LATsuDXx1IJbiVg6PEuMC+mEAZ6rQSQ8Q4NBRHUaR4QH0Heckninjx49Onr0aNyW4dYEUMNmbwNwUwLSpVqhH5liQ8eQNfhCoNjpOumQe7HkuVLR+BhbcnwM0ieUJ6GQYGEEKkLAn1BHlSry55vKasDq2blzZzCER+CQYf+PSoKBKIGjxWKB+4VEuYJlFwXKveSdie09rM5gF+/MimzzLkNpEA+CunA91yofZHqr8l8PKlYqiIR7MIHfBkffc1q2LrpfNjO4HPjZiF2D2BDIxZ4ohbi9u1lWrdUqecozDXAPUaqMZxxpjHyMI1VElBidRXAeLi8S2Pn2NgBDULt2bSoZ+lGaHroW1sAIVIRApgPRYHmxRtI/e7E4J0eWYsg4ZTE2ArFJ4pFDQUvBgweO3r0745493hpcEw8iE+KMkb8bERw+5513HlxDBGMRffUIfBff2uCzFhfLV376Llb2KgK8yPSO7uK0IkEruORp6MSJE3C8HnvsMQRXEcA8deoUrpYrsB/uGliYriIGC7+Q0ohGQy12nekUbAQaQwSVTr2P3pjExMScddZZHny8i1EaUVbwlnc0lfJh5+rVqz3kh3bhmGInG2aA9jwWoi+4s6Eqf//9N3r6/PPP9+jRA6Fa8jjpUkVHIjw47lQApEgJ30f4zei7p4x3Gnbec8892IJFGANRh4yMDE8xJDZv3nzuueci4bf4KsgU6wsdvhY6AvRMU7Wk2BjbGZONKDZDiSGH3gpriDACFouIqxK0OMHQsVWs8cneGizxyda4ZBFbJZTfY7rpppvgWV555ZU///zznj17sAuLtRWRTN9wIUj7008/HTx4sNTi67sWroIMQOorV65EulI5++yzLRbLV199dfz4cXjb2BiGO4WtQUS2f/jhh/Hjx/vQcO+994KlFi5cCMa68847MzMzqTA83TFjxjzwwANLliwB0yMc6nA4sCVJV4M+AhB4fthDRYsEI7ZmoQ1N79+//+6774YZixYtmjx5Msy2Wq2INqNRmIGOgLFGjBiBTJSHID4cFxeHjdLdu3d/8cUXTz31FDJ9C3xo7Nqiv4hLg+ZxF+K7PF2FVdgPxjYw7rGefvrpP/74A2jTJYSI33//fWjDTQBmCPRTPh0xVfr370/p0I/W0FWwBkbABwIZ9Dix1zd2qHAt5QHjk/xQMcER3ceSL8WWRsGi7PF5nKTSl/04T0pKAlliWacng7DuYy8WUUrfVRFETU9PhysGyvRdsuzV2267DSHQsvllc+A4PvHEEw8//HDdunXHjh0LEpo3bx780Xbt2t13330vvvhi2SqenPvvv/+WW24B7WErFI7jVVdd5bkEKrrmmmtwFWQPtl66dCnI23M16MTrr79+7bXXglPheoK5Ee+FKnRh8eLF69at69ixIzZ3Aa+H/2A//FSEvvv27XvxxRcjXI/yEEA6Z86cTz75BL41TJ06dSoyK5XZs2fDWYeScePGgS8rLY8C4M6JEydOmDABOOC2ADSfkJCAfAioF4418oESbrng0COTBE45trrRUzoN/cgU6wtDvhY6AkSiNZPlF2G9tZEXe5L3Yr1BidY0fTOHvqXjjQHl0FXv/FJp+KavvvqqdyZYeciQIZRTr149uDLwFEGuu3btgptIFIuFHj4ZlcERGqAHCQh8pt9//x3loQenI0aM8LiJOIWUqoscj6Aw3F+s1JSTnp4OVqA0jnAHoZPiyTh9/PHHEf9EDBYKcQo2guuJdtF6r169UJJ6UaoWSiK0++qrr4IMQBUvvfQSOrhw4ULkQ0Ak06dPp/7Cnz7//POR6VtgZO/evX2XgdqXX3750KFD+fn58AtHjhxJ5WEnKBaZ6AgoE4ZRPhxZeIpg4iNHjsCdBbYwmC4NGzYMnIduYisUHIxuegChAnSEVR7oEJFGYXjkv/32W79+/VCFDMYR6WrVqlEV6MEp4KJTwAscsrOzwakAtnnz5pSPODDixrm5uQhfg029G4KRsLaUX0u1gjsyxQaHG9fyF4ETSii4Zhkvtoby9gkKI/uri8uZFAEsi+iZVfFZkfAI5ZCP68nUeQKr83vvvRdohFnnnTKieeBj3BP89ddfCGJPnjz5+++/h9PvuyMFBQXYdUYIwXexgK4yxQYEFxf2E4F/ipEXW70MxRLp0tV/SnMqKhEgP9ViKc2xViXHFdQvAUQQSLhWcM4iaAA3DQQsFguC2D179kR4+csvv/z0008RJEC+D8EmMQLduEnyUSbQS0yxgSLG5QNDICtXvk+1amJsqWo1FNJlii0FS3SeVuTFWhTONZYXG50jqMNeJyYmwnM9ceIEgtUbN27EZnxEjGSKjQjsUdTo6QootlqSJN1MhyTgKIKj0q5GZQHfXixdjUpguNOGR4Ap1vBDqPMOkBdbrYwXSxRLV3XeBTZPawTIT7UqPqt3W1bFjaWr3vmcZgSMggBTrFFGyqh2EolWLUOxlENXjdo3tlsIp9d76oPGg3ZbLZbSHEsZdLVS5VyAEdAUgeCmOlOspoPCykVmBYHiVIV0T+cVOjkOaMxpEhcnX9eFja4QzcdGLPmp5LN6a6Mcuuqdz2lGIPwI0FSnae9/60yx/mPFJYNBgPxUIlTv+uTFwkHJzuNfAvAGxjBpm81Wo0aNI0eOHDt2DKtPbrAfR25uYX4eJC+vtIr8PHmpbH7pcnweEgJcuRIEML0xyTHVMeEx7QP6L8oUGxBcXDhgBLIq8GLjY2wJsXL6UYGA9XIFHSBw1llnYdHB0rNr164dIXz27tm1d8/uXTt3ltKxa9dOeWn3ru3bS13hU0YgfAjs2rULkxxTHRM+0P92co0LtA6XZwT8RCCvsLigSL5itqry/HCpWuTIMsWWgsVApxaLpWHDhm3btm0Rwie2eoOJ32f8Z1VmWR1pTZrhEqR+47SyVzmHEQgbApjkmOqY8Gf89/TjhCnWD5C4SLAIEH1aLSI5Tv50XSk1TLGlADHoKUJniSF8Thda950uyim2ltVRLTX5qMOJqwUipuxVzmEEwoYAJnlw/z2ZYoPDjWv5hQBRLDZiraDZMjWqJsqvxlKZMhc5I1oQoAlAk6FsnzF5kHk6lzfsAQOL8RBgii13zDhTHQSylI3Ysl+KJe1VE+UjqVSGcvgYhQjQy0kqmiSpCTL+cTqPX1EShVPDDF1mijXDKOq2D/TypoocFMrPzC3Qrf1sWBgQoAlAk6Fsc6lKqINouOxVzmEEdI4AU6zOB8ho5p1pL3motEqeeUWe0apKZeQ5/0UlAjQBaDKUBSA1Qe4mnM7jQHFZbDjHAAgwxRpgkIxrou/Vk1ZVdlCMO76qWO4OdSTJXYOyClMoUKzsOJS9yjmMgM4RYIrV+QAZ27zKKFZus1EZY/dTDeujVgdNALrfKgsChUB4L7YsMpxjCASYYg0xTEY1kjzUilZP+rIsrbBG7SHbHTICNAEqftxJCRTzE8Uh48wKIoIAU2xEYI+WRmn1rIhi3dtsvHpGy3Qov5+VTJJEGerw6cWWr5ZzGQE9IMAUq4dRMK0NvlfPFOVJlpx8fpLFtBPAn47lKI8ypSh7rmXLl9yH8Zd2ymLDOQZAgCnWAINkXBMpUEzbaWV7kRwvHZRs/spjWWiiKSdbucdKrohi6Us7PEm0mBKsU3sEmGK1xziKWyAPtSIHhfL5l3aieILIrtM9Fnmr8vzMv1SFek/zbsKZsPCZURBgijXKSBnSTqJP8lbLdrNFjLAAABAASURBVIAoNr/IST8VULYA55gegcJiZ16h/KGIiiYJhUB4L9b0M8FYHfTfWqZY/7HikgEjUOLFyodCy1b2rKpUrGwBzjE9AnYlSoxuVhgoVjbsaccBxVgYAWMhwBRrrPEykrUul4u4k7zVsqbH2KxJcTbkU6gQCZZoQ4DiHAmx1lhb+WtRqvJEMSaS0+mKNnC4vyZAoPxpbYKOBdkFrqYeArmFxcXKsujxVsvqpku0zpa9yjmmR4CGPjm+/DgHup+qeLGYR/YCfvIceLAYDAGmWIMNmIHMpS9jWCyCXNVyLScHl9bZcgtwprkRgHuKDtI0QKKsxMdY4xQHl19TXBYcztE/Akyx+h8jY1hY1kr3lzHiYywWS9mrlJOs+CgcKCY0ovCYky+/8JocH1NR3y0WC8WKeTu2Iog4X88IMMXqeXSMbRt5sSkVr57oXqrylQxyZXDKEm0IUADDhxcLQFKU+zCmWEDBYjgEmGINN2SGMZiIk9bHiowm94XW2YrKmD0/qvtHQ0/ToCIg6CrvxVaED+frGQGmWD2PjrFtc6+eip9aUU9SlKtExhWV4XwTI0BDn6xMg4q6WSVePnaek19cUQHOZwR0iwBTrG6HxvCG5ShfeSQXpKLOJCuPkvKLBSrCx/T5tA2fqoSCK+osTRLadzijDJ8wArpHgClW90NkWANp9fTtoLi9WOVF8IbtKBsePAJEnMk+N+yTFS/W85KK4BvjmoxA2BFgig075FHTIK2evh93IoqlkHLUAMMd/QcB92PnPgPFdJdGJf+pyakQEOCqYUOAKTZsUEddQxQoJhKtqPN0lUpWVIbzTYwA3Yf59mKrKD4ue7EmngYm7hpTrIkHN8JdI7cjWdltrciUFGUTjkLKFZXhfBMjQAGMFJ9eLAVCiIxNDAV3zQgIBGwjU2zAkHEFPxGgNZGifBVVSVYcFFpnKyrD+SZGgAIYvimWvNgcfoGiieeBebvGFGvesY10z9yrp0KiFdlCaytTbEX4mD6fJkmyz1BHsjKF6I7N9IBwB02GAFOse0D5H9URoDXRtxdbQrHyLXqqG8AK9Y8A7RHQNKjIWrrKe7EV4cP5ekaAKVbPo2Ns2+jbrrQ+VtSTFGUvFq6My8U/VVYRSGbOpwAG+akV9dMdKFa+Zl1RGc5nBPSJAFOsPsfFQFZVaCqIE9d8r5501ekSjgJ+dw/Qii4pKHLmFznR5xSfjzvRJKHphMIsjICBEGCKNdBgGcxUWhN9r55JcTaL8jM8/AZag42uGuZ6Yr9EohWppKs0nSoqw/mMgD4RYIrV57gY3ioEft17sT6fZLFYLFXi5A+Z2aPwDbSGH+RQO0BR4sRYW4zN10JE2/n2/CJMqlCb5PqMQHgR8DWzVbFkxowZaWlpCQkJXbt2XbduXbk6X3311XPOOScxMbFRo0b33XdfXl5eucU400AI5Bc5ixD/FYLWRx+Ww5HFVSygOLJEFQLZ9GOxPqPEAIT2YguLXZhUOGVhBAyEgLYUO3/+/PHjx0+ePHnjxo0dO3YcMGDAsWPHSqEzd+7chx9+GGW2bt369ttvo8ojjzxSqgyfGg4BclAsFpEUK38mxYf9FAZkivUBkVkvUZyD3izho48U50ABzyRBmoURMAQC2lLsyy+/PHr06JEjR7Zp02bmzJlJSUmzZ88uhcuqVau6d+9+4403wtnt37//sGHDKnJ2S1XkUz0jQDtnoE+rVdlrrdhW8lF4L7ZihEx7xT1JKvNibVYLhTqovGnh4I6ZEQENKbagoGDDhg19+/Yl3KxWK9KrV6+mU8/xoosuQjGi1d27dy9evHjw4MGeq55Efn7+aa+PJ58T+kTA/X1H5aUBvi2k1dPOe7G+YTLjVaJM3IdV2jkqQ+UrLcwFKkaAr4QbAQ0pNiMjo7i4uG7dup4+IX3kyBHPKSXgvz755JMXX3xxbGxss2bNevfuXW6g+Lnnnqta8sGWLdXlo24RoBggeai+jaTV087fevQNkxmv0je1kpTn3Xz3jyYJTSrfJfkqI6ArBDSkWD/7uXz58mefffa1117Dfu1nn3329ddfP/XUU2XrTpw4Mavks3///rIFOEdXCNiV77lW+qwTbCYaZgcFUESb0H1VlXhbpR2niWTn1xRXihQX0AiBYNVqSLG1atWy2WxHjx712IZ0vXr1PKeUePzxx2+55Zbbbrutffv2V111FegWDqvTKb+QTgXoGB8fn+r1oUw+6hYBh7Iaeh5U8WEnUaydA8U+MDLpJYdyH+a/F0vP0JkUDO6WORHQkGLj4uI6d+68bNkyQg6siXS3bt3o1HN0OBzYpvWcgpWRdvHr9ICCkYUoMzGucgelilLGoVCykXvMtgeMAHmlNAF8V+b7MN/48FXdIqAhxaLP48ePnzVr1rvvvrt169YxY8bY7faRI0cif/jw4Qj8IgG54oorXn/99Xnz5u3Zs+e7776DU4scIlpc1V64BU0QIMr0f/XkQLEmw6BvpQ4ldJHkxzNx9MWeHOV7tPruE1vHCJyBgLYUO3To0KlTp06aNKlTp06bNm1asmRJXeXpp3379h0+fJgMeeyxx+6//34c27RpM2rUqAEDBrzxxht0iY/GRYC8WH9WT3qSxc6POxl3sIO1PFAvNkeh5GBb43qMQAQQ0JZi0aGxY8fu3bs3Pz9/7dq1Xbt2RQ5k+fLlc+bMQQISExMzefLknTt35ubmgnpnzJhRrVo15LPoHQGf9gXqxdqVbTmfKvmi2RDw34ulx534iWKzzYAo6I/mFBsFGHIXy0HAruytJsXFlHPtzCx6oJS92DNRiYozmiT+7CZwqCMqJoQZO8kUa8ZR1UGfyEEh+vRtDj11HFUU6xuQ6LnqUEIX/tyHEcXm8G5C9EwOs/SUKdYsI6mzfpCD4s/q6X5YVFltddYJNkdbBOi+yq/7MOWRqGymWG0HhLWrjwBTrPqYskYgQA6KP6snOSi02qIiS/QgQJPEn/uwZOX1FI78ougBh3tqDgSYYs0xjrrrBVGmP6tnkrJ6cgxQd0OovUEOZcPen/swmkh2DnVoPyjcgroIMMWqiydrcyPgUFZD2md1Z1Xwj8eL5feNVICQabPtypdw/JkkRMMOhZJNC4emHWPlEUKAKTZCwJu9WYdCseSh+u4r7cU6XSK/qPRbM31X5KuGRqDY6cotLEYX6KeWkPAhbi9WoWQfxfgSI6A3BJhi9TYiJrHHoTgc/jgoSbHulyxyrNgkY+9fN4hfUZbusZDwITSRaFL5KMaXGAHVEQhRIVNsiABy9fIRoBigPw6K1WqhYnZ+XrR8LM2Z61CG22oR8THWSntI4RBHQbET4Y5KS3MBRkA3CFQ+uXVjKhtiGASKS2KA/jgo6BUVs3MYEFhEjdCzS3BPLRZLpZ2mDXsU8/i+SLMwAvpHIIopVv+DY1gLPesguaeV9oMWULsSW660MBcwBwJ2xYsl97TSHsHThb+LYjxJAAKLgRBgijXQYBnGVIoB2qwWrIz+GE1MzHux/mBlmjKI+qIv8GJxrFQsFguVdHCoo1KwuICeEGCK1dNoGMSWSs200+PEcTasjJUWRgEKFPPqCSiiR+xK0MJPLxawUEmqhVMWRsAQCDDFGmKYDGYkxQDJ7fDHdHegWIkc+lOey5gAAbqjSoqt/IciqLM0ncj3pRw+MgL6R4ApVv9jZDwLaR0kt8Mf68mLjYJAsT9gREsZ8kf9nyRUku7eogUj7qfxEWCKNf4Y6q8HtHqS2+GPdfRzZg4lcuhPeS5jAgQcStDC/0lCb59wKHsQJug+dyFKEGCKjZKBDms3HcozKfQQkz8Nl3ix8l0//pTnMiZAwK6Qpb+TRAi6D2Mv1gRDH1VdYIqNquEOU2ftij9KxOlPk1SSV09/sDJNGUeAkyRJ+T07h0LMpgGBO2J6BJhiTT/EEeigQ4kBsoMSAeiN06Q90FBHnHzRJt29GaeXkbeULYgsAkyxkcXfnK3bFVcjAIpVHBS74taYExHuVRkEHMpwUwCjzMVyMtx7sQoxl3OZsxgBXSLAFKvLYTG4UbR60proT1dKvrTDe7H+oGWSMvaA78PYizXJ0BukG+qYyRSrDo6sxRsBigFWiZdrond+RWlyZfhLOxXhY8p82k0I+Ili9mJNORvM2ymmWPOObeR6FqgXyw+LRm6sItay24v1/z6M92IjNlbccPAIRCPFBo8W1/QPAVo9iTj9qUFerEOJHPpTnsuYAAEH7cXG+ft2J36i2ASDHoVdYIqNwkHXvMsUA6Q10Z/GKKRMa64/5bmMCRBwKCHfAJ6JU8jYrjysboLucxeiBAGm2CgZaFW66a+SEi/WbweFVk/2Yv0F2AzlHMpwUwDDn/64X6Co+L7+lOcyjIAeEGCK1cMomM0Gh7IO0proT9/omZeCImdhsdOf8lzGBAjYaZIoO6z+dIcmCfm+/pTnMoyAHhBgitXDKJjNBloHaU30p2+JJessVfSnisHKsLlnIuByuRyBerHKJCFiPlMZnzEC+kWAKVa/Y2Ncy2gd9H+bLS7GGmeTU5EqGrfjbLmfCOQXOYudLhT2f5JQSJlvwgAai4EQkOuagcxlUw2BAK2DtCb6aTA/8eQnUOYoRi4s+pKkbMMjUZF48ukBddyEwQP2ZHKCEdA5AkyxOh8g45mHFRDrIOymNREJf4SWWrvylKk/5bmMoRGwKw8GJ8RabVaLnx2hB9Th+sID9rMKF2MEIo4AU2zEh8BsBmAFxDqIXtGaiIQ/Ql4scbM/5bmMoREgL9b/3Xp0NjHW/bIwomfksPhEgC/qAgGmWF0Mg5mM8KyAnjXRn96RF0sRZn/KcxlDI0D3Uv4/c47Owt+lGUX0jBwWRkD/CDDF6n+MDGYhrYBYDbEm+m86e7H+Y2WCknQvFZAXi17zJAEILJojoGoDTLGqwsnKhCAHhVZD//EgL9bOe7H+Q2bkkjRJ/H+cmPrKk4Rw4KOBEGCKNdBgGcNU8mJpNfTfYno2yqG8jsD/WlzSoAjQQAf0zDl6SpRMdXHKwgjoH4Goolj9D4cZLKQYIK2G/veHVlv2Yv1HzNAlaaB5khh6ENl4fxBgivUHJS4TAAIUAyTK9L8alWcHxX/EDF2SBjrQvViiZKpr6O6z8dGDAFNs9Ix1CD0NpCqtgLQa+l+PyhM9+1+LSxoUAbcXG+/+Ho6fvSBKtitvXvSzChdjBCKLAFNsZPE3Yeu0etJq6H/3qDwFmf2vxSUNigDdh9Gg+98F+pKPQ3lthf+1uCQjEEEEmGIjCL45m6bVk1ZD/3tI5XNMt3r6j0BUlSRPNPBn4uTPI1LdqIKLO2tcBJhijTt2OrU8JC+WY4A6HVWVzSJPNOBvdimBZaqrskGsjhHQBgGmWG1wjWKtbi9W+ekx/2Ggx53s/KUd/yEzckm7ci/l04stp3sUWKa65VzmLEZAfwgwxepvTAxuEa2Aga+e8skXB796wuCj76f5dB8WsBer3LdRXT+8OF4FAAAQAElEQVQb4mKMQGQRYIqNLP4mbN2h7KcGvHrG0zZbkQkR4S6VQYB2EwK+D6NJwvdhZfA8I4NP9IQAU6yeRsMUtoTkxSrxQ1PAwJ3whQB5ovRKL1/lzrxG3+yiumde4TNGQKcIMMXqdGCMaxatgMF5sfxEsXHHPSDL3V6s4pX6X5H3Yv3HiksGgYAWVZhitUA1qnW6V884Gfj1HwhyaAqKnIXFTv9rcUmDIuC+D1P2Vv3vAn2zi3Yi/K/FJRmBCCLAFBtB8M3ZdJCrZwklOzhWbM55cUav3LsJQXmxPEPOgJJP9I1AdFCsvsfAZNa5vdgAV8+4GGucTc5GB39vx2QTokx3EKhAuALZFLpAwk+h3Qc7zxA/8eJiOkBALmo6MINNMA8CxJGBrp7oP4UBiaFxymJWBBwlgYpAnyim8g5+otisM8OM/WKKNeOoqtenIDTZlQU0KT6wvVg0RA+zONhHARamFhriWJslLiaw9YdmSEGxk5xgU4PEnTMJAoFNcZN0mruhGQJBxwBhEX0lg71YQGFuoSEmlzSgniaWPB6Vq9zGBVSXCzMCEUGAKTYisJu2UUfJ2pdU8viS/10lx9euvLnC/1p6Lcl2VYiAQwlUBLGVAK+XNuztioYKG+ALjIBuEGCK1c1QmMIQWj2DiAGi97Tm8uoJKMwtdmUzle6oAu0pbdjTNAu0LpdnBMKPAFNs+DE3c4vu1TNwFxagkOPrKPGDkcNiSgQcig9Kd1TldNBnFm3H0jTzWZAvMgK6QIApVhfDYBojQlk9k+PlLwHYOVBsmtlQQUfsyl0U3VFVUKTCbPeGvULSFRbiC4yAbhBgitXNUJjCEHtIMUD5ELJDWX9NAQZ3onwEHMpdFH3JtfwSFedSeNmhTLOKS0XpFe62DhFgitXhoBjYJIfiXgQbA1S8WEWDgSFg0ytDIBQvlqaWnSdJZSDzdZ0gwBSrk4EwiRl2xQcNNgYovVi74uKYBA7uRnkIOJQhDtKLVb6341CmWXm6OY8RCAIBDaswxWoIbhSqDmX1pDXXwTFAs88bvg8z+whz//5BgCn2Hyw4FToCKqyeHAMMfRj0rcGhDDGFfAO1lO7D+NUTgeLG5SOFgMkpNlKwRm27jhBigMnxMlDs4Big2WePXQlU0INLgfaV9iDoTi7QulyeEQg/AppT7IwZM9LS0hISErp27bpu3bpye5iZmXnXXXfVr18/Pj6+ZcuWixcvLrcYZ+ofAVr7aB0M1Fr39zEUkg60Lpc3EAIOxYul4Q7UbPJ9SUOgdbk8IxB+BLSl2Pnz548fP37y5MkbN27s2LHjgAEDjh07VqqTBQUF/fr1S09PX7BgwbZt22bNmnXWWWeVKsOnYUcgyAZp7aN1MFAVVdiLDRQyY5YP6T5MmSTkBxuz92x1dCGgLcW+/PLLo0ePHjlyZJs2bWbOnJmUlDR79uxSACPn5MmTCxcu7N69O/zdXr16gYxLleFToyDgUMK8iUG+3Ym/tGOUcQ7JTvdugvJscKCK6O7NUVAUaEUuzwhEBAENKRbu6YYNG/r27Usds1qtSK9evZpOPccvvviiW7duCBTXrVu3Xbt2zz77bHFxseeqJ5Gfn3/a6+PJ54SuEKC1j55JCdQw8mIN76AE2u3oK+/2YhV/NNDe0x4EaQi0LpdnBMKPgIYUm5GRAbIEcXp6hfSRI0c8p5TYvXv3ggULUBJbsI8//vhLL7309NNP0yXv43PPPVe15NOoUSPvS5zWDwJEkLQOBmpVkuLW2HkvNlDgjFbefR+mDHegttPdG/nBgdbl8oxA+BHQkGL97IzT6axTp86bb77ZuXPnoUOHPvroowgpl607ceLErJLP/v37yxbgHD0gENLqqYSX84ucRcVOPfSFbdAIATs9UawMt3cT/qTp7o29WH+w4jJ6QEBDiq1Vq5bNZjt69Kinn0jXq1fPc0qJ+vXrt2zZEiXptHXr1vB0EWSmU88xPj4+1evjyeeErhBwr55BxQApUIzuOArL2SlAPos5EHDfhym/+hBoj9xebAHvxQaKHJePDAIaUmxcXBwc02XLllHP4K0ijW1XOvUcu3fvvnPnTlylnO3bt4N0UZdO+WgsBNyrZ1AxwLgYa6zNgv46FC8HCRbzIeB0uhzKM3HkjwbawcRY/vJ0Wcw4R78IaEix6PT48eNnzZr17rvvbt26dcyYMXa7feTIkcgfPnw4Ar9IQJB/8uTJe++9F+T69ddfP/vss3fddRfyWYyIAEXwgls90V+qaGcfBViYVHJLQhTkjwbaS6rl4A37QIHj8hFCQFuKxd7q1KlTJ02a1KlTp02bNi1ZsqRu3bro6b59+w4fPowEpFGjRkuXLv311187dOhwzz33gGsffvhh5LMYEQFa+2gdDML+Kor7a+cFNAjsDFKF7p8sFpEQI7+jFajVdBOGrQR4w4HW5fKMQGkEtD/XlmJh/9ixY/fu3Zufn7927dquXbsiB7J8+fI5c+YgQYLo8Zo1a/Ly8nbt2vXII4949mXpKh+NggBWPax9sJbWQSQCFXqpnp0DxYECZ5zy9HrhpFib1So3BQI1nO7eXC6RV8Qb9oGCx+UjgIDmFBuBPnGTEUIAqx7WPjRO6yASgQp5sQ4OFAcKnHHK0/0T3UsFYTV8X3jAqEh6kGBhBPSMgFkpVs+Ym9Y2WvWwAmIdDK6T9FCxXXkcJjgNXEvnCND9E91LBWEqfF94wKhIepBgYQT0jABTrJ5Hx2C20aqHFRDrYHCmU4SZNnSD08C1dI4A3T/RQAdnKnnAdD8XnAauxQiEDQGm2LBBbZCGQjCTVj1aAYNTQxFmWoWD08C1dI4A3T/RQAdnKnnAdD8XnAauxQiEDQGm2LBBbf6GaNWjFTC43pJzQ6twcBq4ls4RoPsnGujgTKW6pCc4DVyLEQgbAkyxYYPa/A3RqkcrYHC9JXrOMebjTsF1Odpque/Dgnq1E2FFHjDfhxEafNQ5AkyxOh8gI5lHqx6tgMHZTUFmB39pJzj4jFDLvZsQ1AuKqX+JSl0HPxNHcPBR3wgwxep7fAxlnVperJ29WEONe0DGOpTBpXBFScXA/qW6pCewmlyaEQg7AkyxYYfcvA3SqheKF0tf2mEv1rxzRLi92Hj5quHgukk7EXb2YoODj2uFFwGm2PDiberW3KunEscLrqNEz3bF0QlOA9fSOQLu+zDlTZnBmUqTxMFv2RRCBIcg1wojAkyxYQTb7E2FvnqSg+JgB8W8U8WuDC4NdHC9pLqkJzgNXIsRCBsCTLFhg9r8Dbm92BBigFUUD9jODop5Jwt5n+SJBtdL3osNDjeu5Y1A2NJMsWGD2vwNOZQAb1JsML+gQugkKd/lsCt6KIePJkOABpc80eC6Ro+d2/mx8+Dg41rhRcBfii0uLv7000+fVj6ff/45TsNrJ7dmAATsSgyQHlkKzlzyYh28egYHnxFqOdyTJPj7MPZijTDObKMbAb8odufOnW3atBk+fPhnyufmm29u27btrl273Dp09Q8bEzkEHEqAN6QYIHuxkRu+8LRsVyYJe7HhQZtbiTgCflHsPffc07Rp0/37929UPvv27WvSpAkyI249G6ArBOxKgDeU1ZO82LxCZ7HTpauusTFqIUBebFIoTxQrdemXidWyivUwAhoh4BfFrlix4oUXXqhRowYZUbNmzeeffx6ZdMpHcyAQei9o9QzFi6W9WFjiUNgaCRaTIUBebCi7CXQPRyETk4HD3TEfAn5RbHx8fHZ2tnfnc3Jy4uLivHM4zQjQ6kkrYHBoxNmsMVYL6jqUHTskWMyEgMvlsisjS+GK4LpGHjDPkODQ41phRsAvir388stvv/32tWvX4n8IZM2aNXfccce//vWvMNvKzekcAVr1Qlk9LRYLLaA5yo6dzvtbYh7/6y8C+UXuLQBPuMLfml7lKExi5ziHFyac1C0CflHs9OnTmzVr1q1btwTl07179+bNm0+bNk23vWLDIoIA8WIoqyfMphCigx8qBhamE7oJQ7dCuQ+jMAnPEMDIon8E/KLYatWqLVq0aPv27QuUz7Zt2z7//POqVavqv3tsYdgQQHiDFtDkEF49AWvJi2UfBVCYT2grISHWalO2A0RQPSR6Lih2FhQ5g1LAlRiB8CHgF8WSOfBcr7jiisGDB2Mj9tSpU5TJR0aAEPgnBqg88EmZQRyJoR0FRUHU5So6R8AR8kYsOphYMsFyFW3IYWEEdIuAXxQ7bty4t99+G30oLi7u1avXeeed16hRo+XLlyOHhREgBGj1RDpJeQkiEsEJVbdzoDg4+PRdi4ITIW4lxMVY42xy4SJt+u6xVtaxXqMgIGdqpbYuWLCgY8eOKPbll1/u3r3777//vu+++x599FHksDAChIBdeUApxBggVNHDLI4C9mIBhtmEJglFekPpG5E0T5JQMOS64UHAL4rNyMioV68eDFq8ePH111/fsmXLf//733/++SdyWBgBQsChRO1UWD0VJ9jOXizBaq4jDSs90RZKz2ia0ZQLRQ/XjT4Ewt1jvyi2bt26W7ZsQZR4yZIl/fr1g40Oh8NmC/4to9DAYjIEKGpH7kUoXSMv1q74xKHo4bo6RMChBCfoibZQzCMNdr4PCwVErhsWBPyi2JEjR8J5bdeuncVi6du3Lwxbu3Ztq1atkGBhBAgB+hIFuReUE9zRvRer+MTBaeBaukXArgyrCpMkPgZ9JMJGgoUR0C0CflHslClT3nrrrdtvv/2XX36Jj49HZ+DCPvzww0joR9iSyCJgV8lBoSgir56RHU2NWncowYnQQx30g4l2hbA1MpXVMgKqIOAXxaKla6+99r777mvYsCHSmZmZt95665VXXok0CyNACNiV1ZMIknKCO9JPldk5BhgcfPquZadJomy3h2Ip7SYQYYeih+syAloj4BfF/uc//5k/fz6ZgohxzZo1wbV//PEH5fDR4AioYz65FBwDVAdNk2pxTxIlzBtKF3k3IRT0uG44EfCLYmfOnNmoUSOY9Z3y+eabbwYOHDhhwgTksDAChAC5FKHHAN1eLMcACVZzHSn+T0McSs/Yiw0FPa4bTgT8otgjR44QxX711VfwYvv37//ggw/++uuv4TSU29I5Am4HJeQYoNtBUSKKOu+yYPsCRMCuxP+T2IsNEDcublwE/KLY6tWr79+/H51csmQJPVHscrmKi4uRw8IIEAKqebHx8stgdqZYgtVcR9W8WOUdiqTNXAhxb8yGgF8Ue/XVV9944439+vU7ceLEoEGDgMFvv/3WvHlzJFgYAUJAXS/WwYFigtVcR3uJFxtit8gPJm0hquLqjICmCPhFsa+88srYsWPbtGmDrdjk5GQYdPjw4TvvvBMJFkaAEHCo9KUd/hkAwtOUR7sySZKVQEUoHaTd3NxCfstmKChy3XAg4BfFxsbGTpgwYdq0aeeeey4Zdd999912222U5iMjAATIpQj9Szv84h6AaVaxK/F/2m4PpY+kfSIuQQAAEABJREFUwa74xKHoMWBdNtlgCPhFse9V8DFYX9lcLREgLzZ0iiUNuYXFxU6Xlvay7ggg4FDi/6F/s8v9RLHiE0egG9wkI+A3An5R7L1eH8SHR4wYcfvtt48bN87vVrig+RGwu1dP+bBSKL0lLxYawLI4spgJATt5sSEHihOVB9ft7MWaaXJo3ZcI6feLYk95fXJycrZt23bxxRd/9NFHEbKZm9UjAnZaPZW1LxT74mOsNqsFGkghEizmQMDlcqnmxfITxeaYE1HQC78othQOLVq0eP755+HZlsrn02hGgL60QxG8UHCwWCxJygLKFBsKjDqsm1/kLFKC/6FPEvderBI40WFP2SRGwINAMBSLyjExMYcOHUJCB8Im6AIBChTT2heiQbRXRx5PiKq4un4Q8Axo6JOESJru6vTTQbaEESiLgF8U+4XXZ9GiRTNnzrz55pu7d+9eVh3nRC0CDuXZE1r7QgSBlLAXGyKMeqtOA5oQ694ICMU8ImlHYbFTcYtDUcV1GQFNEfCLYod4fa6++uopU6Z06NBh9uzZmlrGyjVHQL0GCoqchcXyAWBa+0JUTA8VOzgMGCKOOqtOA0ohihBNo5swl0vkFfE75kLEkqtri4BfFOv0+hQXFx85cmTu3Ln169fX1jTWbhwEHIoLC3vpnQBIhCLuvdgSnaGo4rr6QcCuDGjoPxSBHiXE2CzykTjh4PswwMGiYwT8olgd28+m6QIBu7LSxcdYY2wqzChydCiuqIvulTGCM4JAwKF8x4YGN4jq3lWsVktSrPx6GOn0vsRpRkBXCPhaEMdX9tFVT9iYCCLgUL6xQwHe0M3gN9CGjqEONeRoMUkUz1iHnWWTGAFCwBfFvvPOO7/++utvv/22adMmHEsJMkkFHxkB8mIpwBs6GhRtdvDqGTqUetKgDKjgSaKnMWFbNEfAF8VmZWV9+umnP/74Y3p6+oIFC5Dwlh9++EFz67gBgyBAQV1VYoDoMXnDRNs4ZTEHAjSgak0SerDOrgSfzYEP98KUCPii2OrVq+/ZswfdBsU6nU4kWBiBchGwKzFAVZ5kgX63F6voxCmLORCg3QS1Jgl5w+QZmwOfSnrBl42JgC+Kveaaa3r27NmkSROLxdKlS5emZT7G7DJbrT4CDuVxJ9UclPgYmEhODxIs5kCABpR+rDD0HvGGfegYsoYwIOCLYt98881Fixbdf//9Lpdr9OjR95b5hME+bsIQCNgL5C93kmMRusFuL1bRGbo21qATBNxebJy8fwrdJJ4koWMYJRoi201fFAvLBg4cOHbs2FtvvbUMvcoMFGBhBICAQ9kSoz1UnIYotM2Wo+gMURVX1w8CdB9G1Bi6VTRJ7Er4JHRtrIER0AiBSiiWWn3nnXdSUlIozUdGoCwCdsXjpHfulL0aaA7pcfBebKDA6bu8XblnogBv6Ja6JwlTbOhQsgYtEfCLYrU0IATdXFU3CKi8F6vEEu28eupmfFUxxEH3YcrPKIWukLxYvg8LHUnWoCkCTLGawhstyu2Kx0mrXuh9poAzrciha2MNOkHArnixNLihm0QBZ74PCx1J1qApAkyxmsKrU+Wqm+VQPE6K3YWunPTQihy6NtagEwQc5MXGyxcfhm4SBZxJZ+jaWAMjoBECTLEaARtdau3qerFKoJhXT5PNoRyVJ4mkarviGZsMKO6OmRBgijXTaEasL3Z1HRRlu85RoMNfA40YwiZoGAOKXqj75WmHMvGgloUR0CcCTLH6HBeDWUXOhLp7sYDAUci/BgoYTCJ28mLVChQrv7RjV3YoTAIQd8OMCDDFmnFUw94nciboCZTQG4+PsVrp10CVRTl0hawh4gi4XC6HQofqvd2JAsXynScR7x0bwAhUhABTbEXIcH4ACNiVLTF6AiWAahUUtVgs9Nwp+ygVIGS8bET9i5wu2K3WK8CIqvlLO4CURc8IMMXqeXQMYxs9yUKrnipG046dnb1YVdDUgRKHchMGQ9TaTaDJlh0FMwSgsRgXAaZY446dXix3uVzEhbTqqWIW/R4LhRZVUchKIosA3YQlxFpttAcQsjU02TDxMP1CVsYKGAGtEAgHxc6YMSMtLS0hIaFr167r1q3z0ZV58+YhSDhkyBAfZfiS3hDIL3JSDDA5QZ03vKODbi+WnxcFFqYQuluiYVWlQzTZEHvO5WfiVAHUhEp00SXNKXb+/Pnjx4+fPHnyxo0bO3bsOGDAgGPHjpXb9fT09AkTJvTo0aPcq5ypWwTIQYF5ScpDnkiELrRjBx8ldFWsQQ8I0CQhXlTFnsRYtz9MmlXRyUoYAdUR0JxiX3755dGjR48cObJNmzYzZ85MSkqaPXt22W4UFxffdNNNTzzxRNOmTcte5Rw9I5CTJ5/qRODO/RywGrbS406eDTw1VLKOSCJARKiiF4twF2mj6RfJvnHbjEDFCGhLsQUFBRs2bOjbty8ZYLVakV69ejWdeh+ffPLJOnXqjBo1yjvTO52fn3+65IN/vS9xOrIIuFdPlb7vSH1xe7EcKCY4jH8kIlTRiwUkpM1e8iAVclgYAb0hoC3FZmRkwD2tW7eup9tIHzlyxHNKiZUrV7799tuzZs2i03KPzz33XNWST6NGjcotw5kRQYAoFl6siq2TNtrAU1Etq4oUAnbl0V8aVrVsoFAHTT+1dLIeRkBdBLSlWH9szc7OvuWWW8CvtWrV8lF+4sSJWSWf/fv3+yjJlypGQJMrWqye9NUO0qyJ0aw0vAjQt2vUpVjSxhQb3pHk1gJDQFuKBWvabLajR496jEK6Xr16nlMkdu3alZ6efsUVV8Qon/fee++LL75AEvm46pH4+PhUr48nnxMRR4DWOHIp1DKGfmyHvVi18Iy4Hk0CxfHyCXa+D4v44LIBPhDQlmLj4uI6d+68bNkyssDpdCLdrVs3OqVjq1at/vzzz00ln3/961+XXHIJzjgaTPjo/0gUSy6FWtaSF0ua1dIZkh6uHBoCdmVbXd1JQvdh5B+HZh3XZgS0QkBbioXV48ePRxD43Xff3bp165gxY+x2+8iRI5E/fPhwxH6RSEhIaOf1qVatWkpKCjJAz7jKon8E3A6K4lKoZS2tng5lXVZLJ+uJIALZJY+dq2hDcnwstLEXCxBYdIuA5hQ7dOjQqVOnTpo0qVOnTvBNlyxZUld5+mnfvn2HDx/WLS5smP8I0BpHj3f6X8t3SfJi7fywqG+YjHCVbKSAhLq7CcnKQ+x0h0et8JER0BsCmlMsOjx27Ni9e/fm5+evXbu2a9euyIEsX758zpw5SJQSZC5cuLBUJp/qGQGK1GmxerIXq+dxD8g2u/JEcYqqoQ66qyPyDsgYLswIhA2BcFBs2DrDDUUEAVo9k1VdPdmLjchQatco+ZpEimq1Qnd15qVYtXBiPZFEgCk2kuibo21a49SlWN6LNcfc8PSCJgmRoiczxAT5xHSHF6Iqrs4IaIQAU6xGwEaR2hxlx1RdinV7scqPeEcRlObtao4SKFZ3khBhk2bzIsc9CxwBPdVgitXTaBjTlpy8QhhO6x0Sqgi9fpYdFFXA1IMSIkKmWD2MBdsQTgSYYsOJtjnbsitebIp6v2QHmDy/F+t0unDKYnQE3BSr6iThQLHRZ0U02G8sio2GETFeH2n11MKLBRa5hcU4shgagfyi4oIiJ7qgiRerfOMWylkYAR0iwBSrw0ExmElEsfQlRbVMT4h1/zIevRVILbWsJyIIUJwDTVeJs+GoltDzyTT91NLJehgBdRFgilUXT71q08wul8tFa1yy8qodtdqxWCy0HetQotBqqWU9EUHArjzrlBhri7GpueAkK98Tw/TDJIxIv7hRRqBSBNSc8ZU2xgXMh0B+kbNY2S6lr9mo2EHajmUvVkVII6XK/fZEVTdi0ReiWMy+vEIZhUYOCyOgNwSYYvU2Igazh1ZPGE1OJxJqCSm0R9qLVas70awHjia6T4yIhFqSFGezWKSy7Hz5TLtM8R8joDMEmGJ1NiBGM8euxACxx+beO1XPfvZi1cMywppokqhOsZaS3QQ734dFeIS5+QoRYIqtEBq+4A8CbgdF7Rggmqa3T/BeLKAwpvxjdclbrNV81om0E23T2xkph4+MgK4QYIrV1XAYzxiiWHW/sUMo0OrJe7GEhqGPRIHJqj4QR4DQEwA0CSmHj4yArhBgitXVcBjPGFo96SUA6lqPnTYoJP1IsBgXAbuym6Duy0kIjeQE+ZOxZqNY6hsfTYEAU6wphjFynSAvUwsvNoVXz8gNq7otaxkolsFnonB1bWZtjIAqCDDFqgJj9CqhJ4qTlW8oqotCqrK/m628AFldzawtzAgQBSZrESiOi0Ff2IsFCCxCCB2CwBSrw0Exkkklq6dc6dS1O0Wh2NO5ReqqZW3hR4Ci/eq+/4t6kaxMEqZYQoOPOkSAKVaHg2Ikk4hitQsU81cejTQbKrCVKDBZg1AH6aRJWEHjnM0IRBIBg1BsJCHitn0hQNts5Ez4Khf4NfJiKRAdeG2uoSME3BSrbK6raxZRLE8SdVFlbSoiwBSrIpjRqIocCFrp1O1/irIin+bfUVEX1khoc1NsvHw0Sd32KXxC+tXVzNoYAVUQYIpVBUb9KtHaMnIgtKFYub/LjztpPYJh0F+yFyu/YKNuc/xMnLp4sjbVEWCKVR3S6FJIFJuaKOlQ3Z6nKE+ykH51NbO2MCNAXia9JkLdplMTJW3zJFEXVdamIgJMsSqCGY2qyMtM0eD7GKlKoJj0RwJZblM1BIhi6Z5JNaWKItLJFKuAwQc9IsAUq8dRMZBNtFdKK526ZpPOvEJnYTH/VJm60IZVm0ubXxSmPqQo92Gn+cvTBAcf9YcAU6z+xsRQFpGXSfE6dQ337O+yj6IusJprO7MBR0FxsdOFvFQNdhNKQh385WkAzKJHBJhi9TgqBrJJOy82xmal1xQTixsIEzbVGwFyMWOslsRY9Z8oTnFv2BfCV/ZulNOMgE4QYIrVyUAY0oy8wuKCIhnFTVWeOlG9DyULKPsoqkMbPoUUhMBQWizK76er2jLUQl9hsQsbCkgYXdh+8yHAFGu+MQ1fj2j1xMqZrLwqVvWGUxLk86LkBqmunBWGB4HTuYVoSKObsCpxcI+hXnCoQ6LAf/pDgClWf2NiHIuI/MCvVqv6DgpgSHGHAdmLBRhGFZokNJSq9wETj/bsacNCdf2s0CAI6NdMplj9jo3+LSMvViMHBd1PUbxYagWnLEZEgIaPnkvSwn6aJETkWuhnnYxAKAgwxYaCXrTXpehciuJraoEFaaZWtNDPOsOAgDtQrNwtadEc3eERkWuhn3UyAqEgoHeKDaVvXFdrBOiX5rRzUFIV8ubVU+tx1FQ/hXDpbkmLhkgz34dpgS3rDB0BptjQMYxeDbSu0RqnBQopiutDrWihn3WGAQEK4ZKvqUVzfB+mBaqsUy0EmGLVQlJvesJhD/mXKYqvqUV7KfHy1cfUihb6WWcYENA+1PWmm6IAABAASURBVKE8dq48txyG7nATjEBACDDFBgQXFz4DAa0dFCJvptgzQDfaCQUhaCi1sJ008yTRAlvWGToCTLGhYxi9GmhdozVOCxRSlEAxEbkW+svXybmqIkB7sdoFimmSEJGrajgrYwRUQIApVgUQo1YFkR+tcVqAkKKEoInItdDPOsOAAJEfDaUWzaUqrz4mItdCP+tkBEJBgCk2FPSiva7W22wpihdLa3S0Y22E/pdro9Zf2uFJUi7snKkTBJhidTIQhjSDyC9F8TW16ABpZgdFC2zDppOCEORratEoTxItUGWdaiHAFKsWktGoh8gvVZvfAACgqezFAgWDC+0m0FBq0RXSTL6yFvrDopMbMS0CTLGmHdowdCw8XmxeobOwWP6eTxh6xE2oi0BBkRPDB51EhEioLuTFkq+sunJWyAiEiABTbIgARnV1WtdSNQsUJ5dopoaiGmtjdp5uwmC7ZyiRVldSONShLqDG0qZ7a5lidT9EejXQ5XLRApqqrHFamBlrsybG2qCZGkKCxVgI0FZCcnyMTZvfYgIaqcoTxTn5RU6nC6csjICuEGCK1dVwGMkYe0ExrWnkRmhkeoriyLIXqxG8Wqule6NUZRA1ais1Qb7dCVPRXsA/eqgRxqw2eAR0S7HBd4lrhgcBWj1jbZaEWA1nUdVEuYBm8evxwjOoardyOlfSXorCgmrrduuLj7FiEuKE78MAAoveENBwcdRbV9kedRHwrJ4Wi0Vdzd7aqiVJis10FHpnctooCLgfJ1ZiuRrZbLFYdHoflpcljm8X2UeEiyPYGg2+AdQyxRpgkAIzMVylsxTPklY37dqsmhgH5dQWEizGQoBCHRTL1c5ymoR6mSQg1L8WilmXiucbixnni5fOEa+0E0seEafStUOANesWAaZY3Q6N3g3LdBTARFrdkNBI3F5srmxLoyZYrXYInHYHiuUvJmnXSrUkeR+WqYdQR4FdfHKrlIPrZX/jU4XFJk4fEGtmiP+dL76fIgocMp//ogYBptioGWq1O5qleLFEgWrr/kcfUXhWWFbPf1rllEoIlASKZbRfJZXlqHFPkojfhxXli7lDxZZFwhorej4g7t8uJu4XEw+IYfNEk16iuECsfEW82Vsc/aucPnCWSRFgijXpwGrfLaJYWt20a60aP+6kHbjaaybPkrxM7VqjSUJtaddKJZoRH/7ibpH+s4hLEbd+Kfo8JlLqyipxSeKcQWL4InHDRyK5nsjYJmb1EZs/lZf4LwoQYIqNgkHWpou0otHqpk0LUit5ydSWPOc/PSJQoU2ZFOpQ7pMqLBTyhar0TJzSVsjKglXw5wLxx3xhjRFD3xNndyutxWIRrQaLMb+I5n1FUZ5Y8G/x80v8GFRplMx4zhRrxlENS58ylbhcVWUbTLsGU5XVmdrSrhXWrBECmcqGPd0nadQE1FZTnonLjOBuQs5xsXgCLBE9HxTN+shEuX9VaokbPxYX3iUvLntSfH2/cPKbQSUYJv5jijXx4GrbtSzlSRbNA8UKhUdy9dQWRZNrp90EzSlW8WKzlHu+yAC64nmRlynqtRc9xldigNUmBj4rBk8VwiLWvy0W3SmKiwR/zIsAU6x5x1bjnmWSg6J4mdo1RYHo05GNAWrXPbNrzlQ8y6qKl6ldX4nCsyI1SU7sEhvmyN4NeE7Y/Huw64LR4pq3hMUmfv9IfDpKFPED8xI/U/4xxZpyWMPRKVrRaHXTrj3Snxmp1VO7jkWH5ky6D1O8TO16TKGUTIXOtWulQs0/TRXOItGiv2jSo8IyZS+0v1YMfV/Y4sSWhWL+zaIwr2wRzvGBgFEuMcUaZaR0ZydRLK1u2hlH+h0FxQVFutm1wmr410L5MoGFd8lvOm79ShTYtUPAuJqLnS76GQAKRWjXEZokkaHY04fFn5/IrvV6SB4D+mt1mRj2kYhJFDuWio+G8ldmAwLPKIWZYo0yUrqzk1Y08jK1My4lIdaivJ+RGF27hvzVvPlTMa2jfLfAmhli0wfym47zbxIvtZZc6zjpr5LoKOcJ7xMFatdp+lJQZGbIujeEs1A07iYadgmmg837ipsXiNgqYvdy8eF1Ij8nGCVcR8cI6I9idQwWm+ZBwCkdFPneYK232WxWS2qC3N/KiuDDLNRtl0t8+7j8ukXOEZF6lrjgdvndx84jRbXGIj9Lcu3/uohNc/mbGKLkQ+H9lPiYGJu26wx5yTn5RYXF4Q11FOaK9bNld7uNlcfg/tIuFrd8LuJTxd6V4oOrRV5WcGq4lj4R0Hbq67PPbFXoCGTnFYFxoEdrB8XTBDnNOI2Y/PiMWDVdtt7zAXHPJjH4RfkGnyteFff8Lm6YK2q3Fo4TYuEY8fFwkZspi0X9X6ayEUtfWtUUjNSSZ+6ywrxnv/VLyYi4xzpnUEgdbNxVvpsioZrYv1a8d6XgcEhIaOqrMlOsvsYjFGvCWTdT8SmT4mxxMZpPIYpFh3v1LIXm34vFTy/KvMFTpfMaI1+KK0/xZ7UKbKrd8bO4dLKwxoqtX4g3eopDm3AlyiVTITwaPk2hsMlQh3wNcmaYn3j67X3Zr043C6tNJkL5O+s8+U6opJri0G/ivX8Je0YoyriufhDQfH3UT1fZEhURoLWMAnQqqi1XFTnK1GK5BTTPzDkmFt0pW7nwLnHBaJko+2eLld+JHLVUxo0z94p3Bgm4OGWLRVMOvVma3guhdb8jsB17Kl3s+UkIi+g0TKjyqd9BjPhaVKkjjvwp5lwuso+qopWVRBYBptjI4m/U1smn9AToNO0GrZ7kEmnTUGValz0hck/JFwv0nVJJ0bM6i//7WTS7VBQ6xPxbxMpXo3lrNjNcgWIhBN2HZSnBFZyGQ36fJ1tp2lveVMmUGn91WouRi0VKfXF8q5gzWJw+pIZS1hFJBJhiI4m+cdsmwgtDDBAQVU2UMcAsJeqI03DLwQ3itw9ko5e9LLzjwzKrvL/EavIleefD2XWJ7yeLL8aKYvlcWHlFTZ7nniQlG6Wa9pamYmY4A8WbP5M96niDPKr4V6uFZNmqjcSJnTIWkrlPRd2sKvwIhINiZ8yYkZaWlpCQ0LVr13Xr1pXt5KxZs3r06FFd+fTt27fcMmVrcU4EEchSHJQwxQCVdwNRixHo8vLnZaMdhopGF8iEP3+2GHHZVDHoBWGxSnr+8Fr5UIw/FQ1XxqfBRHhEfj4LqnCxqkLk1KIK6ipVcWyr/M0cW5z8FZ1KCwdaoEZTybLV08SpdPHOYHFyd6AKuLx+ENCcYufPnz9+/PjJkydv3LixY8eOAwYMOHbsWKn+L1++fNiwYT/++OPq1asbNWrUv3//gwcPlirDp7pC4JTiLoRn9aRWyCUKNwiHNokd30qmDOLFAl3/Twyb7/7K4+yBIutAuI2PdHuZ4bwPU14gFb5J8tdCiS52BBKqyoTqf9UaixGLRc3mImu/eOcykbFD9RZYYXgQ0JxiX3755dGjR48cObJNmzYzZ85MSkqaPXt2qb59+OGHd955Z6dOnVq1avXWW285nc5ly5aVKsOnukLgpL0A9tSo4vVgLc61EdrxzVRIXZsWKta68hV5rd21omYzmQj0r2V/6Y4k1xPHtohZl4rDvweqwNDlifDC8KUdoEQBlfCFOrYoFNt2CJoOTiqvVfUsybK1W4nsQwK3aNiwqLwOl9AdAtpSbEFBwYYNGxD7pX5brVak4arSablHh8NRWFhYo0aNUlfz8/NPe31KXeXTMCMQToqtofzYzinFJQprN7OPiL+/ki12v1ceg/tr0Enc9r2o3VrkHBGzB4nt3wanxoi1Til3ReF57JxCHdSi5lgd+1sc/1u+XjjEr8NWamhKXfmMcf2OwpEh5lwhdnxfaQ0uoDcErJoalJGRUVxcXLduXU8rSB85csRzWjbx0EMPNWjQAExc6tJzzz1XteSDYHKpq3waZgTCSrHJ0lc+kSP95rB2c+N78vXujS4U9dqF1G61RmLUUtGklyi0i49ucL8PKCSNxqh80p4PQ2sqw4eEpkKPnZ8Kz33YlkWyL836iARtosRSe8lflVqSZZteokyeoYIeYy65GJX/GqzT2lJsoGA8//zz8+bN+/zzzxMSEkrVnThxYlbJZ//+/aWu8mmYETgRxkBxTSUcTaQevm4WF7l/oazLv1VoFGvxTQtEp5uEq1h8dZ/4bpJwOlVQq28VJ5W7ohpV4sNgZlgnyfYlsketLpfHMPzFp8hn1NtfL2/4Pv8/8cu0aP4mWBjwVrcJbSm2Vq1aNpvt6NF/vkONdL169crtw9SpU0Gx3377bYcOHcoWiI+PT/X6lC3AOeFE4FQYKbaGQrG5hcW5BcXh6+Pu5eL0QZFYQ7S5Up1GY+LElTPEJY9KbVglP/23uX+/LK+w2K6MFw2f7LWWf9RKOO7D7BnyBUzoS4t+OIRJMHmuekPQm5Bxf7ZkonCG8f9CmDppzma0pdi4uLjOnTt7nl2i55i6detWFssXXnjhqaeeWrJkSZcuXcpe5RxdIeByuWgto3VNa9uS42PibHKinlACj1o359ZPv1DW/loRWzqg4i4QxD8Wi+j1oMBaaY0Vf30u3rtS2E8EocYQVWiGxNosqQnya81a20zhaOwmYHJq29bOZUK4RL32IqV8V0Gr1q1WMeAZ0f9pqX/t62L+zfyzPBIK3f/JlUtTI8ePHz9r1qx3331369atY8aMsdvtI0eORIvDhw9H7BcJyH/+85/HH3989uzZaWlp2KmF5OTwjzoBGJ0KvJMC5SdNaoYlBmixWKpXiQUWtGojobkUONwPOrW/Tv22Ot4gbvlMxFcV+9eIt/uJE7vUb0IHGmmwqifFYfjCYA5NRUzLnPwibZvb+Z3U3zyMLqxsr+TvorvFtbOFLV5sWyxmD4zCb4KVAGGYfzWn2KFDhyICPGnSpE6dOm3atAl+al3l6ad9+/YdPnyYcHr99dcLCgquvfba+iUfVKFLfPQDgXAXoT22hFhrYlzIbz/3z/YaCpfTBrB/NUIrhc22ghxRrbFoeH5oiiqo3aSnGPWtqNpYnNwlWXZ/Oe9jqaCmYbJpsGooQf4wGI2pmBgrZyNRu1YtIjy7U3mst0V/rZqoVG+7a+QDUFXqiKN/ill9xIENldbgAhFEQHOKRd/Gjh27d+/e/Pz8tWvXdu3aFTmQ5cuXz5kzBwlIeno6wjveMmXKFOSz6BOBk8pzm+Q3hMfCmlXi0BBROxKay+ZPZRPtrhUWi0xo8VenlfwyT4NzheOEmHO5jBtr0UrkdJ5UovoUvw2PFUTnRO1atXhwo3xbdUJVre69/LS70fli9A+ibjuRc1S+yphe5ehnXS4WXgTCQbHh7RG3pjkCtHpS8FbzxpQGaPVU30FRlJc+5J2Wb3RCLjZicdRO6FuPLQeJ4nzxyQjx/RNmeoYF26JAroYSfkAiDEJ0ru19GEWJm14ibOHYYPYFWrVG4t9LRMuBoihPLBgpfnjaTJPHV8eNdo0B+dGqAAAQAElEQVQp1mgjpgN7w7961iAvVvGeNQdg1zJRXCDfXVe3reZtxVURN3zoflJ05cviw+uE46TmjYalAbofovBDWBoU7kmiPOuuVYs7lI3YcD5L7KMn8SnihrnuyfPTi2Lu9aaZPD46bbhLTLGGG7LIG0xf8A/n6kltaeugeHDd9o1Mav3iHtmG8me1ySdFr3lbxCQKsPubveXPhSpX9Hyo1DaiWKK9SgurUqCm4jFnKAFqVRSWVpJz3P11neZ9S1+K1DlNnqtnycmDTWKzTJ5IwalFu0yxWqBqcp0nFEehepLcHw1PV2sobwiidrVtsbhQbF8qmzhnsDyG7Q9B6du+E9XOFpl7xVv9xJ8LwtayRg3RYIWVYpVJouF9GG6AIvJ1nUpHqMP1wnvy/D6/0hpcIGwIMMWGDWrzNHRKoVja+gpPr+g1xSe1c1A83di3RuRlyjdONOrqyQtTol57cfty0ayPKMoVn44SX4039Lspwu/FEp1Tu5oMmTtKHOKzxJqYJmjywL3G5Pn8dvH1BENPHm0wioxWptjI4G7oVmkVC6sXS3uxCrVrCx1FiVsOFAjBadtSedqTaoibFoge98tr698Wb/UVGTtl2oB/NEmI9sJjPrVF3rP6LTqLZRgfeiP1jVg07VsweW78WPR8UJb6dZb8MphhJ4/sgln+mGLNMpJh7Mdx5d2ztZS4XHiaJY9Zq9XT0weXS2z7Wp6FbSNWNnbmH6j90kni5k9FUi35xcc3eoo/Pj6zhDHOTuTkw9Cayr0REmEQaouoXf3mdPJ1Hd8dw+Tp86i8S0uqKY78Id7sJcwUNPbdd71eZYrV68jo2K7jp/NgXZ1U9d4sCHU+pabyJEt2XlF+kZavZj2xS5xKF7Y4Ga31aY/mFxHxu2OlSOshf1/ls9Fi0VhR4NC8UfUaKChyns4rgj7yLJEIg1BbWlHsjm9lF/TwdR1ph8+/Fv3EHb/IyVOQIxA0XninKLD7rMAXNUSAKVZDcE2p2uVyHVcclNop8WHrYLWk2FibBc0dz5a+ERKayK4fpNrGF4r4ZJmI7F9qfTF8keg9UQiL+O196ZHAkRLG+GQoMyTGaqkexmfiaiXLCYnJiSmqPkz0jViwl/qqNdDonjyPCItVbPpQvNlbHP5dg2ZYZeUI6IFiK7eSS+gHgazcwsJiF+ypFcZAscViqa0soMfCQLHN+qB3uhDE/Xo/LG79QiTXExnb5e7aihdEsfQOdWFexUbQMNVKjrda5Y1RxQXVvEL3fNKBzlUbIh1+XadS5OTkeUjc+qVIqS8nz6w+4qcXDTF5Ku2ZsQowxRprvCJvLa2e1ZJi42PkK2HDZlBtJS6toRdbVCDSf5bd0Q/FSmuEaNJT3LlatBkinEXix2fE7AH6/+WAY+6tBOlWUifCcEyItaUqv+pzLFtuZKjZovy6jpBP7Yb513VC70PaxTJo3PpfcvL88LScPPwMVOioBqKBKTYQtPRWNhL2EMmRTxnO9uukyPX6mHZe7IFfBfaukmqJuu3D2S+/2kqqIa6bI66eJeKrioPrxcyLxa9vCZeMJfhVPeyFaJhoyMLZOD0fQK2r2S5txEbw1f+hdKZKTXH9e+KqN/+ZPOtm6XnyhNJXHdZlitXhoOjapGOKi0BBuXAaSus1PWmlSbu0EdvsEmHV5X8Ki0V0uF7cuUo6tYUO8fX94r1/iZO7NYEiZKXu+7CUhJA1Baagbirdh6nqxcqv6yib9Lr9uk6lIGHydByqTJ5e8lvXiyeI94fIJ/sqrcgFQkZAl6tJyL1iBdohQKsnEZ52rZTVXEdZr4+p5MWW1S/cFKubjdhyTBSiakNxyyIx8Hn5wrw9P4nXLhKr/ivAAeUWjlwmDVOkJsnR06o+E3dwgy5+XSf00ZSTZ6EY9KKcPLuXi9e6idUzdDh5Qu+orjQwxepqOAxgDFFsBLxYxUGh1tWHyXHS/frZppeor1xdjXCyLxwjPZK0HtIj+fYx+YaKo3+p20iI2o4roY46ypCFqCqg6kTqx9SlWHqpEyZGxH9dJyAsyi2MydP1djHmF3H2xQKxkKWPyMlzZHO5ZTlTFQSYYlWBMYqUkIMSfoql3V9qXX24cVMvXKJOG5FaX33lWmis0VQ+LPqv/8oNtkMbxRs9xQ/PhOWdeX51hoaJAg9+VVCpEE3LYwrBq6RSiB3KO6sNuhFbLgo1m8nJc8V09+R5s5dY9pR+Jk+5Jhs3kynWuGMXGcuPK6Ha8K+e5BKpvHp6IDRElNhjLSWwwXbecHHXWtHqcuEsEj+9IF7r6v4NAyoQuSP5keRThtMK9R93yj7i/kapUb4R6yfccGc73yonT+sr5OT5eap4vZsgf91PDVzMPwSYYv3DiUuVIHBMoVhyF0rywvEvkXpGTkGxU+0naV2uko3YS8LRE3XbgNs99AP5yGhKA/kAy9zrxUfDZELdVgLR5nS66NUTdFcUSNVQyxKp011gqLqo/s7v5b8NzhXJdWQilD8d1nVPnvflF69P7hYfXis+ulGc2qtDS41rElOscccuMpbT+hV+iq2VHAe3Dfyq/hvyMraL0weFLV40vigymIbYKnBpc6UYu05cdI+wxohti8WMrmLFC5EK/Z10FBQ5XTCqlvK2kBA7F1B1othjyrdyA6pYYWH6ZcMWAyosYIILbf4lxv4quo1VJs/XYsYFYvl/IjV5TABnqS4wxZYChE99IZBXWJyVW4gSdZXne5EIm8TYrDWVd8oTx6vZLkWJz+4m4pLUVBtmXfEpov9T8j0D8jGoPPmSCsSNtywK/zcgjylPG9VIiou1hXt5oUCxvaA4J79IBfiLC8WuH6UeM23Eyv6U+UtIFQOe+WfyLH9Wbjps/Sr8k6eMZTLD0H/h/j9gaLDY+EOZuQAhKc6WmhiDRJiFYsVHVfRRqANEsXp7qRPZFuixTiv5JMs1b8vQ36l08fFw8c4gcWBDoGpCKX8sOw/Vwx/nQKPJ8TGYnEgcU2WS7FsjCrLlTx4hUAylpheaPNfOFrTpMP8mMecycTCsk8d8GDPFmm9MNezRoUy5ejaolmixhO/ds57+oF2kD2VJmkdCHSnKF+krpSpzUCx6gqFpf624e73o+YD8BuS+1eKtPuLT20TmPlwMgxzOck+SMLRVtol6yos2jyg2lL0aWI77WeJ+On0bSWCd8a80Jk+7a2TcuMf9IiZB7P1FzOojFoziDVr/4CunVEQpthx7OEvXCBC91a+aEBErz6om2z14SlWK3b9WfkGwSh1Rp21EOqVVo4gb93lM3L1BdBwmm/jzE/HfLuL7KfItCvJcwz8aoAbKYGnYTAWqG1RLxJWDSrgFiZCEnrA12bPE/iASnywunVQyeSxi8wLxv/PFt4+L3Ex/anMZbwSYYr3R4HQlCFCg+CxlFaukqAaXafUkG1RTT1Hipr3N6alUPUtcNVPcvkJgg7Y4X6x8RbzaUax4UeRnqwZgGUU0QGdVi8zGNk1OCreUMS2QjBO7xPG/5RNApglvBNJ7WbZqQ2XyLBc0eVZNF9M6iJ+0nTyyXXP9McUacjwjZfRhJVBcv6p0FMJvQwOF2lVYPb1NJ4ptfql3ntnSDTrJDdobPhJ12oj8LPHj02JaR/nmxcJcLXpKHmSDCHuxjlC7tvVLqQHsklhdJqL2jybPjR+L2q1EXpb4oWTyFISMcHRAyhQbHeOsUi8pUBzp1VM9YrBnuF8s0PQSlRDSqxrssbUaLB8ZveZtUaOZcJwQ3z4mpnUS62YJ7EarajVR7FnK/ZCqiv1SdlZ1ef+nwn0YUWzrK/xq1dyFMHlaDhBjVomrZ4kaTd2TZ3onsfZN1SeP+YBkijXfmGrYI4oBNojU6qm0e+R0XrHTFWwnz6wn35so5K/XpdQ984JJz6xW0f5acdc68a//iaqNRM4RsXiCJNrVr4kCuyp9xtDQo0ZEdaroDEhJA8V7pokaUMUzCmcdFAfXC2ERrS4T/CEErDb5W093/apMnsYi56j45gEx/VyxZqZgj5YgKu/IFFseKpxXHgIulyuyD4vWTomPsVqwiNPXQsqzMcA8ihI3M7sLWwoVW4w47xb5MMvgqSKlvsg+JJZOFK+2l9tsuaE+z3I8O7/I6bJZLfQNq1Ith+G0obIHDE8a0zX45v7+StZt1FWk1JMJ/vMg4Jk8l70sv9tz+qBY8pAyeabyw1AekLwTTLHeaHDaFwJZuYWOgmKUqB+hJ4qxcNdTmg7VR0EfIC6XcFOsvn/ADqZqITHx4oLR4t7fxeWviuppMvqHbTYQ7fdPiJzj5TToX9bBTLlFVy81AYPlXw2VS2GGIK4Jnj9hLwheNUeJfWMXEyfOHyXu+U1c/oqodrZwZIgfnpJE+/0UkXPMd9Vou8oUG20jHnx/aX+rZpW4hFhb8FpCq9lAiRUfVJ66Ck2TkM+LZh+WX/5r3C1UVcatD6LtMlKM3SC32Wq3EvmnxcqXxSttxaKx4tjWILpFQxOpjVgYHBdjpdco0neHkBOwZB+R3wdFtdaX48BSIQKxCaLLv8XdG8XVb4narZXJ84ok2i/vFcf+rrBWlF1gio2yAQ+huwdOSQclUntsZDit3cGvnqSFjuTCnt1dYKWgnKg9IvrX4XoxZrUY+qFocJ4ozhe/vS9eu1C8f5XY8X1Ab9GjAIMeJglZEsyQ/rlAuJyi4fnSuQ+mfuk6Jj+Xk+c6MWaVuOEjcVZnUZQnNsyR7198/+pAJ48pgWKKNeWwatKpvSckxTauEZnvO1KXGirPi+47KS2hnOCPRLHm/rpOQOhYrQJ+2+gfxMglovUVwmKVgfQPrxEzuor17/j5SAvdhzVQnjkKqHEVCzdQQh0Hgn5FyR/zpDEdhsoj//mJACZPq8HitmVixGL564rCInYtE+7JM9vPyeNnU8YqxhRrrPGKpLXpJ+RDp2k1q0TQCGo9PUNaEpIZhXki/RepIWpfLCA7X96fxSLO7iaGfiB32i68U8SliIxt4qtx4qVW4puHKg0A7lXuw86O6CQ5u6a8C9x7MqhJcnSLOPKnsMaKdteUhw7n+UQAkyetu7jhwzMnz33i5dbim4fF8W0+K5e9aIYcqxk6wX0ICwK0ejZW1q+wNFhOI2m1JMGnK2RfzmX/s/avEUW5IqW+wAak/7WiqmT1NDHwOTH+L9H/GflIS36WWDtTBgDfGSwQSq3g27R7lLufJsowRQotug8jSwK2gVzYFv1FUo2A63IFDwI1miiTZ4sY+LycPHmZYu3rYsYFwufk8dQ2U4Ip1kyjqW1fyC2g9UvblirWTmv34ay8XOXZ5ooLVnZl+7eyBFxY3HfLFP9VgEBCVXHRWHHPJnHzpzIAiOjx3l/Ep6PEy23Ed5NExg7vavlFxbQDSn6k96VwppvWlvdhe44H7sUWFYjflShxR44SqzFiCaniwjHSo71pgTjnMvHP5Gktvn1cnNilRht61xEZitU7KmxfGQQKipz0kFFaRL3Y6kmx9z/AfAAAEABJREFUqQkxsI74HokgZfsSWbHlQHnkv0oRsFpF874yADhus+g9UX4h0pEhfpkm/tdFvNVX/Po2/brA/pO5TpeoEmernRxfqUrtCjSplQzlh7Ly8grld8yQ9le2fiHfqJBcT7Qc5G8VLlcpAlabaNFPDJsr/pk8J8Sq6eK/54m3+on1s839hVqm2EonCBeQCBw45cDqmRhrq50SydXTYrE0UYKQIW3Hwvc6uUtgvy3aXjohRzK0v6pnid4Pi3F/ys1a3KBYbOLAr+Lr8WLqOeKTkdl/LraJ4rNrVsEwhdZMSLVxH1Y1MRYqAt5Q+PUt1BKdR4iYOJngP3UR8EyeGz4SCMXDqT2wTnx1n5jaUnwyQiCwVFykboN60MYUq4dR8N+GiJWk1ersmkmRXT3Rf9qO3a3s+eE0GCEXNu1iEZ8STHWuY4sRra8QN84X47eK/k/LXxcozhd/fXbuz6NXxd89wTVH7P9VuFyRwglTlO7DAosVH/5D7FstrDGSYiNlejS0i8nTarC46RM5efo9VTJ5PhdzrxOvtBFLHxUHNkRw8qg+AkyxqkNqToU7juagY83qyBAcEhGUtJpV0HpIXuw2JUp8DgcDAWRoklJXXHS3/E7k7SvEBf9nt1Wta8nsk7lAvN1XTOsgN2sP/x6R5bKpEuoI7D7s55ckFm2uFKn1ZYL/tEYgpZ7ofo978nQdI5Jqyij96v+Jt/qIaR3Fd5PFoU0RmTzq9pspVl08Tattu0KxLetE3u2jh1nSMxyBYe0pnXtKOis4bTkABxYVELBYRINOYvALt9X64LaC+/c3vEzEVhGZ++Rm7Rs95X7tD8+Io3+Fc7mkUEcA92HHtootiyQUPSbII/+FDQGaPIOeF/dvky+vaHeNMnn2il9eFW/2kvu1y54SRzaHc/Ko23WmWHXxNK22ncey0beWdZNxjKw0qy1t2H4sO8j3vMvXFRWL2q353T3qjiOGY8uxvO+dnbMHzxQP7BTXvSta/0u+n/LETvHTC+L1i8T0TmLJIyL9F+EM8CmkwA2l+7Cdx2Xoxa/aP70ohEtGv+u28as8F1IdAVusQAD52tnK5Jnjnjwnd4ufp4qZ3cX0c2UMGZPHaPu1TLGqzxQTKnQ6XTuOydWqRd3Ie7HN6yTbrJZMR+HR0/nBYL11kax1ziB55D8/EPCzyLHs/KzcQgyNpLe4JNF2iBj6vlwur54lH9C1xYtT6WLNDDFnsJjaQiy8U/z9tXYv/WlVT07UbUeyMXUrt3//OrH5UyEsoueDgj8RR0BOnqtKJs9b8ts+tjhxao9ADJkmz+djxNYv1fr5Ra27a9W6AdZvAgQOZeU6CopjbZazayZFvDsJsTZ6mGXrkdMBG5OfI3Z8J2uBAOQ//KcaAuAz6EqrmYQBQsIt8SnyR0ZvnCce2iMfQu44TCRWF44TYtOHYt6N4oWm4sPrxdo3BZwVdwV1/kmrWSUuxopJu6/Sd23Cpf5GYdZzbxL1O6jTPGtRBQE5ea6T3/Z5cI+4/j3R4QaRUE3knhS/zxXzb5aTZ+5QsW6WOLlHldY0UsIUqxGwplK7/aiMEjetlRxr08WEaaX4KH8fllYFBvT2JfI15dWbiHq8mAaGXKWlaZKcowxNOYXjqsgw7FUzxYSd4tavRNcxolpj+YKtHUvdv+yNSODiB8T2pap4JzE26zlKxOXvSu/DfpkmDv0m4lPFpZPLMTukLK6sEgLxyaLNleLqN8QDu8StX5ZMnjyB/86LJwhsQKg6eVQy2q1GFyum2xb+R68I/HngNExr2yAVRz1I6/rSkspXz7K2blko89peJSwWmeA/9RDYclhOkpYKsfnSaosRTXqIQc+Le/8Qd/wi+j4h0noIa6yAI7vuTTH3evGfJuK9IQLMd3BjKLu2dB+2xfd92IEN4sdnpbUDnxfJdWSC//SMgJw8Pf+ZPJdOEmdfLKwxXpMnTbz7Lzl5cNuE+IQO+sIUq4NB0L0Jfx7MhI3tG1bFUQ/iXj0PyTU9AHs4ShwAWAEX/eNAFup08H+S4C6nXjtx8Tgx4isZRr5hrvzx0aqN5U/p7f5RfDdJzLpE0u3cG8TqGeLwH8LphH7/he7Dth6ueJJkHRDzhglnoXSvO93ov2YuqTkClTZAk6fH/WLk1wJhZJo8iIsUF4g9K+TkebO3eKGJ+GiYWP1aEJOn0vb9L8AU6z9W0VuSVs/2Z+mFYonsdx7Pyc4rDGBUtn4po8Q1mnKUOADQ/CuKgdilPL7boWE1/2qcWQq7bq0uE5e/Isb9IcauFwOek09IxVcV+Vli+zdi6SPijR7ixaZi3k1i7RsyruvHY6UUdPnjQKar3JdgnEoXcy6TX8Ss01Zc+RpHNc4cD0OdJaQKmjyIi4zdIAb+R7QcKCP/eVli22KxdKKcPKBbTJ41M+X3fwK8VwsRC6bYEAE0f/Wjp/OOZedbLaKNbgLFdVISzqqWiJXzD8Vz8ncMNn0oS3YcxuupxEHVvz8PZmE4MCi1Qnw7MbyTWi1EtzsFPSE1+kfR70nRvJ+ISxa5p8TfX4lvHhRv9hbPNxJzLhfLnhTYu3WcLLcruA+zWS1HT+cfzsorXQC1ZvWRTzhXTxM3fSywRpcuwecGREBOnubiwjvEjfOlazv6h38mT16mnDxLHpLf//lPmvjwOvlu5LB0McwUG5Y+cSOqIrBpv4wSN6+TnBQXo6rikJSd21h6S2SbX4pO7hHpPwthEaBYwR+VEaB7nQCixP60b7WJs84T3e8VNy8QD6WLUd+JPo+L5n0FvNtChxzNn1+Se7dwUP7bRXx2u/hluti5TOQcI92Yrq3rpyC9cd8pHKXAfdn1o3yGGTu+jhOiXnsxcomo2lBe4j+TIYBd27M6l0yeveK2ZfJxtmZ95L0aQiM7vhV7V4Wnx0yx4cHZwK2s2yO9hC5pNXTVh3MbV4c9v3lWT5z4lt8/kteb9hLVGskE/6mKwIa9ksY6NpL3PaoqLlFmixWNLhA9J4ibP5V0e+caccV00elmUbOFLHFih/hjvvjucfHB1fJLty80E29eIubf/KhlzsMxc6uvelZ8OU58cI0MNb8/ROxYKh+QufAuMep7fleiRM/0f6Dbhl1Ej/Hils/FQ3vF7SvEwOfDdqvNFGuQ+RU5M9fuOYHGuzbRF8Wep3ixv6afKnb68br54kKx8T30Qpx7izzyn6oIYAjW7JaT5MKmNVVVXIEyq1XUaS063yqGzBB3rxcP7BbD5otLHpPf66jZXCBQ4cgQhzaKrV92y1hwR8xX3Y+8Lza8I3Z+L0PNCVXlQ1V3rhUDnxWxCYI/0YYA6LZBJ3HhGNH80vB0nSk2PDgbtZWs3MK/lAd3w7R6+o1T+7OqpsTHKOZlVV5pyyKRfVgk15XPjlZemksEhsCWQ6ez84owHO0isltfpaY4Z6Do9YB8O8HdG8QjB6WbcsNcMejFnAvufaPosneKBuZd9IB8lgqbcw/skolaYGLBH0YgDAgwxYYBZAM3gSixyyXSaibVTdXXLX+MzXphM+kz/bwjwze+8uqa1+WxyygREy8T/KcqAqt2ySHo2rQGBkVVxUEpi6si4Ka0ukx0vT158JOf1Pi/J4qG/1B/lHResTmHgHNQWrkSIxAcAkyxweEWLbWWbT2KrvZoURtHvUmPFrVg0spKKXbfGnFwvbDFiS4jUZ5FdQSWbzsOnd2ayeFAQldCk+TnHdJCXRnGxkQJAkyxUTLQwXTT6XR9v1U+n9mvTd1g6mtcp6dC/OvST56yF/hq6sdn5NWON4jkOjLBf/4i4Fc5gI8hQNF+rXU5SVrKu8NlW49hwxhGsjACYUaAKTbMgBupud/2Z2bk5CfHx+htI5ZATKtVpU39VCydS/86QjnlHPf8LPb8JKyxoucD5VzlrJAR+H7rUQxB6/qpjXXwExFle3NRs5opCTHHsvN/TT9Z9irnMAJaI8AUqzXCBtb/+W8HYH2fVnXiYnQ6Ty7rUB8Wfv3nYRzLEadTfD9F5nceIao1lgn+UxuBL34/BJUD2urRhYVh8TG2AW3rIfHVH9JOJMIh3AYjUIKATpfOEvP434ghkFdYvGiTXJWu79IoYkZU1vDlCsWu3Jmxv9zfLPvtfbkLG5csek6oTBNfDwYBwA7wUfPqcxviqE+5omMDGPbFpkOOgiIkWBiBcCLAFBtOtI3UFpak7Lyis6olItSmW7vPrlmlR4taLpf4YM3e0kaePiy+V36e7JJHRYr0Y0oX4POQEZi7bh/AxxDoM0pM/bu4ea3GNZJO5xUt/E3eMlImH/WJgPmsYoo135iq0CPsrr22fCcUDe92ttWq6999u7VbGuycu3bfKe+HnpzF4vPb5asG6ncUF9yOAiyqI5DpKHh/tbyzuanr2aorV1GhzWrBNIbCt1buLioO7Od6UIuFEQgFAabYUNAzbd0FG/ann3BUT4q9+UJdr54YAGwVt6qXkp1f9PqKXTh1C7Zg9/wkYpPENW8LW4w7k/9RFYGZK3bn5BcB/P66fODcu69Dz29Uo0rc7uP2+ev3e+dzmhHQGoFwUazW/WD96iFwPDv/2cV/Q99dlzSvEq93foKT/dDAVrB29so9mw8qb3pa9V+xajpyxBXTRC3lHbbyhP/URGDLodNv/bwbGif0PwdDgISeJSUh9p4+8o1OLy7ddvR0np5NZdtMhgBTrMkGNNTuFBY7x87dmJVb2Lp+6oiLZAw2VI3a1+99Tu1B7eoVOV3j5q7P/eZx8e1jss1LHhMdrpcJ/lMbAYSIMUkAOGDvq3sXlnp/Y9ez2zZIzXQU3jvvt/yiYsrkIyOgNQLhoNgZM2akpaUlJCR07dp13bp15Xbpk08+adWqFcq0b99+8eLF5ZaJzsxw9jq3oHjMBxvX7jlZJc42/YZOungfnh/9t1gsz1zVvltKxjPZjySuVfzXPo/xU8R+IBdMkRM5+bfOXrc7w35WtcSnhrQLRkUk6sTFWKfd0AkTe83uk3d+sBEh7khYwW1GHQKaU+z8+fPHjx8/efLkjRs3duzYccCAAceOyRcGeSO9atWqYcOGjRo16rfffhuifDZv3uxdgNNaI+ByuVZsPz54+s/fbz0aH2OdcdN5LerK39rUul0V9LtcYv+6Gt/eO7fovq7Wv7NdiY/Zxn2WPAw+lgrKWYUXAkXFzoW/HRzw6k+/H8jCPv1bt3aplWykdz43r5Pyxi1d4mzWZX8f+9f/Vv647RimvVf/OMkIqI+A5hT78ssvjx49euTIkW3atJk5c2ZSUtLs2bNL9WPatGkDBw584IEHWrdu/dRTT5133nn/+9//SpXhU3URcDpdmY6CHUezF/95+Llvtl768gq4Jnsy7PVSE94f1bX3OXp912BRgfzN7ePbxPZvxeoZ8oe4X24t3u4nfp9rcRU7mvQfm/LqB/YLxn/8+0XP/zBp0eZFmw7+dSjrlL2AF9Mg5k+x05XlKMQON2B8bOGfPV74cdz8TWw8c5kAABAASURBVBk5BS3qJC8YcxG2EoLQGdkqF7eo9dHtF9ZNjd993D7ynV8vmbr8ucVbl2w+vP1o9um8Qp4kkR0dU7auLcUWFBRs2LChb9++hJ3VakV69erVdOo5Igf5nlN4usjxnFIiPz//tNeHMkM/blo2b9dT53pJp11P/iO7n+x4pnTY/eQ/sufJDh5B/p4n23tL+pPt/pEn2qZ7yd4n2p4pbfY+8Y/se6L1mdJq3xP/yP4nWp0hU87Z7yUHprT0loNTWkAOTGlBgnSJND/4RIuc/7ROfK1ThwUX37Lm8vdOj1oVf8+m1PGrEu65YGFP8XLbM6WNeNlLXmotzpBW4iUvmXqOOENaiqle8mILcYY0Fy96yQvNxBnSVLxQIv9pIp6uJ56uLaa2EDMuEHOvE0sfEX/Ml79SF5MoOt4oRn2fdOsnb9x73YMDz4GPdSw7/73Ve++dt+my6SvPfeq75o9+027y0vOf+b7HCz9gYe0zdfmlLy3v+/KKfi+vGPDKTwNf/WnQtJ/LCvIrFVQvK/1fWVFK0FApQetlBVaVkj4vLS9Hpi5HF7wFnSolvV/8saz0evHHUtLzhR9LCSC64Jnv20xa0uyRxR2f/Pby/64EjB+s2Xc4K69Glbj7+7X86p6Lm9VODv1/X0Q0dD67+rfjeo3u0SQx1pZ+wvHGT7vv+GBj/1d+6jDl2xaPftN+ylL0HRABTMCOscAYYSgHlEySwdN+ZjEBAi8skU90hmEGakuxGRkZxcXFdev+83I1pI8cKf1GWeQg39NbpJHjOaXEc889V7Xk06hRI8oM/ViYfaJZ8W4v2dPM+Y80daafKXubOv+RJs69HkF+E+c+b0lz7v9HXAfSvORs14Ez5eDZrn+ksevQmXK4sesfaeQ6fIaII428pKE46i1niWOQhuIYCdIlcryR5XhDS4a3NLBkVCs4Yj19QGTtFzieIQfFaS/JPiTOkMMi20tyjogz5KjI8RL7MXGGHBd2L3FkiDPkhHCUSO5JUZSrjLhFJFQVdduJNkNEr4fE8C/EQ3vEVa+LRufjakKs7c7ezdc+0vfNWzqP7J7WqVG1WslxyC92unLyi45n5+8/mQtnHVuJu47bdx7L2XEsZ9vR7L+PZG89fLqsIL9SQfWysv1oTilBQ6UErZcVWFVK4G+VIxl2dMFb0KlSAv4oK3tPOErJvpOOUrL/ZC5uUBwF7meCalaJ63J29eHdzn771i6rHu5z96Ut4mNsgNS4UjUp9tHL2qx/rO+rQzsNu6Bx2wapVRNj0Z0ipys7rwh9B0QAE7BjLDBGGMptJZNky+HTLCZA4GBmLkY8DKItxarYgYkTJ2aVfPbvV+3LbWkXXPbnJe+4pc87f0qZs7nPu2659N3Nl74H+evS99zS972/3PL+X30hH2zp55at/T6Q0v/Drf3nkvw9YO7fAz6CbBvwEcnfAz/aNsgj87YNmr9t0Pztgz3y8fbBH28f/PGOyz7ZIWXBzstK5PIFOxXZdfmnbvnXZ7vOkM93X+mWPVcu3HPlIilDFu1RJP2qL0j2XvUFZN/VX54c9k3ByO/EbT+4ZfQP4gz5UYz2ktuXizNkhbjdS/7vJ3GG/Cz+z0vuWCnOkF/EHV4yZpU4Q1aLMV5y5xrhLfdsEg+li0knxMP7xJhfxPXvikseEU17idjEUjMtLsbav229yVe0XXhX9/WP9fv7qYFrH7n0xwm9v77n4k/HdPvkjm4f/1+3ebdf+NHoC+eO7vrhbV0/GNX1vX9f8P6ocgSXSgnKl5K5t3UtR0Z3hXJvQXOlBDaUlfm3X1hKYG1ZQS9KyYI7upUSdLY8uejTMWfIZ3deVEoA1E8PXLLhsb6AbsPj/RaMuejJK9td2rpuQqyxydV7nlSJjxly7lnPXd3+63t6/D65/5YnB6ye2OeH+3t9XTJJMAoYHQwZBhcjjunx7r8vYDEHAnf0auY9GbRLa0uxtWrVstlsR4/K3xylPiBdr17pt9khB/lUAEekkYOEt8THx6d6fbwvhZKu3SCtfa+r3dLz6vZSrmrXc4hbegxp1+NKSNseV7rl4ivbuuVfbS+GXNGmu1tad79CykWXt77oMpJW3S5r1W0w5Jxug0laXTj4nK4eGXRO14GQlhcMLJEBLS+Q0uL8/or0a35+iXTp11yRZl36uuW8S5udIX2anuuWJude0uTc3lI69W6iSFrHXmkdpZzdsRekcYeeNc65KO7sC0TDzm45q7M4Q84TZ3lJg3PFGdJJNPCS+h3FGdJB1PeSeu3FGdJO1POSum3FGdJG1PWSOq2Ft9RoIhKrC2vAqzyIoW5qQpNaVdo2qNr57Brnp9W4oEmNC5vW7Nas5kXNanVvXgtbdD1b1u7RohzBpVKC8qXkoua1ypFmtaDcW7o1ky16H2FDWenatGYpgbVlBb0oJV3SapQSdLY8qd757DPkvMbVSwmAalwzqWZyPKAL5f+XgeomxcXUr5rYtHYy+g7QgC1GAaOD8cLgYsQxPXq1rO1b+KpREAjbkwTaUmxcXFznzp2XLVtG/9OcTifS3bp1o1PPETnI95x+9913yPGccoIRYAQYAUaAETAiAtpSLBAZP378rFmz3n333a1bt44ZM8Zut48cORL5w4cPR+wXCci99967ZMmSl1566e+//54yZcr69evHjh2LfBZGgBFgBBiBKEDAtF3UnGKHDh06derUSZMmderUadOmTaDSusrTT/v27Tt8+DDhetFFF82dO/fNN9/s2LHjggULFi5c2K6dYb7STl3gIyPACDACjAAjUAoBzSkW7cEl3bt3b35+/tq1a7t27YocyPLly+fMmYMEyXXXXbdt2zaU2bx58+DBgymTj4wAI8AIMAKMgHER0JxijQsNW84IMAKMACPACISCAFNsKOhxXUaAEWAEGAFGoEIEmGIrhCbSF7h9RoARYAQYAWMjwBRr7PFj6xkBRoARYAR0iwBTrG6Hhg0LFgGuxwgwAoyAPhBgitXHOLAVjAAjwAgwAqZDgCnWdEPKHWIEgkWA6zECjIC6CDDFqosna2MEGAFGgBFgBNwIMMW6geB/GAFGgBEIFgGuxwiUjwBTbPm4cC4jwAgwAowAIxAiAkyxIQLI1RkBRoARYASCRcDs9QxJsS6XC+Nymj+MACPACDACjEBEEQAZESUhUVYMSbHZ2dnoSaNGjaryhxFgBBgBRoARiBACoCGQEVESEmVFO4ot25ZqOQ0aNNi/f39mZmaWGh+ogmU4qqHM/DoAFMMV0DAzYgxXQAgEWpgnWAQRy8zMBP6gJKyK5YohKdZqtTZs2BB3LakqfQCNSpqiQg3DFegwM2IBIcZwBQQXCjNiACEgUQsx0BDICJQEheWKISm23J6YJ5N7wggwAowAI2AKBJhiTTGM3AlGgBFgBBgB/SHAFCvi4+MnT56Mo/5GR48WASjdwqVHvARPsMCGhSdYYHjxBAsUr/AixhQrV8ApU6bgP3bgIxWNNQAUwxXQwDNiDFdACARamCeYnhFjig10dLg8I2A+BLhHjAAjoAkCTLGawMpKGQFGgBFgBBgBplieA4wAI8AIBIsA12MEfCIQ7RQ7Y8aMtLS0hISErl27rlu3zidW0Xjxp59+uuKKKxo0aGCxWBYuXOiBwOVyTZo0qX79+omJiX379t2xY4fnUjQnnnvuufPPPz8lJaVOnTpDhgzZtm2bB428vLy77rqrZs2aycnJ11xzzdGjRz2Xojnx+uuvd+jQgb7R2K1bt2+++YbQYLgIBx/H559/Hv8rx40bR2UYMcKh1HHKlClAySOtWrWiAmGDK6opdv78+ePHj588efLGjRs7duw4YMCAY8eO0QDwkRCw2+1ABjcidOo5vvDCC9OnT585c+batWurVKkC6DBlPVejNrFixQrw6Jo1a7777rvCwsL+/fsDQELjvvvu+/LLLz/55BOUOXTo0NVXX035UX5s2LAhqGLDhg3r16/v06fPlVde+ddffwEThgsg+JBff/31jTfewN2Jp4zhEPNYrnWibdu2h0s+K1eupObCBldUU+zLL788evTokSNHtmnTBmyRlJQ0e/ZsGgA+EgKDBg16+umnr7rqKjqlI1zYV1999bHHHsOCiP/k7733HjjD28elYlF4XLJkyYgRI/BfGvclc+bM2bdv34YNG4BDVlbW22+/jfkGFuncufM777yzatUqMDEuRbkgRjJ48OAWLVq0bNnymWeegYsPWBgu37MiJyfnpptumjVrVvXq1akkI0Y4lHuMiYmpV/KpVasWyoQTruil2IKCAix/CHICcYjVakV69erVSLP4RmDPnj1HjhwBXFSsatWqCLMzdISG54j/xkjXqFEDR8w0OLUexBCtaty4MSMGZDxSXFw8b948OP0IFzNcHljKTSBSctlll3mmE8owYgChIsE2Fra6mjZtivsS3PWiWDjh0oBi0QMjSEZGBv5X161b12Ms0mAOzyknKkKAUAJcngJIU6YnJ8oTTqcTm2Tdu3dv164doAA4cXFx1apVQ5qEESMccPzzzz/hvMbHx99xxx2ff/45QkoMF2CpSHAjgo0t7Pp7F2DEvNHwTuPuH/EkhJew6w/foEePHtnZ2eGEK3op1nsYOM0IqIsA/IzNmzdjNVRXrSm1nXPOOZs2bcKm/pgxY2699dYtW7aYspuqdGr//v333nvvhx9+mJCQoIpC0yvBVtd1112H/awBAwYsXrw4MzPz448/Dmevo5diEZS32WzeD3YijYh9ONEv1ZZRTgklwOUxGGnK9OREc2Ls2LFfffXVjz/+2LBhQ8IB4GBjAv+96RRHRgwgkMC/b968Obao4ZlhD3vatGkMFyFT9ogI57Fjx8477zzsL0JWrFgxffp0JOrWrcsTrCxcpXIQRsKW/86dO8M5waKXYvEfG/+rly1bRsOAyB7S2AeiUz76QKBJkyaYo4CLypw+fRouCEMHNFwuF/gV0c4ffvgBKCGHBDMtNjbWg9i2bduwJ8SIETjeR/w3zM/PZ7i8MfFOX3rppYirw+kn6dKlC/YXkUaCJ5g3UOWmc3Jydu3aVb9+/c6dO4cNruilWIzB+PHjZ82a9e67727duhVBKrvdPnLkSOSzeBDApMR/YAhysJOBBLjBYrFgo/Hpp5/+4osv8B9++PDhDRo0GDJkCMpESPTSLOLDH3zwwdy5c1NSUrDfA8nNzYVxVatWHTVqFOYbXFs4Iphm4NcLL7wQl6JcJk6c+NNPP6Wnp2MiIb18+XJwBsNV0azAvMLuvkeqVKlSs2ZNnDJiFSE2YcIE+PqYYKtWrbrqqqtsNtuwYcPCCVdUU+zQoUOnTp06adKkTp06gTywJY54S0VDFZ3569evP1f5oPtgCCQBF9IPPvjg3Xffffvtt59//vmgYUDHm0OA5fXXX8/KyurduzfulEnmz5+PfMgrr7xy+eWXX3PNNT179kQM4LPPPkMmC8KeuEXDdiz8s19//XUcKp49AAADYklEQVTp0qX9+vUDLAwXQAhIGLFy4Tpw4AA4FRPs+uuvx+3ImjVrateujZJhgyuqKRZAI6y3d+9exKYQ6uzatStyWLwRAFsg+Oktc+bMQQE4sk8++SS8tLy8vO+//x47HMhk8QaK0iNGjCBYcAsyY8aMkydPIlgCfgXLUn6Ej5Fu/u2334aHgf+A4FpMJOJXGMVwAYRKZfny5a+++ioVY8QIh1LHefPmHTp0CBMMXIt0s2bNqEDY4Ip2iiW4+cgIMAKMACPACKiOAFOs6pCyQkaAETA/AtxDRsAfBJhi/UGJyzACjAAjwAgwAgEjwBQbMGRcgRFgBBgBRiBYBKKrHlNsdI0395YRYAQYAUYgbAgwxYYNam6IEWAEGAFGILoQUJNiows57i0jwAgwAowAI+ATAaZYn/DwRUaAEWAEGAFGIFgEmGKDRU7NeqyLEWAEGAFGwIQIMMWacFC5S4xApQj07t173LhxlRbjAowAIxAKAkyxoaDHdSONALfPCDACjICOEWCK1fHgsGmMgDYIjBgxYsWKFdOmTbMon/T0dMEfRoAR0AABplgNQGWVjIC+EZg2bVq3bt1Gjx59WPk0atRI3/aydYyAURFgijXqyLHdjEDQCFStWjUuLi4pKame8rHZbEGr4oqMACPgAwGmWB/g8CVGgBFgBEohwKeMQAAIMMUGABYXZQQYAUaAEWAE/EeAKdZ/rLgkI2AeBBAoLi4uNk9/uCf6RyAqLWSKjcph505HPQJpaWlr165NT0/PyMhwOp1RjwcDwAhoggBTrCawslJGQOcITJgwwWaztWnTpnbt2vv27dO5tWweI2BQBFShWIP2nc1mBKIXgZYtW65evdrhcLhcLni00QsE95wR0BIBplgt0WXdjAAjwAgwAlGMAFNsRAefG2cEGAFGgBEwLwJMseYdW+4ZI8AIMAKMQEQRYIqNKPzceLAIcD1GgBFgBPSPAFOs/seILWQEGAFGgBEwJAJMsYYcNjaaEQgWAa7HCDAC4UOAKTZ8WHNLjAAjwAgwAlGFAFNsVA03d5YRYASCRYDrMQKBI8AUGzhmXIMRYAQYAUaAEfADAaZYP0DiIowAI8AIMALBIhDN9Zhio3n0ue+MACPACDACGiLAFKshuKyaEWAEGAFGIJoR+H8AAAD//8wRdjwAAAAGSURBVAMAFpGvRRDopNMAAAAASUVORK5CYII=)


*Per approfondimenti si rimanda agli Allegati A1–A12.*

***

## Il profilo di ritardo: interpretazione fisica

La funzione $f_D(\tau)$ descrive **come i rientri si distribuiscono nel tempo** dopo una consegna. In questa dispensa la chiameremo **profilo di ritardo** (o, in termini di sistemi dinamici, *funzione di memoria*).

Dal punto di vista probabilistico:

$$\int_0^{+\infty} f_D(\tau)\,d\tau = 1, \qquad f_D(\tau)\ge 0.$$

### Significato operativo

Un profilo di ritardo indica:

- come il passato viene “pesato” (quali consegne passate contano di più);
- con quale tempistica le consegne generano rientri.

Nel nostro caso:

- un profilo concentrato vicino a $\tau=0$ indica rientri rapidi (iter brevi, integrazioni immediate);
- un profilo con massa spostata su $\tau$ grandi indica rientri tardivi (attese ente/cliente, iter lunghi);
- una coda lunga implica che pochi rientri molto tardivi dominano l’andamento di lungo periodo.

### Esempi qualitativi di profilo di ritardo

- **Profilo di ritardo stretto**: la maggior parte dei rientri avviene poco dopo la consegna.
- **Profilo di ritardo largo**: i rientri sono distribuiti su un intervallo temporale ampio.
- **Profilo di ritardo con coda lunga**: pochi rientri molto tardivi dominano la dinamica di lungo periodo.

***

## Ritardi e instabilità: effetto sul sistema complessivo

### Accumulo nascosto

I ritardi introducono una forma di **accumulo nascosto**:

- il sistema può apparire scarico oggi,
- ma essere “carico potenziale” per effetto delle consegne passate.

Questo accumulo non è visibile nel WIP operativo, ma si manifesta nel tempo sotto forma di rientri.

### Interazione con il rework

Combinando Capitolo 6 e Capitolo 7:

- il rework determina *quanto* lavoro ritorna,
- il ritardo determina *quando* quel lavoro ritorna.

Un sistema con:

- alto $\alpha$ (molto rework),
- profilo di ritardo ampio,

può mostrare oscillazioni: periodi di apparente calma seguiti da ondate di rientri.

***

## Ritardi e legge di Little: una precisazione importante

La legge di Little:

$$L = \lambda W$$

rimane valida anche in presenza di ritardi, purché si definiscano in modo coerente:

- quale insieme di stati costituisce “il sistema” (che cosa conto dentro $N(t)$),
- e quale flusso $\lambda$ attraversa quel perimetro.

Operativamente, nei sistemi reali conviene spesso separare:

- **WIP operativo** (coda + servizio + attese interne che generano switching),
- **backlog latente** associato ad attese esterne (che non consumano servizio oggi, ma generano carico futuro).

Questa separazione è una scelta di controllo e diagnosi, non un limite della legge di Little.

***

## Implicazioni operative

Da un punto di vista teorico, il capitolo suggerisce alcune implicazioni generali:

- ridurre la varianza dei ritardi è spesso più importante che ridurne la media;
- rendere visibile il backlog latente aiuta a evitare false sensazioni di capacità disponibile;
- sistemi con retroazione e ritardi richiedono politiche di controllo più conservative rispetto a sistemi istantanei.

Queste implicazioni verranno formalizzate nel capitolo successivo.

***

## Sintesi del capitolo

In questo capitolo sono stati introdotti:

1. il concetto di ritardo esterno come variabile $D$;
2. la nozione di memoria nei sistemi di lavoro;
3. la rappresentazione del flusso di rientri tramite convoluzione:

$$\lambda_{\text{rw}}(t) = \alpha \int_0^{+\infty} c(t-\tau)\, f_D(\tau)\, d\tau;$$

4. l’interpretazione del profilo di ritardo come filtro del passato;
5. l’effetto combinato di retroazione e ritardi su stabilità e oscillazioni.

>**BOX — Modello matematico minimo (Cap. 6–7, livello “visite”)**
>
>$$\lambda(t)=\lambda_0(t)+\lambda_{\text{rw}}(t)$$
>
>$$\lambda_{\text{rw}}(t)=\alpha\int_{0}^{+\infty} c(t-\tau)\,f_D(\tau)\,d\tau$$
>
>con:
>
>- $c(t)$ = flusso di consegne di iterazione (visite completate),
>
>- $f_D(\tau)$ = profilo di ritardo condizionato (densità),
>
>- $\alpha$ = numero medio di visite di rework generate per consegna (può essere $>1$).

Nel Capitolo 8 verranno introdotti i concetti di **stabilità dinamica**, **punti di equilibrio** e **controllo**, collegando formalmente i risultati dei capitoli precedenti in un quadro unitario.

***

# Stabilità, punti fissi e linearizzazione
\chaptersubtitle{(dal comportamento osservato ai criteri matematici di controllo)}

Nei Capitoli 4–7 sono stati introdotti quattro ingredienti che, combinati, descrivono molte dinamiche tipiche dei sistemi di lavoro:

1. **saturazione e code** (M/M/1);
2. **variabilità e secondo momento** (M/G/1);
3. **retroazione da rework**;
4. **ritardi e memoria** (profilo di ritardo e convoluzione).

Questi ingredienti spiegano qualitativamente fenomeni osservabili:

- congestione improvvisa;
- coda lunga e tempi imprevedibili;
- cicli di “calma” seguiti da ondate di rientri;
- difficoltà a “svuotare” il sistema anche quando i nuovi arrivi diminuiscono.

A questo punto serve un passo concettuale: introdurre un linguaggio che permetta di rispondere a domande del tipo:

- Esiste un regime di funzionamento “stabile”?
- Quando un sistema tende spontaneamente a stabilizzarsi?
- Quando invece tende a divergere o oscillare?
- Quali leve interne possono cambiare la stabilità?

Queste domande sono proprie della teoria dei sistemi dinamici e del controllo. Il capitolo introduce in modo graduale:

- punto fisso (equilibrio);
- stabilità (intuitiva e poi formale);
- linearizzazione;
- Jacobiano;
- funzioni di Lyapunov.

L’obiettivo è mantenere il legame con il contesto dei capitoli precedenti: il linguaggio del controllo non viene introdotto come formalismo astratto, ma come strumento per descrivere la dinamica dei sistemi a retroazione con ritardi.

***

## Stato, dinamica ed equazione di evoluzione

### Che cosa si intende per “stato”

In un sistema dinamico, lo **stato** è un insieme minimo di variabili che, se conosciute a un istante, permettono (in linea di principio) di determinare l’evoluzione futura del sistema, dato l’ingresso.

Nel contesto dei capitoli precedenti, esempi di variabili di stato aggregate possono essere:

- $x_1(t)$: WIP operativo (job attivi o in attesa interna);
- $x_2(t)$: backlog latente (consegne passate che possono generare rientri);
- $x_3(t)$: tasso corrente di completamento o consegna.

Per mantenere generalità, si introduce una variabile di stato vettoriale:

$$x(t) \in \mathbb{R}^n.$$

### Equazione differenziale (caso continuo)

Una forma generale di dinamica continua è:

$$\dot{x}(t) = f(x(t), u(t)),$$

dove:

- $\dot{x}(t)$ è la derivata temporale (velocità di cambiamento dello stato);
- $u(t)$ è un ingresso o comando (es. gating, politica WIP, risorse allocate);
- $f$ è la funzione che descrive la dinamica.

**Nota di coerenza con i capitoli precedenti.**  
Nei capitoli sulle code si è usata spesso una descrizione probabilistica. Qui si introduce una descrizione deterministica aggregata: non contraddice la precedente, ma lavora a un livello di scala diverso (macro-dinamica media).

***

## Punto fisso (equilibrio): definizione e significato

### Definizione

Un **punto fisso** (o equilibrio) $x^*$ per un ingresso costante $u^*$ è uno stato in cui il sistema non cambia:

$$f(x^*, u^*) = 0.$$

Cioè, se il sistema parte da $x^*$ e l’ingresso rimane $u^*$, allora $x(t)=x^*$ per ogni $t$.

### Interpretazione operativa

Un equilibrio rappresenta un regime di funzionamento in cui:

- WIP e backlog si mantengono mediamente costanti;
- arrivi e completamenti sono bilanciati;
- non c’è accumulo netto nel tempo.

In sistemi di lavoro, questo corrisponde a una condizione in cui il sistema “respira”: non si svuota completamente, ma non esplode.

***

## Stabilità: intuizione e definizioni formali

### Intuizione

Un equilibrio è **stabile** se, partendo vicino, il sistema rimane vicino o torna vicino.

Un equilibrio è **instabile** se una piccola perturbazione cresce e porta lo stato lontano.

### Stabilità di Lyapunov (definizione)

L’equilibrio $x^*$ è **stabile (in senso di Lyapunov)** se:

per ogni $\varepsilon>0$ esiste $\delta>0$ tale che:

se $||x(0)-x^*||<\delta$ allora $||x(t)-x^*||<\varepsilon$ per ogni $t\ge 0$.

In parole semplici: partire abbastanza vicino implica non allontanarsi oltre una soglia.

>**Nota**: Qui $∣∣⋅∣∣$ indica una norma (ad es. euclidea); la scelta della norma non cambia il concetto di stabilità locale.

### Stabilità asintotica (definizione)

L’equilibrio è **asintoticamente stabile** se è stabile e inoltre:

$$\lim_{t\to\infty} x(t) = x^*.$$

Cioè: il sistema non solo resta vicino, ma converge all’equilibrio.

### Esempio 1D (esplicativo)

Considerare una dinamica scalare:

1) $\dot{x} = -k(x-x^*)$ con $k>0$  
La soluzione converge a $x^*$: equilibrio asintoticamente stabile.

2) $\dot{x} = +k(x-x^*)$ con $k>0$  
Ogni deviazione cresce: equilibrio instabile.

Questo esempio mostra che il segno del “meccanismo di richiamo” determina la stabilità.

***

## Perché serve la linearizzazione

Nei sistemi reali, $f(x,u)$ è in generale non lineare. Studiare la stabilità globale può essere difficile. Tuttavia, per comprendere cosa accade vicino a un equilibrio, è spesso sufficiente un’approssimazione lineare.

L’idea è:

- si considera una piccola perturbazione $\Delta x(t)=x(t)-x^*$;
- si espande $f$ in serie di Taylor intorno a $(x^*,u^*)$;
- si mantiene il primo ordine.

Questo produce un sistema lineare che approssima la dinamica locale.

***

## Linearizzazione: derivazione graduale

Partiamo da:

$$\dot{x}(t) = f(x(t), u(t)).$$

Supponiamo un ingresso costante $u(t)=u^*$ e un equilibrio $x^*$ tale che:

$$f(x^*,u^*)=0.$$

Definiamo la perturbazione:

$$\Delta x(t) = x(t)-x^*.$$

Sviluppo di Taylor al primo ordine:

$$f(x^*+\Delta x, u^*) \approx f(x^*,u^*) + J(x^*)\,\Delta x.$$

Poiché $f(x^*,u^*)=0$:

$$\dot{\Delta x}(t) \approx J(x^*)\,\Delta x(t).$$

Questa è la dinamica linearizzata.

***

## Jacobiano: definizione e interpretazione

### Definizione

Il **Jacobiano** di $f$ rispetto a $x$ è la matrice delle derivate parziali:

$$J(x) = \frac{\partial f}{\partial x}(x,u^*) = \begin{bmatrix} \frac{\partial f_1}{\partial x_1} & \cdots & \frac{\partial f_1}{\partial x_n}\\ \vdots & \ddots & \vdots\\ \frac{\partial f_n}{\partial x_1} & \cdots & \frac{\partial f_n}{\partial x_n} \end{bmatrix}.$$

Valutato in $x^*$, determina la dinamica locale.

### Interpretazione fisica

Gli elementi del Jacobiano misurano “quanto” una variabile influenza la velocità di cambiamento di un’altra variabile, vicino all’equilibrio.

Esempio: se $x_1$ è il WIP operativo e $f_1$ la sua dinamica, allora:

- $\partial f_1/\partial x_1$ misura l’effetto di un incremento del WIP sulla sua crescita o decrescita.

Un valore negativo è “dissipativo” (tende a ridurre perturbazioni). Un valore positivo è “amplificativo” (tende ad amplificarle).

***

## Stabilità del sistema linearizzato: autovalori

Per il sistema linearizzato:

$$\dot{\Delta x} = J \Delta x,$$

la stabilità è determinata dagli **autovalori** di $J$.

### Criterio fondamentale (continuous-time)

Se tutti gli autovalori $\lambda_i$ di $J$ soddisfano:

$$\mathrm{Re}(\lambda_i) < 0,$$

allora l’equilibrio è localmente asintoticamente stabile.

Se esiste un autovalore con parte reale positiva, l’equilibrio è instabile.

### Esempio 2D (esplicativo)

Considerare:

$$J = \begin{bmatrix} -1 & 0\\ 0 & -2 \end{bmatrix}.$$

Gli autovalori sono $-1$ e $-2$: entrambi negativi, quindi il sistema converge all’equilibrio.

Se invece:

$$J = \begin{bmatrix} +0.1 & 0\\ 0 & -2 \end{bmatrix},$$

esiste un autovalore positivo: una componente cresce, quindi il sistema è instabile.

***

## Funzioni di Lyapunov: stabilità senza risolvere le equazioni

La linearizzazione è potente, ma è una teoria **locale**: descrive cosa accade vicino a $x^*$. Per studiare stabilità più generale, o per sistemi non lineari complessi, si usa l’approccio di Lyapunov.

### Idea intuitiva

Una **funzione di Lyapunov** è analoga a un’energia:

- se esiste una quantità $V(x)$ sempre non negativa;
- e questa quantità diminuisce lungo le traiettorie del sistema;
- allora il sistema “dissipa energia” e tende all’equilibrio.

Questo evita di dover risolvere esplicitamente la dinamica.

### Definizione (stabilità)

Una funzione $V:\mathbb{R}^n\to\mathbb{R}$ è una funzione di Lyapunov candidata se:

1. $V(x^*)=0$;
2. $V(x)>0$ per $x\neq x^*$ (positiva definita);
3. la derivata lungo le traiettorie:

$$\dot{V}(x) = \nabla V(x)\cdot f(x,u^*)$$

soddisfa $\dot{V}(x)\le 0$ in un intorno di $x^*$.

Se $\dot{V}(x) < 0$ (negativa definita), allora l’equilibrio è asintoticamente stabile.

***

## Esempio esplicativo 1D con Lyapunov

Considerare:

$$\dot{x} = -k(x-x^*), \quad k>0.$$

Scegliere:

$$V(x) = \frac{1}{2}(x-x^*)^2.$$

Allora:

- $V(x)\ge 0$ e $V(x)=0$ solo in $x=x^*$;
- derivata:

$$\dot{V}(x) = (x-x^*)\dot{x} = (x-x^*)(-k(x-x^*)) = -k(x-x^*)^2 \le 0.$$

Poiché è strettamente negativa per $x\neq x^*$, l’equilibrio è asintoticamente stabile.

Questo esempio mostra come la stabilità possa essere dimostrata senza risolvere l’equazione differenziale.

***

## Collegamento con retroazione e ritardi: anticipazione concettuale

Nei capitoli precedenti sono comparsi retroazione e ritardi. In termini di sistemi dinamici:

- la retroazione introduce dipendenza dello stato futuro dallo stato attuale;
- il ritardo introduce dipendenza dallo stato passato.

Questo significa che la dinamica può assumere forme come:

$$\dot{x}(t) = f(x(t), x(t-\tau)),$$

oppure, nel caso con profilo di ritardo (Cap. 7), una forma con memoria distribuita:

$$\dot{x}(t) = f\left(x(t), \int_0^{+\infty} x(t-\tau) k(\tau)\, d\tau\right).$$

In questi casi:

- il Jacobiano si estende;
- e le funzioni di Lyapunov richiedono strumenti più avanzati.

Nel capitolo successivo verranno introdotti questi strumenti (funzioni di Lyapunov per sistemi con ritardo e concetti affini), mantenendo continuità con le definizioni introdotte qui.

***

## Sintesi del capitolo

In questo capitolo sono stati introdotti, con gradualità:

1. lo stato $x(t)$ e la dinamica $\dot{x}=f(x,u)$;
2. il punto fisso (equilibrio) $f(x^*,u^*)=0$;
3. stabilità di Lyapunov e stabilità asintotica;
4. linearizzazione tramite perturbazione $\Delta x$;
5. Jacobiano $J=\partial f/\partial x$ e criterio di stabilità tramite autovalori;
6. funzioni di Lyapunov come metodo per dimostrare stabilità senza risolvere la dinamica.

Questi strumenti costituiscono la base teorica per analizzare sistemi con retroazione e ritardi in modo rigoroso e progettare politiche di controllo (gating, limiti WIP, priorità) con un fondamento matematico.

***

# Stabilità con ritardi e memoria distribuita
\chaptersubtitle{(Lyapunov–Krasovskii, profilo di ritardo, convoluzione e condizioni di stabilità)}

Nel Capitolo 8 sono stati introdotti stabilità, punti fissi, linearizzazione, Jacobiano e funzioni di Lyapunov per sistemi dinamici “istantanei”, cioè sistemi in cui la variazione dello stato dipende dallo stato presente $x(t)$.

Nel Capitolo 7, però, è stato introdotto un elemento che rompe questa struttura: **il ritardo**. Quando il comportamento del sistema dipende anche da stati passati, la dinamica non è più descritta solo da $x(t)$, ma da una *storia* recente del sistema. Questo capitolo estende gli strumenti di stabilità e Lyapunov al caso:

1. **ritardo discreto** (dipendenza da $x(t-\tau)$);
2. **memoria distribuita** (dipendenza da una convoluzione con profilo di ritardo).

L’obiettivo è mantenere una progressione graduale: prima si definisce il problema, poi si studia la linearizzazione, e infine si introduce la famiglia di strumenti chiamata **funzioni di Lyapunov–Krasovskii**.

Per ‘Lyapunov–Krasovskii’ intendiamo funzioni di energia che dipendono non solo da $x(t)$, ma dalla storia $x_t$ sull’intervallo di ritardo.

***

## Ritardo discreto: definizione ed esempio esplicativo

### Che cos’è un ritardo discreto

Un **ritardo discreto** $\tau>0$ significa che la dinamica al tempo $t$ dipende dallo stato a un tempo precedente $t-\tau$.

Una forma generale è:

$$\dot{x}(t) = f(x(t), x(t-\tau)).$$

Qui:

- $x(t)$ è lo stato presente,
- $x(t-\tau)$ è lo stato “di $\tau$ unità di tempo fa”.

### Esempio 1D (molto semplice)

Considerare:

$$\dot{x}(t) = -a\,x(t) - b\,x(t-\tau),$$

con $a>0$ e $b\ge 0$.

Interpretazione qualitativa:

- il termine $-a x(t)$ tende a riportare lo stato verso 0 (dissipazione);
- il termine $-b x(t-\tau)$ usa informazione passata: può rafforzare la dissipazione, ma può anche introdurre oscillazioni se la risposta è “in ritardo” rispetto allo stato attuale.

Questo esempio è utile perché, pur essendo lineare, mostra un fenomeno tipico: **il ritardo può destabilizzare un sistema che senza ritardo sarebbe stabile**.

***

## Perché con ritardo serve una “storia” come stato

Nei sistemi istantanei, lo stato $x(t)$ è sufficiente. Nei sistemi con ritardo, per determinare l’evoluzione futura serve conoscere:

$$x(s)\quad \text{per } s\in[t-\tau, t].$$

Cioè serve la funzione “storia”:

$$x_t(\theta) = x(t+\theta),\quad \theta\in[-\tau,0].$$

Questa notazione significa: si descrive lo stato non come un vettore, ma come una funzione definita su un intervallo di tempo passato. Questo è il motivo per cui i sistemi con ritardo sono detti **infinite-dimensionali** (lo spazio di stato è uno spazio di funzioni).

***

## Equilibrio e stabilità in presenza di ritardo

### Punto fisso

Un equilibrio $x^*$ (con ingresso costante) soddisfa, come prima:

$$f(x^*,x^*) = 0.$$

Infatti in equilibrio si ha $x(t)=x^*$ e quindi anche $x(t-\tau)=x^*$.

### Stabilità (idea)

L’idea di stabilità rimane: se si parte vicino all’equilibrio (in senso opportuno), si resta vicino o si converge. La differenza è che “vicino” va inteso rispetto alla storia, cioè rispetto alla funzione $x_t(\theta)$.

***

## Linearizzazione di un sistema con ritardo

Come nel Capitolo 8, si usa una perturbazione:

$$\Delta x(t)=x(t)-x^*.$$

Per un sistema con ritardo discreto:

$$\dot{x}(t)=f(x(t),x(t-\tau)),$$

la linearizzazione porta a:

$$\dot{\Delta x}(t)=A\,\Delta x(t)+B\,\Delta x(t-\tau),$$

dove:

$$A=\left.\frac{\partial f}{\partial x}\right|_{(x^*,x^*)}, \quad B=\left.\frac{\partial f}{\partial y}\right|_{(x^*,x^*)} $$

con $y$ che rappresenta l’argomento ritardato $x(t-\tau)$.

Questa è l’analogia del Jacobiano: ora compaiono due matrici, una per lo stato presente e una per lo stato ritardato.

***

## Stabilità del sistema linearizzato: idea di base

Per il sistema istantaneo $\dot{x}=Ax$, la stabilità dipende dagli autovalori di $A$.

Per il sistema con ritardo:

$$\dot{x}(t)=A x(t)+B x(t-\tau),$$

il criterio non dipende più solo da autovalori di una matrice finita: compare un’equazione caratteristica trascendente.

### Caso scalare (esempio esplicativo)

Per:

$$\dot{x}(t) = -a x(t) - b x(t-\tau),$$

si cerca una soluzione del tipo $x(t)=e^{st}$ e si ottiene:

$$
s + a + b e^{-s\tau}=0.
$$

Questa è l’equazione caratteristica: ha infinite radici $s$. La stabilità richiede che tutte abbiano parte reale negativa:

$$\mathrm{Re}(s)<0.$$

Non è necessario risolverla qui; serve capire il punto: **il ritardo crea un insieme infinito di modi dinamici** e quindi rende la stabilità più delicata.

***

## Memoria distribuita: dal ritardo discreto al profilo di ritardo (Capitolo 7)

Nel Capitolo 7 è stata introdotta una forma di memoria più generale della dipendenza da un singolo istante passato: la dipendenza da un intero passato **pesato** da un profilo di ritardo (funzione di memoria).

Una forma tipica è:

$$\dot{x}(t) = f\left(x(t), \int_0^{+\infty} x(t-\tau)\,k(\tau)\,d\tau\right).$$

Qui:

- $k(\tau)\ge 0$ è una **funzione peso** che descrive la distribuzione dei ritardi (profilo temporale della memoria);
- l’integrale è una convoluzione, cioè una media pesata del passato.

Questa struttura descrive casi in cui il “ritorno” non avviene a un tempo fisso, ma è distribuito su una gamma di ritardi con pesi diversi.

> Nota di coerenza con la notazione del modello rework: quando la memoria rappresenta i ritardi di rientro, si può porre $k(\tau)=f_D(\tau)$.

### Caso lineare con memoria distribuita

Un modello lineare fondamentale è:

$$\dot{x}(t) = A x(t) + \int_0^{+\infty} B(\tau)\,x(t-\tau)\,d\tau.$$

Se $B(\tau)=b\,k(\tau)$ (scalare o matriciale), allora la memoria è “separabile”: un’intensità $b$ e una forma temporale $k(\tau)$.

***

## Funzioni di Lyapunov–Krasovskii: perché servono

Nel Capitolo 8 una funzione di Lyapunov $V(x)$ dipendeva solo dallo stato $x(t)$. Con ritardo, lo stato è una storia: una funzione su un intervallo. Serve quindi un oggetto che dipenda da tutta la storia.

Una **funzione di Lyapunov–Krasovskii** è un funzionale:

$$V(x_t)$$

che associa un numero reale alla storia $x_t(\theta)$.

L’idea rimane la stessa:

- $V$ è positiva (misura “energia” o “distanza” dall’equilibrio),
- e decresce lungo le traiettorie.

***

## Esempio di funzionale di Lyapunov–Krasovskii (graduale)

Per un sistema con ritardo discreto $\tau$, una forma classica è:

$$V(x_t) = x(t)^T P x(t) + \int_{t-\tau}^{t} x(s)^T Q x(s)\,ds,$$

dove:

- $P$ e $Q$ sono matrici simmetriche positive definite (o semidefinite).

### Interpretazione intuitiva dei due termini

- Il primo termine $x(t)^T P x(t)$ misura l’energia nello stato presente.
- Il termine integrale misura l’energia accumulata nella storia recente. Se la storia ha valori grandi, il funzionale cresce.

Questo è coerente con l’idea di “memoria”: non basta sapere dove si è adesso, conta anche da dove si arriva.

***

## Derivata del funzionale: principio generale

La condizione di stabilità segue lo schema del Capitolo 8:

- se esiste un funzionale $V(x_t)$ tale che $V>0$ e $\dot{V}<0$ lungo le traiettorie, allora l’equilibrio è asintoticamente stabile.

Formalmente, si richiede:

1. $V(x_t)\ge \alpha(||x(t)||)$ per qualche funzione $\alpha$ positiva;
2. $\dot{V}(x_t)\le -\beta(||x(t)||)$ per qualche $\beta$ positiva.

In pratica, per sistemi lineari si traduce in condizioni su $P$, $Q$ e sulle matrici del sistema.

***

## Caso con profilo di ritardo: un funzionale tipico

Per memoria distribuita, una forma naturale include un integrale pesato dal profilo di ritardo:

$$V(x_t) = x(t)^T P x(t) + \int_0^{+\infty}\int_{t-\tau}^{t} x(s)^T Q(\tau)\,x(s)\,ds\,d\tau.$$

Interpretazione:

- $Q(\tau)$ pesa diversamente contributi a seconda di quanto sono “vecchi” (ritardo $\tau$).
- Se $k(\tau)$ ha coda lunga, anche stati molto passati contribuiscono.

Questo è un modo formale di dire: un sistema con coda lunga nei ritardi conserva memoria più a lungo.

***

## Esempio qualitativo: profilo di ritardo stretto vs profilo di ritardo lungo

### profilo di ritardo stretto

Se $k(\tau)$ è concentrato vicino a 0, la memoria è breve: il passato remoto pesa poco. In un sistema di lavoro questo corrisponde a rientri rapidi, in cui gli effetti delle consegne passate si esauriscono in fretta.

### profilo di ritardo con coda lunga

Se $k(\tau)$ ha coda lunga, il sistema conserva “potenziale di ritorno” per molto tempo. Anche dopo un periodo di calma negli arrivi esterni, possono arrivare rientri generati da consegne molto passate. Questo può produrre:

- ondate tardive;
- oscillazioni lente;
- difficoltà a stabilizzare il WIP.

***

## Collegamento operativo (senza prescrizioni): cosa indica la teoria

Dal punto di vista teorico, i ritardi:

1. aumentano la dimensione effettiva dello stato (serve la storia);
2. introducono possibilità di oscillazioni e instabilità anche quando il sistema istantaneo sarebbe stabile;
3. rendono critico il controllo della varianza dei ritardi e non solo della media.

Questi concetti preparano la fase successiva: tradurre la teoria in politiche di controllo semplici e misurabili (gating, limiti WIP, regole di priorità), che verrà affrontata nel Capitolo 10.

***

## Sintesi del capitolo

In questo capitolo sono stati introdotti:

1. sistemi con ritardo discreto: $\dot{x}(t)=f(x(t),x(t-\tau))$;
2. necessità di descrivere lo stato come storia $x_t(\theta)$;
3. linearizzazione: $\dot{\Delta x}(t)=A\Delta x(t)+B\Delta x(t-\tau)$;
4. memoria distribuita con profilo di ritardo: dipendenza da $\int_0^{+\infty} x(t-\tau)k(\tau)\,d\tau$;
5. funzioni di Lyapunov–Krasovskii come estensione naturale delle funzioni di Lyapunov;
6. interpretazione qualitativa del ruolo del profilo di ritardo sulla stabilità e sulle oscillazioni.

Il Capitolo 10 collegherà questi strumenti alla progettazione di regole di controllo in sistemi di lavoro: politiche che riducano l’amplificazione da retroazione e l’effetto destabilizzante dei ritardi.

***

# Politiche di controllo e progettazione del sistema
\chaptersubtitle{(gating, limiti WIP, priorità e stabilizzazione)}

Nei Capitoli 4–9 è stata costruita una base teorica progressiva per descrivere sistemi di lavoro come sistemi dinamici soggetti a:

- saturazione e congestione (M/M/1);
- variabilità dei tempi di servizio e ruolo del secondo momento (M/G/1);
- retroazione da rework;
- ritardi e memoria (profilo di ritardo e Lyapunov–Krasovskii);
- criteri di stabilità locale e strumenti di stabilità globale.

Il passo successivo è tradurre questa teoria in **politiche di controllo**: regole operative che modificano i parametri effettivi del sistema e ne aumentano la stabilità.

In questo capitolo il termine “controllo” non indica un controllo micro-manageriale sulle persone, ma la progettazione di regole semplici che agiscono su grandezze aggregate:

- tasso di ingresso effettivo;
- WIP (lavoro in corso);
- varianza del servizio;
- probabilità e molteplicità del rework;
- effetti destabilizzanti del ritardo.

L’obiettivo è costruire un set coerente di politiche che:
1) siano misurabili con pochi dati,
2) abbiano effetto sistemico (non solo locale),
3) siano compatibili con sistemi reali ad alta variabilità.

***

## Che cosa significa “controllare” un sistema di lavoro

### Variabili controllate, ingressi e disturbi

Un sistema dinamico può essere rappresentato come:

- variabili di stato $x(t)$ (es. WIP operativo, backlog latente);
- ingressi controllabili $u(t)$ (politiche e regole interne);
- disturbi $d(t)$ (arrivi esterni, richieste impreviste, tempi ente/cliente).

Una forma generale è:

$$\dot{x}(t) = f(x(t),u(t),d(t)).$$

Nel contesto dei capitoli precedenti:

- $u(t)$ può includere limiti al WIP, regole di ingresso, standardizzazione, politiche di revisione;
- $d(t)$ include variabilità degli arrivi, ritardi esterni, cambiamenti di scopo, richieste di integrazione.

Il controllo efficace non elimina $d(t)$, ma riduce l’amplificazione del sistema ai disturbi.

***

## Principio fondamentale: stabilizzare significa evitare l’avvicinamento a $\rho \to 1$

Dal Capitolo 5 (M/G/1):

$$W_q = \frac{\lambda \mathbb{E}[S^2]}{2(1-\rho)}, \quad \rho=\lambda\mathbb{E}[S].$$

Questa formula contiene un messaggio centrale:

> vicino a $\rho=1$ qualsiasi variabilità diventa pericolosa, perché $1/(1-\rho)$ amplifica tutto.

Quindi una politica di controllo efficace mira a:

- mantenere un margine stabile rispetto alla saturazione,
- ridurre variabilità e code lunghe che aumentano $\mathbb{E}[S^2]$,
- ridurre l’effetto della retroazione che aumenta $\lambda$ effettivo.

***

## Politica 1 — Gating: controllo dell’ingresso “pronto a partire”

### Definizione (semplice)

Il **gating** è una regola che decide quando un job può passare dal backlog “accettato” alla coda “pronta a partire” (To Do / Ready), sulla base di condizioni minime.

Non è una “valutazione qualitativa complessa” né richiede punteggi manuali: è un meccanismo binario basato su criteri osservabili.

### Perché funziona (legame con la teoria)

Il gating agisce su:

1. **$\lambda$ effettivo**: riduce l’ingresso immediato nel WIP operativo;
2. **$p_1$ e $r$** (Cap. 6): riduce rework generato da mancanza dati o ambiguità iniziali;
3. **$\mathbb{E}[S^2]$** (Cap. 5): riduce la varianza perché evita avvii su casi instabili o incompleti che tendono a “esplodere” in durata.

In termini di sistemi dinamici:

- riduce l’ampiezza dei disturbi che entrano nel sistema;
- riduce la probabilità di retroazioni autoalimentate.

### Esempio esplicativo (gating minimo)

Un gating minimale può essere:

- esiste un oggetto della richiesta definito (titolo/ambito);
- esistono input minimi disponibili (documenti di base);
- è definito il gate di consegna (cosa significa “consegnato”);
- esiste un referente esterno per risposte.

Se una condizione manca, il job resta nel backlog accettato (non entra nel WIP).

***

## Politica 2 — Limiti WIP: controllo della congestione

### Definizione

Un **limite WIP** è un vincolo sul numero massimo di job contemporaneamente in lavorazione (o in lavorazione + attesa interna).

Formalmente, se $L_{\text{WIP}}(t)$ è il numero di job in stati “attivi” (in corso e attese interne), un limite WIP impone:

$$L_{\text{WIP}}(t) \le W_{\max}.$$

### Legame con la legge di Little

Per Little:

$$L = \lambda W.$$

In un sistema reale $\lambda$ e $W$ si influenzano reciprocamente. Limitare $L$ impedisce che $W$ esploda senza controllo.

### Perché riduce anche il rework (meccanismo indiretto)

Un WIP alto implica:

- switching frequente;
- perdita di contesto;
- maggiore probabilità di errori o incompletezze;
- tempi più lunghi tra i passaggi, che aumentano la probabilità che cambino vincoli o interpretazioni.

Questi fattori aumentano $p_1$ e $r$ (Cap. 6) e amplificano l’effetto dei ritardi (Cap. 7–9). Ridurre WIP riduce quindi la probabilità di retroazione autoalimentata.

***

## Politica 3 — Regole di priorità: minimizzare l’attesa totale

### Perché le priorità contano nei sistemi variabili

In sistemi con job molto diversi, una regola FIFO pura può produrre tempi medi elevati e code lunghe. La teoria delle code mostra che alcune politiche riducono l’attesa media, a parità di carico.

Un principio noto (in forma qualitativa) è:

- servire prima i job più brevi riduce la permanenza media.

Questo è il senso di politiche tipo SJF (Shortest Job First). Tuttavia, nei sistemi reali la durata non è nota con precisione.

### Classi grossolane

Una soluzione pratica e coerente è usare classi di taglia (es. 1–3–8–20), trattando la priorità come una funzione della classe:

- priorità alta ai job piccoli per mantenere un flusso regolare,
- ma con un meccanismo di “aging” per evitare starvation dei job grandi.

Non serve stimare ore: basta una classe.

>**Nota**: si indica con 'starvation' il meccanismo secondo cui alcuni job (tipicamente grandi) rischiano di non essere mai serviti perché vengono sempre superati da job più ‘convenienti’ in base ai criteri di priorità imposti; per 'aging' si intende una regola che aumenta la priorità di un job col passare del tempo, proprio per evitare lo starvation.

### Esempio di regola semplice

- se il WIP è vicino al limite, eseguire sempre almeno un job piccolo prima di avviare un job grande;
- ogni job grande aumenta priorità con il tempo (aging).

Questa regola riduce oscillazioni e impedisce che i job grandi monopolizzino la capacità.

***

## Politica 4 — Standardizzazione selettiva: ridurre $\mathbb{E}[S^2]$

### Richiamo: perché conta il secondo momento

Dal Capitolo 5:

$$W_q = \frac{\lambda \mathbb{E}[S^2]}{2(1-\rho)}.$$

Ridurre $\mathbb{E}[S^2]$ è spesso più importante che ridurre leggermente $\mathbb{E}[S]$, perché $\mathbb{E}[S^2]$ cresce rapidamente con la coda lunga.

### Cosa significa standardizzare “selettivamente”

Standardizzare non significa rendere tutto uguale, ma ridurre la varianza dove è più conveniente:

- template per consegne ricorrenti;
- check-list di completezza prima della consegna;
- componenti modulari riutilizzabili;
- “pacchetti” di integrazioni tipiche.

Questo riduce:

- tempi estremi,
- dispersione,
- e quindi $\mathbb{E}[S^2]$.

***

## Politica 5 — Controllo del rework: ridurre $\mathbb{E}[K]$

Dal Capitolo 6, se $\mathbb{E}[K]$ è il numero medio di visite per iniziativa esterna, allora:

$$\lambda = \lambda_0 \mathbb{E}[K].$$

Ridurre $\mathbb{E}[K]$ è una delle leve più potenti perché agisce direttamente sul tasso effettivo.

### Leve interne tipiche

- migliorare completezza della prima consegna (riduce $p_1$);
- ridurre rework interno con review “a monte” (evita iterazioni tardive);
- ridurre molteplicità dei cicli (riduce $r$) raggruppando richieste e rispondendo in modo strutturato.

### Esempio numerico esplicativo

Se $\lambda_0=10$ job/mese e $\mathbb{E}[K]=2.8$, allora $\lambda=28$ visite/mese.  
Se una politica riduce $\mathbb{E}[K]$ a 2.2, allora $\lambda=22$ visite/mese.

La riduzione di $\lambda$ diminuisce $\rho$ e produce una riduzione non lineare di $W_q$ via il fattore $1/(1-\rho)$.

***

## Politica 6 — Gestione dei ritardi: ridurre varianza e rendere visibile il backlog latente

### Richiamo: profilo di ritardo e rientri

Dal Capitolo 7:

$$\lambda_{\text{rw}}(t) = \alpha \int_0^{+\infty} c(t-\tau)\, f_D(\tau)\, d\tau.$$

Qui $f_D(\tau)$ è il profilo di ritardo. La politica di controllo non può imporre $f_D$ all’esterno, ma può:

1. ridurre la quota di casi soggetti a ritardi lunghi (gating e completezza);
2. rendere visibile il “potenziale di rientro” associato a consegne passate.

***

## Architettura di controllo a due livelli: stabilizzazione + ottimizzazione

In sistemi ad alta variabilità, conviene separare:

1. **controllo di stabilità**: regole non negoziabili per mantenere $\rho$ lontano da 1 e WIP sotto controllo;
2. **ottimizzazione locale**: scelte di priorità e produttività che migliorano performance senza rompere la stabilità.

Esempio di regola “di stabilità”:

- non superare il limite WIP;
- non avviare job non pronti (gating).

Esempio di ottimizzazione:

- scegliere l’ordine di esecuzione tra job pronti per minimizzare attese.

***

## Metriche minime di controllo (3–4) coerenti con i capitoli

Per rendere queste politiche verificabili, serve un set ridotto di metriche, derivabili da eventi di flusso (stati, consegne, riaperture).

Un set coerente con i capitoli precedenti è:

1. **WIP medio e percentili**
   conteggio di job in stati attivi e attese interne.

2. **Tempo di ciclo fino a consegna**
   distribuzione (media + percentili) dei tempi da “inizio” a “consegna”.

3. **Tasso di riapertura per consegna**
   stima di $p_1$ e, se possibile, numero medio di riaperture tra i riaperti ($r$).

4. **Flusso di consegne**
   $c(t)$: numero di consegne per unità di tempo (utile anche per stimare backlog latente tramite convoluzione).

Con queste quattro grandezze si può stimare:

- $L$ e $W$ (Little),
- sensibilità alla variabilità (via dispersione dei tempi di ciclo),
- moltiplicatore del rework (Cap. 6),
- memoria e ondate di rientro (Cap. 7).

***

## Sintesi del capitolo

Questo capitolo ha tradotto la teoria in politiche di controllo coerenti:

1. **Gating**: controlla l’ingresso e riduce disturbi e rework.
2. **Limiti WIP**: evita congestione e riduce amplificazioni non lineari.
3. **Regole di priorità**: riducono tempi medi in presenza di variabilità.
4. **Standardizzazione selettiva**: riduce $\mathbb{E}[S^2]$ (coda lunga).
5. **Controllo del rework**: riduce $\mathbb{E}[K]$ e quindi $\lambda$ effettivo.
6. **Gestione dei ritardi**: riduce varianza dei ritardi dove possibile e rende visibile il backlog latente.

Nel Capitolo 11 verrà costruito un modello operativo minimo (stati, eventi, misure) che consenta di implementare queste politiche in un sistema di tracciamento senza aumentare in modo significativo il lavoro amministrativo.

***

# Modello operativo minimo: stati, eventi e misure essenziali
\chaptersubtitle{(come trasformare la teoria in un sistema di tracciamento “leggero” ma informativo)}

Il Capitolo 10 ha introdotto politiche di controllo (gating, limiti WIP, priorità, riduzione della varianza, controllo del rework e gestione dei ritardi) motivate da risultati teorici dei Capitoli 4–9.

Per applicare queste politiche in un contesto reale serve però un ponte operativo: un **modello di tracciamento** che renda misurabili le grandezze essenziali senza richiedere un carico amministrativo elevato.

Questo capitolo costruisce un modello operativo minimo basato su tre concetti:

1. **stati** (in quale fase si trova una iniziativa);
2. **eventi** (cambiamenti di stato o “gate” significativi);
3. **misure derivate** (metriche ottenute automaticamente dalle date degli eventi).

Il principio guida è:

> misurare ciò che serve per controllare la stabilità del sistema, non descrivere ogni dettaglio del lavoro.

***

## Unità di tracciamento: iniziativa, job e iterazione

Prima di definire stati ed eventi è necessario chiarire l’unità di lavoro su cui si misura il sistema.

### Iniziativa (unità primaria)

Una **iniziativa** (o pratica/progetto) è un’entità di lavoro che ha:

- un obiettivo definito (output atteso),
- una consegna o un insieme limitato di consegne come gate principali,
- un ciclo tecnico potenzialmente lungo,
- possibili rientri (rework) e attese esterne.

Nel modello teorico dei capitoli precedenti, una iniziativa corrisponde al “job” di livello macro.

### Job-visita e iterazione

Nei Capitoli 6–7 è stato introdotto che un job può “rientrare”: quindi esistono più **visite** al sistema.

Operativamente, conviene chiamare ciascuna visita una **iterazione**:

- Iterazione 1: prima lavorazione fino alla consegna.
- Iterazione 2,3,…: rientri (rework) fino a nuove consegne.

Il sistema di tracciamento deve essere in grado di rappresentare la distinzione tra:

- un’unica iniziativa,
- più iterazioni della stessa iniziativa.

### Decisione di modellazione (minima)

Esistono due strategie minime:

- **A. Un record per iniziativa, iterazioni implicite (riaperture)**
  Si registra una “consegna” e, se rientra, l’iniziativa viene riaperta e si registra una nuova consegna.

- **B. Un record per iterazione collegato all’iniziativa**
  Ogni rientro genera un record figlio collegato (maggiore granularità, maggiore sovraccarico).

Il modello operativo minimo privilegia (A) quando l’obiettivo è minimizzare inserimenti manuali. La distinzione tra iterazioni viene allora ottenuta da eventi ripetuti (consegna #1, consegna #2, ...).

***

## Stati minimi: cosa deve essere osservabile

Uno **stato** è una categoria mutuamente esclusiva che descrive dove si trova l’iniziativa nel flusso. Il numero di stati deve essere ridotto, perché ogni stato genera bisogno di:

- regole di transizione,
- interpretazioni condivise,
- dati coerenti.

### Principio di progettazione degli stati

Uno stato deve esistere solo se:

- produce una misura utile (tempo in stato, conteggio in stato);
- oppure abilita una decisione di controllo (limite WIP, gating, priorità).

In particolare, in coerenza con i capitoli precedenti, gli stati servono soprattutto a misurare:

- WIP operativo (Little);
- tempi di ciclo fino a consegna;
- tempi di attesa esterna (ritardi);
- riaperture (rework).

***

## Set di stati “tecnici” minimo coerente con le politiche di controllo

Si definisce un insieme di stati tecnici essenziali. Il modello assume due buffer separati:

- backlog accettato (non necessariamente pronto);
- coda pronta a partire (ready / to-do).

Poi distingue lavoro attivo, attese esterne e revisione interna.

### Stati proposti (minimi ma completi)

1. **Accettato – Backlog**
   L’iniziativa è stata accettata, ma non è ancora “pronta a partire” (gating non soddisfatto o priorità non assegnata).

2. **To Do (Pronto a partire)**
   L’iniziativa ha superato il gating minimo ed è pronta per essere presa in carico.

3. **In corso – WIP**
   Lavoro attivo in produzione tecnica.

4. **Stand-by attesa cliente**
   Attesa di dati/decisioni dal cliente.

5. **Stand-by attesa ente**
   Attesa di risposte/riscontri dall’ente (ritardo esterno).

6. **Stand-by revisione interna**
   Attesa di revisione/validazione interna prima della consegna o dopo modifiche.

7. **Consegnato**
   Gate principale di fine iterazione tecnica (consegna effettuata).

8. **Da fatturare**
   Stato amministrativo minimo per separare conclusione tecnica e chiusura economica.

9. **Concluso**
   Chiusura finale dell’iniziativa.

Questo set consente:

- misure di ciclo fino a consegna,
- misure di permanenza in attesa,
- definizione del WIP operativo (In corso + stand-by interni),
- stima del backlog latente (Consegne passate non ancora “definitive” se riaprono).

***

## Eventi: l’oggetto davvero misurabile

In pratica, più che gli stati contano gli **eventi**: cioè i passaggi tra stati e alcuni “gate” di progetto.

Un evento è sempre associato a:

- un timestamp,
- un cambiamento di condizione osservabile.

### Eventi minimi da registrare

Per ottenere misure robuste con impegno minimo, è sufficiente poter ricostruire:

- data di passaggio in **To Do** (pronto a partire),
- data di passaggio in **In corso** (inizio lavorazione),
- data di passaggio in **Consegnato** (fine iterazione),
- data di eventuale **riapertura** (ritorno da Consegnato a To Do o In corso),
- date di inizio/fine per stati di attesa (cliente/ente) se rilevanti.

La maggior parte di questi eventi è già implicita nel “cambio colonna” di una board o cambio stato in un CRM (Customer Relationship Management, cioè gestionale clienti/pratiche).

***

## Definizioni operative delle principali misure (derivabili dagli eventi)

Le misure vengono definite in modo che:

- siano calcolabili automaticamente;
- siano coerenti con Little e con i capitoli su rework e ritardi.

### Tempo di ciclo tecnico fino a consegna

Si definisce il tempo di ciclo tecnico dell’iterazione $i$ come:

$$T_{\text{ciclo},i} = t_{\text{consegna},i} - t_{\text{inizio},i}.$$

Dove:

- $t_{\text{inizio},i}$ = primo ingresso in “In corso – WIP” dell’iterazione;
- $t_{\text{consegna},i}$ = passaggio a “Consegnato”.

Questa misura è coerente con i modelli di coda (tempo nel sistema per un job-visita).

### Tempo di attesa esterna (cliente/ente)

Il tempo di attesa cliente nell’iterazione $i$ è:

$$T_{\text{cl},i} = \sum_j \left(t^{(j)}_{\text{fine attesa cl}} - t^{(j)}_{\text{inizio attesa cl}}\right).$$

Analogamente per l’attesa ente:

$$T_{\text{ente},i} = \sum_j \left(t^{(j)}_{\text{fine attesa ente}} - t^{(j)}_{\text{inizio attesa ente}}\right).$$

Questi tempi sono la base empirica per stimare la distribuzione dei ritardi $D$ o, più realisticamente, la sua parte osservabile.

### WIP operativo (conteggio)

Si definisce il WIP operativo a un tempo $t$ come:

$$L_{\text{WIP}}(t) = \#\{\text{iniziative in In corso o in stand-by interni al tempo }t\}.$$

Una scelta comune è includere:

- In corso – WIP,
- Stand-by revisione interna,

ed eventualmente (a seconda del contesto) anche le attese cliente/ente se queste generano carico cognitivo e switching.

Il punto non è la “verità assoluta”, ma la coerenza nel tempo.

### Flusso di consegne

Definiamo:

- $c(t)$ = numero di passaggi in “Consegnato” per unità di tempo.

Operativamente si può stimare su finestre discrete (settimana/mese):

$$c_{[t,t+\Delta]} = \frac{\#\{\text{consegne in }[t,t+\Delta]\}}{\Delta}.$$

Questa grandezza collega direttamente il modello del Capitolo 7 (convoluzione delle consegne passate) alla misura operativa.

### Rework: tasso di riapertura e molteplicità

Si definisce:

- $p_1$ = frazione di iniziative consegnate che vengono riaperte almeno una volta entro una finestra (es. 90 giorni).

La molteplicità $r$ si stima come:

$$r = \mathbb{E}[\text{numero di riaperture} \mid \text{almeno una riapertura}].$$

Queste misure permettono di stimare:

$$\mathbb{E}[K] \approx 1 + p_1 r$$

e quindi il fattore moltiplicativo del carico effettivo (Cap. 6).

***

## Politiche come regole sugli eventi (non come campi manuali)

Per contenere al minimo l'appesantimento "burocratico", le politiche dovrebbero essere implementate come:

- regole sullo spostamento tra stati,
- non come compilazione di nuovi campi.

### Gating come transizione consentita

Il gating può essere visto come:

- transizione consentita: Accettato → To Do
- transizione non consentita: Accettato → In corso (salto del gating)

In questo modo, la “prontezza” non è una proprietà manuale, ma è implicita nello stato.

### Limite WIP come regola di pull

Il limite WIP è implementabile come regola:

- si può spostare un’iniziativa da To Do a In corso solo se $L_{\text{WIP}}(t) < W_{\max}$.

Operativamente questo è un principio “pull”: si avvia lavoro solo quando c’è capacità.

***

## Modellare ritardi e backlog latente con misure semplici

Il Capitolo 7 ha introdotto che i rientri attesi dipendono dalle consegne passate e dal profilo di ritardo. In un sistema operativo minimo non si stima l’intero profilo di ritardo in modo analitico; tuttavia si può costruire una misura proxy utile.

### Finestra di esposizione al rientro

Definiamo una finestra $H$ (es. 90 o 120 giorni) in cui avvengono la maggior parte dei rientri.

Si definisce “backlog latente” al tempo $t$ come:

$$B_{\text{lat}}(t) = \#\{\text{iniziative consegnate in }[t-H,t]\ \text{non ancora concluse definitivamente}\}.$$

Questa quantità misura quanta “massa” di consegne recenti può ancora generare rientri.

### Relazione qualitativa con la convoluzione

Il backlog latente è una discretizzazione dell’idea:

$$\lambda_{\text{rw}}(t) = \alpha \int_0^{+\infty} c(t-\tau) f_D(\tau)\,d\tau,$$

nel senso che conta quante consegne recenti sono ancora “in finestra” rispetto ai ritardi tipici.

***

## Esempio numerico esplicativo (end-to-end, minimalista)

Si consideri un periodo mensile $\Delta=1$ mese e un sistema con:

- consegne nel mese: 20
  $\Rightarrow c \approx 20/\text{mese}$

- iniziative riaperte entro 90 giorni: 12 su 20
  $\Rightarrow p_1 = 12/20 = 0.6$

- tra le riaperte, riaperture medie: 2
  $\Rightarrow r \approx 2$

Stima:

$$\mathbb{E}[K] \approx 1 + p_1 r = 1 + 0.6\cdot 2 = 2.2.$$

Quindi il carico effettivo di visite è circa 2.2 volte l’ingresso esterno.

Se nel mese successivo gli arrivi esterni calano, ma $B_{\text{lat}}$ rimane alto (molte consegne recenti in finestra), il sistema può continuare a ricevere rientri anche con pochi nuovi arrivi: questo è l’effetto memoria.

***

## Check-list di coerenza (per evitare dati inutilizzabili)

Un sistema minimo fallisce se gli stati non sono usati in modo coerente. Per garantire misure robuste, servono poche regole di coerenza:

1. ogni iniziativa deve avere un solo stato alla volta;
2. “Consegnato” deve essere un gate reale (non un “quasi consegnato”);
3. ogni riapertura deve passare per To Do o In corso (evento osservabile);
4. le attese esterne devono essere usate solo quando il lavoro è effettivamente bloccato da terzi.

Queste regole non aggiungono campi, ma riducono ambiguità.

***

## Sintesi del capitolo

Questo capitolo ha definito un modello operativo minimo per rendere applicabili le politiche di controllo essenziali:

1. **unità primaria**: iniziativa (job macro) con iterazioni implicite via consegne e riaperture;
2. **stati minimi**: backlog accettato, ready, WIP, attese esterne, revisione interna, consegnato, fatturazione, concluso;
3. **eventi**: passaggi di stato e gate di consegna come base misurabile;
4. **misure derivate**: tempi di ciclo, attese, WIP, flusso di consegne, tasso di riapertura e molteplicità;
5. **proxy di memoria**: backlog latente su finestra temporale.

Nel Capitolo 12 verrà presentata una procedura di implementazione progressiva (fasi) e una strategia di calibrazione delle soglie (es. limite WIP, finestra $H$) usando solo i dati raccolti automaticamente.

***

# Implementazione progressiva e calibrazione
\chaptersubtitle{(fasi, soglie, taratura con pochi dati e miglioramento continuo)}

Il Capitolo 11 ha definito un modello operativo minimo basato su stati, eventi e misure derivabili automaticamente (tempi di ciclo, WIP, flusso di consegne, riaperture, attese esterne, backlog latente). Questo capitolo mostra come implementare tale modello **per fasi**, evitando due rischi tipici:

1. progettare un sistema troppo complesso (che richiede troppi dati e fallisce);
2. progettare un sistema troppo semplice (che non consente decisioni di controllo).

L’obiettivo è costruire una procedura di implementazione che:

- parta da poche regole chiare;
- renda rapidamente osservabili le dinamiche principali (congestione, variabilità, rework, ritardi);
- consenta una taratura progressiva delle soglie (WIP limit, finestra $H$, politiche di gating) usando i dati raccolti.

***

## Principio guida: “prima misurare, poi ottimizzare”

Una politica di controllo funziona se:

- è definita in modo operativo (regola applicabile);
- produce dati coerenti e confrontabili;
- migliora stabilità e prevedibilità.

Quindi l’implementazione deve procedere in questo ordine:

1. definire pochi stati e poche regole di transizione;
2. assicurare coerenza d’uso per un periodo breve;
3. estrarre distribuzioni e indicatori;
4. tarare soglie e politiche;
5. iterare.

***

## Fase 0 — Preparazione: definizioni condivise (senza strumenti)

Questa fase è concettuale e breve: serve per evitare che gli stessi stati vengano usati con significati diversi.

### Definizioni minime da fissare

1. **Che cosa è una iniziativa**
   (unità di tracciamento; cosa viene incluso/escluso).

2. **Che cosa significa “Consegna”**
   Gate tecnico: cosa deve essere vero perché un record entri in “Consegnato”.

3. **Quando un caso è “Riaperto”**
   Evento: un passaggio da Consegnato a To Do/In corso oppure una condizione equivalente.

4. **Significato delle attese**
   “Attesa cliente” e “Attesa ente” usate solo quando il lavoro è effettivamente bloccato da terzi.

### Output della fase 0

Un glossario operativo di 1 pagina. Non serve altro.

***

## Fase 1 — Messa in esercizio del flusso minimo (stati + transizioni)

### Obiettivo

Mettere in uso gli stati del Capitolo 11 con regole minime e senza limiti numerici ancora rigidi.

### Regole operative minime (pull leggero)

- Accettato → To Do solo quando è “pronto a partire” (gating implicito).
- To Do → In corso solo quando si decide di lavorarci davvero.
- In corso → Consegnato solo a consegna reale (gate).
- Consegnato → (riapertura) To Do o In corso quando si riceve una richiesta di rework.

Nella fase 1 non si impone ancora un WIP limit numerico; si osserva il comportamento reale.

### Durata consigliata

Una finestra breve ma significativa (tipicamente 2–6 settimane), sufficiente a produrre:

- un set di consegne,
- alcune riaperture,
- qualche attesa.

***

## Fase 2 — Primo set di metriche “stabili” (baseline)

Dopo la fase 1, si estraggono le metriche minime:

1. **flusso di consegne** $c$ (consegne per settimana/mese).
2. **Distribuzione del tempo di ciclo fino a consegna** $T_{\text{ciclo}}$
   non solo media: anche percentili (es. 50°, 80°, 90°).

3. **WIP medio** $L_{\text{WIP}}$ e suo range.
4. **Riaperture**: stima di $p_1$ e del numero medio di riaperture condizionato $r$.
5. **Backlog latente** $B_{\text{lat}}(t)$ su una finestra $H$ iniziale (anche scelta grossolanamente).

### Perché servono percentili e non solo media

Nei sistemi con coda lunga (Cap. 5), la media può essere fuorviante. I percentili descrivono “quanto spesso” accadono durate elevate e sono più robusti per stabilire soglie.

***

## Fase 3 — Taratura del limite WIP: dal dato alla soglia

### Obiettivo della taratura

Un limite WIP $W_{\max}$ deve essere:

- sufficientemente basso da prevenire congestione e switching eccessivo;
- sufficientemente alto da non bloccare inutilmente il flusso.

### Metodo di taratura (semplice e basato sui dati)

Si osserva la relazione empirica tra:

- WIP operativo e
- tempo di ciclo fino a consegna.

In molti sistemi reali si nota una curva qualitativa:

- per WIP basso/medio, il tempo di ciclo cresce lentamente;
- oltre una soglia, il tempo di ciclo cresce rapidamente (regime congestivo).

La taratura cerca quel punto di “ginocchio” (knee) e imposta $W_{\max}$ poco sotto.

### Regola iniziale (pratica) basata su baseline

Se la baseline mostra:

- WIP tipico $\approx m$ con variabilità contenuta,
- e congestione quando WIP supera $\approx m+\Delta$,

allora una scelta iniziale è:

$$W_{\max} = m.$$

Non è un valore “ottimo”, ma è un valore stabilizzante che si può correggere.

***

## Fase 4 — Taratura del gating: definire la “prontezza” senza campi manuali

### Obiettivo

Ridurre rework generato da avvii prematuri e ridurre varianza del servizio.

### Gating come check binario implicito nello stato

La regola è: un’iniziativa può entrare in “To Do” solo se sono soddisfatte condizioni minime osservabili.

In fase di taratura, si scelgono 2–4 condizioni che coprono le cause più comuni di “avvio instabile”.

### Metodo di taratura (data-driven)

Si analizzano le iniziative con:

- tempi di ciclo molto alti (es. oltre 90° percentile),
- oppure riaperture multiple.

Si cerca la causa ricorrente *a monte* (es. mancanza input, ambito non definito, attori non disponibili). Le condizioni di gating vengono scelte per intercettare queste cause prima dell’avvio.

***

## Fase 5 — Taratura della finestra di memoria $H$ e del backlog latente

### Richiamo teorico

Dal Capitolo 7, i rientri dipendono dalle consegne passate e dal profilo di ritardo $f_D(\tau)$.

Operativamente non si stima il profilo di ritardo completo, ma si sceglie una finestra $H$ in cui cade la maggior parte dei rientri.

### Stima empirica di $H$

Si raccolgono i tempi tra:

- consegna,
- prima riapertura.

Questa è una realizzazione del ritardo $D$ (almeno per i casi che rientrano). Si osserva un percentile, ad esempio:

- $H$ = 80° percentile di $D$.

Interpretazione: l’80% dei rientri avviene entro $H$; quindi il backlog latente conta la maggior parte del rischio di rientro.

### Uso operativo di $B_{\text{lat}}$

$B_{\text{lat}}$ è una misura di “potenziale carico futuro”:

- se $B_{\text{lat}}$ è alto, il sistema è esposto a ondate di rientri;
- quindi conviene essere più conservativi su WIP e avvii.

Questo è coerente con la teoria di stabilità con memoria: quando la memoria è alta, le politiche devono essere più conservative.

***

## Fase 6 — Validazione: indicatori di stabilizzazione

Una politica di controllo funziona se produce segnali osservabili:

1. **riduzione del tempo di ciclo ai percentili alti**
   il 80°–90° percentile diminuisce o si stabilizza;

2. **riduzione della dispersione**
   la variabilità dei tempi si riduce (coerente con riduzione di $\mathbb{E}[S^2]$);

3. **riduzione di riaperture multiple**
   diminuisce $r$ o si riduce la quota di casi con 3+ rientri;

4. **WIP più stabile**
   meno picchi e meno periodi di sovraccarico.

Questi criteri sono coerenti con l’idea di Lyapunov: un sistema stabilizzato mostra ritorno verso un regime, non divergenza.

***

## Ciclo di miglioramento: controllo adattivo “a basso rumore”

Dopo la prima taratura, il sistema entra in un ciclo periodico (ad esempio mensile o bimestrale) di:

1. estrazione metriche;
2. confronto con baseline;
3. micro-modifica di una sola leva per volta:
   - $W_{\max}$,
   - regola di gating,
   - regola di priorità,
   - standardizzazione di una classe di output.

Il principio è evitare cambi simultanei: in presenza di variabilità e memoria, cambiare molte cose insieme rende impossibile attribuire gli effetti.

***

## Esempio numerico esplicativo (taratura in tre passi)

Si consideri un sistema con baseline mensile:

- flusso di consegne: 20 consegne/mese,
- WIP medio: 18, con picchi a 30,
- tempo ciclo (giorni): mediana 25, 90° percentile 120,
- riaperture: $p_1=0.6$, $r=2$,
- 80° percentile del ritardo consegna→riapertura: 60 giorni.

**Passo 1 — WIP limit**  
Si imposta $W_{\max}=18$ (pari al WIP medio baseline). Obiettivo: ridurre picchi.

**Passo 2 — finestra $H$**  
Si imposta $H=60$ giorni per il backlog latente.

**Passo 3 — gating minimo**  
Si aggiunge una condizione di gating che intercetta la causa più comune dei casi al 90° percentile (es. mancanza input essenziali).

Dopo 1–2 mesi si confrontano:

- picchi WIP: diminuiti?
- 90° percentile: sceso?
- riaperture multiple: ridotte?

Se sì, la politica ha aumentato stabilità. Se no, si modifica una sola leva.

***

## Sintesi del capitolo

Questo capitolo ha proposto una procedura di implementazione progressiva e calibrazione basata sui dati raccolti automaticamente:

1. **Fase 0**: definizioni condivise (glossario).
2. **Fase 1**: uso del flusso minimo (stati + transizioni).
3. **Fase 2**: baseline metriche (flusso di consegne, ciclo, WIP, rework, backlog latente).
4. **Fase 3**: taratura WIP limit con osservazione del regime congestivo.
5. **Fase 4**: taratura gating tramite analisi dei casi estremi e del rework.
6. **Fase 5**: taratura finestra $H$ per rendere visibile la memoria.
7. **Fase 6**: validazione tramite segnali di stabilizzazione.
8. **Ciclo continuo**: miglioramento con micro-variazioni controllate.

Il Capitolo 13 (facoltativo, se utile) può introdurre un’appendice metodologica per:

- stimare in modo più formale il profilo di ritardo,
- collegare i dati osservati a una stima di $f_D(\tau)$,
- e simulare scenari (riduzione rework, riduzione varianza, cambi WIP) per valutare l’effetto su stabilità e tempi.

***

# Stima del profilo di ritardo e simulazione di scenari
\chaptersubtitle{(dal dato osservato a $f_D(\tau)$ e dalla teoria alla previsione operativa)}

Il Capitolo 12 ha introdotto una procedura pragmatica: usare una finestra $H$ come proxy della memoria del sistema e implementare politiche di controllo senza stimare esplicitamente la distribuzione dei ritardi. Questa scelta è spesso sufficiente per stabilizzare un sistema reale.

Tuttavia, quando si vuole:

- comprendere meglio la forma temporale dei rientri,
- distinguere ritardi “brevi” da code lunghe,
- simulare scenari di policy (gating, WIP, standardizzazione, rework),

diventa utile stimare, almeno in modo approssimato, il **profilo di ritardo**:

- $f_D(\tau)$: densità del tempo tra consegna e rientro (Cap. 7).

Questo capitolo presenta, con gradualità, un percorso per:

1. stimare empiricamente $f_D(\tau)$ dai dati,
2. collegare tale stima alla convoluzione dei rientri,
3. usare il profilo di ritardo per simulare scenari e valutare impatti su stabilità e performance.

***

## Dato osservabile: campioni del ritardo $D$

### Definizione del campione di ritardo

Per ciascuna iniziativa che rientra, si osservano:

- $t_{\text{consegna},i}$ = data della consegna (passaggio a “Consegnato”),
- $t_{\text{riapertura},i}$ = data della prima riapertura (passaggio da “Consegnato” a To Do/In corso).

Il campione del ritardo è:

$$D_i = t_{\text{riapertura},i} - t_{\text{consegna},i}, \quad D_i \ge 0.$$

La collezione $\{D_i\}$ è il dataset di base per stimare il profilo di ritardo.

### Due attenzioni metodologiche (semplici ma cruciali)

1. **Si osservano solo i casi che rientrano.**
   I casi che non rientrano non producono un $D_i$. Questo implica che $\{D_i\}$ rappresenta la distribuzione condizionata ai rientri.

2. **Censura a destra (right-censoring).**
   Se la finestra di osservazione è limitata (es. si analizzano solo ultimi 6 mesi), alcuni casi consegnati potrebbero rientrare più tardi ma non sono ancora rientrati. Quei casi sono “censurati”: sono informazione parziale.

Per un primo livello di analisi, si può lavorare anche ignorando la censura, ma è importante sapere che può sottostimare la coda lunga.

***

## Profilo di ritardo come densità: stima non parametrica (istogramma e KDE)

Nel modello continuo, il ritardo $D$ (condizionato al fatto che avvenga un rientro) ha densità $f_D(\tau)$.
In pratica, da un dataset di rientri osservati $\{D_i\}$ possiamo stimare $f_D$ in modo non parametrico.

### Istogramma (binning)

Scegli un passo temporale $\Delta$ e conta quante osservazioni cadono in ciascun intervallo $[m\Delta,(m+1)\Delta)$.
Ottieni così una stima discreta normalizzata (che useremo nel Capitolo 13.3):

$$k[m] \approx \mathbb{P}(m\Delta \le D < (m+1)\Delta \mid I=1), \qquad \sum_{m\ge 0} k[m]=1.$$

### KDE (stima di densità con funzione di smoothing)

Alternativamente, una stima continua “lisciata” è:

$$\hat{f}_D(\tau)=\frac{1}{Nh}\sum_{i=1}^N K\left(\frac{\tau-D_i}{h}\right).$$

Dove:

- $h>0$ è la banda (larghezza di smoothing);
- $K(\cdot)$ è una funzione di smoothing normalizzata (uso statistico), da non confondere con il simbolo $K$ usato altrove per il **numero di visite**.

> Nota: ai fini del modello operativo, l’istogramma discretizzato $k[m]$ è spesso sufficiente e più semplice da stimare/aggiornare.

***

## Profilo discreto dei ritardi per simulazioni: $k[m]$ su passo temporale

Per simulazioni semplici e per metriche “da board”, è utile discretizzare il tempo in passi di ampiezza $\Delta$ (es. 1 settimana).

Definiamo quindi:

$$k[m] \approx \mathbb{P}(m\Delta \le D < (m+1)\Delta \mid I=1), \qquad m=0,1,2,\dots$$

dove:

- $D$ è il ritardo tra consegna e rientro;
- $I=1$ indica che stiamo guardando **una visita di rework effettivamente avvenuta** (cioè un rientro osservato).

Per costruzione:

$$k[m]\ge 0, \qquad \sum_{m\ge 0} k[m]=1.$$

### Legame con la densità continua

Se $f_D(\tau)$ è la densità continua, una discretizzazione naturale è:

$$k[m] = \int_{m\Delta}^{(m+1)\Delta} f_D(\tau)\,d\tau.$$

### Stima empirica da dati (conteggio)

Dato un insieme di ritardi osservati $\{D_i\}_{i=1}^N$:

$$\hat{k}[m] = \frac{1}{N}\sum_{i=1}^N \mathbf{1}\{m\Delta \le D_i < (m+1)\Delta\}.$$

Questa stima usa **solo** i rientri osservati, ed è coerente con la definizione condizionata su $I=1$.

***

## Convoluzione discreta: previsione dei rientri attesi

Nel Capitolo 7 è stata introdotta la convoluzione continua:

$$\lambda_{\text{rw}}(t)=\alpha\int_{0}^{+\infty} c(t-\tau)\, f_D(\tau)\, d\tau.$$

Per lavorare in modo operativo, discretizziamo il tempo con passo $\Delta$ (es. 1 giorno o 1 settimana) e definiamo:

- $c[n]$ = consegne di iterazione (visite completate) nel passo $n$  $[\text{visite}/\Delta]$
- $r[n]$ = rientri (visite di rework) nel passo $n$ $[\text{visite}/\Delta]$
- $k[m]$ = massa di probabilità del ritardo nel bin $[m\Delta,(m+1)\Delta)$, con

$$k[m]\ge 0,\qquad \sum_{m=0}^{\infty}k[m]=1,$$

e collegamento naturale con la forma continua:

$$k[m] = \int_{m\Delta}^{(m+1)\Delta} f_D(\tau)\, d\tau.$$

Allora la previsione discreta diventa:

$$\mathbb{E}[r[n]]= \alpha\sum_{m=0}^{\infty} c[n-m]\,k[m].$$

Interpretazione:

- $\sum_m c[n-m]\,k[m]$ ricostruisce la **forma temporale** con cui le consegne passate alimentano i rientri oggi (memoria/ritardo);
- $\alpha$ è la **massa media di lavoro che rientra** per consegna (numero medio di visite di rework per consegna), quindi può essere anche $>1$.

Nota: se vuoi “scomporre” $\alpha$ concettualmente, la lettura coerente con il Capitolo 6 è $\alpha=p_1\,r$; nel seguito però useremo **solo** $\alpha$ per evitare ridondanze nel modello.

***

## Censura a destra: stimare la coda del profilo dei ritardi (idea minimale)

Nella pratica, molti ritardi di rientro non sono osservabili “fino in fondo” perché il database si interrompe a una data di estrazione.
Questo genera **censura a destra**: sappiamo che un rientro non è ancora arrivato, ma non sappiamo quando arriverà.

### Un formalismo minimale

Sia $T$ il tempo (ritardo) fino al prossimo rientro osservabile dopo una consegna.
Se osserviamo il sistema solo fino a un orizzonte $H$, per alcuni casi conosciamo solo che $T>H$.

Per descrivere la coda usiamo la **funzione di sopravvivenza**:

$$\bar{F}_T(\tau)=\mathbb{P}(T>\tau).$$

E la densità (quando esiste):

$$f_T(\tau) = -\frac{d}{d\tau}\bar{F}_T(\tau).$$

> Nota di coerenza: in molte trattazioni di survival analysis la funzione di sopravvivenza viene indicata con una lettera $S(\cdot)$; qui evitiamo questa scelta per non confonderla con $S$ (tempo di servizio) usato nella teoria delle code.

### Impatto pratico sulla stima del profilo dei ritardi

Se usi direttamente solo i ritardi osservati $\{D_i\}$, la stima di $k[m]$ tende a **sottostimare la coda** (perché i ritardi lunghi sono più spesso censurati).

Una correzione completa richiede metodi di analisi di sopravvivenza (es. Kaplan–Meier) per stimare $\bar{F}_T(\tau)$ e poi ricavare una stima della massa per bin:

$$k[m] \approx \mathbb{P}(m\Delta \le T < (m+1)\Delta \mid I=1).$$

Se vuoi restare minimale:

- dichiara esplicitamente un orizzonte $H$ (es. “stimo $k[m]$ solo fino a $m\Delta\le H$”);
- aggiungi un bin “coda” che raccoglie la probabilità residua oltre $H$ (utile per non perdere massa).

***

## Modello di simulazione: da rientri attesi a carico attivo

Stimare $r[n]$ serve per prevedere un flusso di rientri. Per trasformare questo in congestione e tempi occorre collegarlo alla capacità di servizio.

### Bilancio del WIP (schema deterministico discreto)

Si definisca:

- $L[n]$ = WIP operativo al passo $n$,
- $a[n]$ = arrivi al WIP (nuovi avvii + rientri presi in carico),
- $c[n]$ = completamenti (consegne) al passo $n$.

Un bilancio minimo è:

$$L[n+1] = L[n] + a[n] - c[n],$$

con vincoli:

- $c[n] \le C_{\max}$ (capacità massima di consegne per passo),
- $a[n]$ dipende da gating e limite WIP.

Questo schema è una forma discreta di dinamica di accumulo (stock-and-flow).

> **Nota di notazione — tassi (continuo) vs conteggi (discreto)**  
> Nel testo si usano due descrizioni equivalenti dello stesso fenomeno, ma con unità diverse:
>
> - **Tempo continuo (teoria delle code):** $\lambda_0(t)$, $\lambda_{\mathrm{rw}}(t)$ e $\lambda(t)$ sono **tassi** con unità $[\text{job}/\text{tempo}]$ e vale:
>
> $$\lambda(t)=\lambda_0(t)+\lambda_{\mathrm{rw}}(t)$$
>
> - **Tempo discreto (dinamica stock–flow):** si lavora a passi $n$ di durata $\Delta t$ (es. settimana). In questo caso $a_0[n]$, $r[n]$, $a[n]$, $c[n]$ sono **conteggi per passo** con unità $[\text{job}/\text{passo}]$ e vale:
>
> $$a[n]=a_0[n]+r[n]$$
>
> Collegamento (in media) tra continuo e discreto tramite $\Delta t$:
>
> $$\mathbb{E}[a_0[n]]\approx \lambda_0(t_n)\,\Delta t,\qquad
> \mathbb{E}[r[n]]\approx \lambda_{\mathrm{rw}}(t_n)\,\Delta t,\qquad
> \mathbb{E}[a[n]]\approx \lambda(t_n)\,\Delta t.$$
>
> **Convenzione:** si riserva il simbolo $\lambda(\cdot)$ ai tassi nel continuo, e si usa $r[n]$ per indicare i rientri attesi nel passo discreto.

### Come si costruisce $a[n]$

Un modello minimale è:

$$a[n] = a_0[n] + r[n],$$

dove:

- $a_0[n]$ = avvii di nuove iniziative (controllati dal gating),
- $r[n]$ = rientri attesi (da convoluzione).

In un sistema con limite WIP, si introduce:

$$a[n] = \min\left(a_0[n] + r[n],\; \max(0, W_{\max}-L[n])\right).$$

Interpretazione:

- si avvia lavoro (nuovo o rework) solo se c’è spazio sotto il limite WIP.

***

## Scenari di policy: cosa cambia matematicamente

Le politiche del Capitolo 10 agiscono su parametri e funzioni del modello. Qui si mostra come.

### Scenario A — Riduzione di $\alpha$ (meno rientri per consegna)

Se una politica (interna o esterna) riduce l’intensità media di rework $\alpha$, allora:

$$\mathbb{E}[r[n]] = \alpha \sum_{m=0}^{\infty} c[n-m]\,k[m]$$

si riduce **linearmente** in $\alpha$ a parità di $c[\cdot]$ e $k[\cdot]$, con impatto sistemico sul carico complessivo di visite $\lambda$ e quindi su $\rho$ (Cap. 5–6).

### Scenario B — Riduzione della coda del profilo di ritardo (ritardi più concentrati)

Se il profilo di ritardo $k[m]$ diventa più “stretto”, i rientri si concentrano più vicino alla consegna.

Effetti qualitativi:

- diminuisce la memoria lunga (meno ondate tardive),
- può aumentare il picco di rientri in tempi brevi (concentrazione),
- spesso migliora prevedibilità e consente controllo più efficace.

Questo è un trade-off: profilo di ritardo più stretto non è sempre “meglio” se crea picchi; ma riduce le sorprese tardive.

### Scenario C — Riduzione di $\mathbb{E}[S^2]$ (varianza del servizio)

Questo scenario non entra direttamente nella convoluzione, ma modifica la relazione tra carico e tempi:

- a parità di $\rho$, ridurre $\mathbb{E}[S^2]$ riduce $W_q$ (Cap. 5).

Nelle simulazioni, questo può essere rappresentato come aumento della capacità effettiva $C_{\max}$ o riduzione della variabilità nei completamenti.

### Scenario D — Modifica $W_{\max}$ (limite WIP)

Nell’equazione di avvio:

$$a[n] = \min(\cdots, W_{\max}-L[n]),$$

ridurre $W_{\max}$ rende il sistema più conservativo:

- riduce oscillazioni e congestione,
- ma può ridurre il flusso di consegne se troppo basso.

Aumentare $W_{\max}$ aumenta aggressività e rischio di congestione.

***

## Esempio numerico minimale (discreto) e ruolo di $\alpha$

Riprendiamo la relazione del Capitolo 13.4:

$$\mathbb{E}[r[n]] = \alpha \sum_{m\ge 0} c[n-m] \, k[m].$$

### Dati (molto semplici)

Supponiamo:

- consegne settimanali costanti: $c[n]=10$;
- probabilità di almeno un rientro: $p_1=0{,}60$;
- numero medio di rientri *dato che rientra*: $r=2$.

Allora:

$$\alpha = p_1\,r = 1{,}2.$$

Scegliamo un profilo discreto dei ritardi (normalizzato):

$$k[0]=0{,}40,\;k[1]=0{,}30,\;k[2]=0{,}20,\;k[3]=0{,}10.$$

### Calcolo del flusso atteso di rientri

Poiché $c[n]$ è costante e $\sum_m k[m]=1$:

$$\sum_{m\ge 0} c[n-m] \, k[m] = 10 \sum_{m\ge 0} k[m] = 10.$$

Quindi:

$$\mathbb{E}[r[n]] = \alpha\,10 = 12.$$

Interpretazione: ci aspettiamo **12 visite di rework a settimana** generate dalle consegne passate (a regime).

### Mini-scenario (cambia $p_1$, con $r$ e $k[m]$ fissi)

Se, per ipotesi, $p_1$ scende a $0{,}40$ mantenendo $r=2$, allora:

$$\alpha=0{,}8 \quad\Rightarrow\quad \mathbb{E}[r[n]] = 8.$$

Il profilo $k[m]$ decide *quando* arrivano i rientri, mentre $\alpha$ decide *quanti* (in media) ne arrivano per consegna.

***

## Limiti e interpretazione: cosa può e non può dare la stima del profilo di ritardo

### Cosa dà

- descrizione della “forma temporale” dei rientri;
- stima di $H$ più motivata (percentili reali);
- capacità di prevedere ondate di rientro quando $c(t)$ cambia;
- base per simulare scenari in modo coerente con la memoria.

### Cosa non dà (da sola)

- non predice la durata del lavoro di rework ($S_1$);
- non elimina la variabilità dovuta a disturbi non osservati;
- non sostituisce misure su WIP e tempi di ciclo.

Il profilo di ritardo è un tassello: utile se integrato con capacità, variabilità del servizio e policy.

***

## Sintesi del capitolo

Questo capitolo ha introdotto un percorso per passare dalla teoria della memoria (Cap. 7–9) a uno strumento quantitativo operativo:

1. campioni del ritardo $D_i = t_{\text{riapertura}} - t_{\text{consegna}}$;
2. stima non parametrica di $f_D(\tau)$ (istogramma/KDE) e profilo di ritardo discreto $k[m]$;
3. previsione dei rientri attesi tramite convoluzione discreta:

$$\mathbb{E}[r[n]] = \alpha \sum_{m=0}^{\infty} c[n-m]\,k[m];$$

4. integrazione in un modello discreto di accumulo per simulare WIP e il flusso di consegne;
5. analisi di scenari di policy come variazioni di $\alpha$, del profilo dei ritardi, di $\mathbb{E}[S^2]$ e di $W_{\max}$.

>**BOX — Modello discreto con profilo di ritardo stimato (forma pronta per simulazioni)**
>
>$$\mathbb{E}[r[n]] = \alpha \sum_{m=0}^{\infty} c[n-m]\,k[m],
\qquad \sum_{m=0}^{\infty}k[m]=1.$$
>
>$$a[n] = a_0[n] + r[n]$$
>
>$$L[n+1] = L[n] + a[n] - c[n]$$
>
>$$c[n] = \min\{L[n], C_{\max}\}$$
>
>Opzionale (se vuoi mantenere la policy WIP già introdotta in §13.6.2):
>
>$$a[n] = \min\left(a_0[n] + r[n],\; \max(0, W_{\max}-L[n])\right).$$

Se si desidera proseguire oltre, il Capitolo 14 introduce:

- una formulazione compatta in spazio di stato per simulazioni,
- metodi di stima dei parametri con incertezza,
- e un collegamento più esplicito tra modello di coda (Cap. 5) e dinamica stock-and-flow (Cap. 13).

***

# Spazio di stato e stima con incertezza
\chaptersubtitle{(una formulazione compatta per simulare, prevedere e progettare politiche robuste)}

Il Capitolo 13 ha introdotto la stima del profilo di ritardo e una simulazione discreta basata su bilanci di accumulo (stock-and-flow). In molte applicazioni, questa struttura è già sufficiente per supportare decisioni operative.

Quando però si desidera:

- un modello più compatto e modulare,
- una distinzione chiara tra stato, ingressi e disturbi,
- una gestione esplicita dell’incertezza dei parametri,
- un collegamento più rigoroso tra risultati di teoria delle code (Cap. 4–5) e dinamica di accumulo (Cap. 11–13),

diventa utile introdurre una formulazione in **spazio di stato** e un quadro metodologico per la stima e la simulazione robusta.

Questo capitolo costruisce, con gradualità, una versione essenziale ma generale di tale quadro.

***

## Da stock-and-flow a spazio di stato: perché cambiare rappresentazione

### Richiamo: bilancio discreto

Nel Capitolo 13 è comparso un bilancio:

$$L[n+1] = L[n] + a[n] - c[n],$$

dove $L[n]$ è un accumulo (WIP) e $a[n],c[n]$ sono flussi.

Questo è già un sistema dinamico. La formulazione in spazio di stato serve a:

- aggiungere altri accumuli (es. backlog pronto, backlog latente),
- rappresentare ritardi e memoria in modo strutturato,
- separare chiaramente:
  - **stato** (ciò che evolve),
  - **controllo** (scelte interne),
  - **disturbi** (variabili esterne).

***

## Definizione del vettore di stato minimo esteso

Per mantenere il modello compatto ma coerente con i capitoli precedenti, si propone uno stato con tre accumuli:

1. $B[n]$: backlog “pronto” (To Do / Ready)
2. $L[n]$: WIP operativo (In corso + eventuali attese interne scelte)
3. $B_{\text{lat}}[n]$: backlog latente (potenziale rework legato a consegne recenti, memoria)

Lo stato è:

$$x[n] = \begin{bmatrix} B[n]\\ L[n]\\ B_{\text{lat}}[n] \end{bmatrix}.$$

### Significato dei tre accumuli

- $B[n]$ rappresenta lavoro pronto ma non ancora avviato (buffer controllabile).
- $L[n]$ rappresenta lavoro in lavorazione (causa diretta di congestione e tempi).
- $B_{\text{lat}}[n]$ rappresenta “memoria”: una massa di consegne passate ancora esposta a rientri.

Questa struttura separa chiaramente WIP visibile e carico futuro potenziale.

***

## Ingressi controllabili (azioni di controllo) $u[n]$

Nel perimetro del modello “di produzione” consideriamo come **azioni di controllo** le quantità che determinano quante iniziative (nuove o già note) vengono rese **pronte** e quante vengono **avviate** nel WIP al passo $n$. Introduciamo quindi il vettore di controllo

$$u[n] \;=\; \begin{bmatrix} a_0[n] \\ a[n] \end{bmatrix}.$$

I due componenti hanno il seguente significato operativo (coerente con la board):

- **Gating di nuovi ingressi** $a_0[n]$: numero di nuove iniziative ammesse nel **backlog pronto** (transizione *Accettato → To Do*) al passo $n$. Questa grandezza rappresenta l’output della politica di gating applicata ai “nuovi” ingressi (iniziative accettate/attivabili) e consente di modulare quanto lavoro nuovo viene reso pronto in ciascun passo.

- **Avvii nel WIP** $a[n]$: numero di iniziative avviate dal backlog pronto al WIP (transizione *To Do → In corso*) al passo $n$. Questa grandezza rappresenta l’azione di “pull” verso la produzione e viene limitata dalla capacità disponibile in WIP.

Assumiamo parametri di policy **costanti** “fino a nuovo ordine”:

- $A_0$ = massimo gating consentito per passo (limite superiore su $a_0[n]$);
- $W_{\max}$ = WIP limit massimo (capienza operativa del sistema).

Le azioni di controllo sono quindi soggette ai vincoli:

$$0 \le a_0[n] \le A_0,$$

$$0 \le a[n] \le \max\{0,\; W_{\max} - L[n]\},$$

oltre al vincolo di disponibilità del lavoro pronto:

$$a[n] \le B[n] + a_0[n] + r[n].$$

> **Nota interpretativa.**  
> Nel modello, il gating agisce su $a_0[n]$ (quanta “nuova” domanda viene resa pronta), mentre il WIP limit agisce su $a[n]$ (quanta domanda pronta viene effettivamente avviata nel WIP). Questa separazione consente di rappresentare in modo essenziale il controllo del sistema senza introdurre ulteriori stati relativi alle iniziative “accettate ma non pronte”.

## Parametri di policy e disturbi (perimetro del modello)

Per rendere il modello utilizzabile come strumento di analisi e controllo, distinguiamo tra:

- **parametri di policy** (decisi internamente e mantenuti costanti “fino a nuovo ordine”);
- **disturbi** (grandezze esogene non controllabili che possono variare nel tempo).

### Parametri di policy (assunti costanti)

Nel seguito assumiamo costanti:

- **WIP limit** $W_{\max}$: capienza massima del WIP operativo (stato *In corso*);
- **limite di consegna** $C_{\max}$: numero massimo di consegne per passo;
- **limite di gating** $A_0$: massimo numero di nuove iniziative ammissibili nel backlog pronto per passo.

Questi parametri sono da intendersi come “impostazioni” del sistema, valide fino a modifica esplicita.

### Disturbi (estensioni possibili)

Nel perimetro minimo della dispensa, non è necessario introdurre un vettore di disturbi esplicito: l’obiettivo è descrivere la dinamica interna e le politiche di controllo tramite $a_0[n]$ e $a[n]$.

Se si desidera estendere il modello per rappresentare fluttuazioni di capacità (ad es. indisponibilità temporanee del team, picchi di richieste, assenze), è possibile introdurre un limite di consegna variabile $C_{\max}[n]$ (oppure un fattore di disponibilità) e trattarlo come disturbo. In tal caso la relazione di consegna diventa:

$$c[n] = \min\{L[n],\; C_{\max}[n]\}.$$

Nel seguito, per semplicità e coerenza con l’impostazione “policy costanti”, si utilizza $C_{\max}$.

***

## Equazioni dinamiche discrete (forma generale)

Si propongono equazioni di evoluzione per i tre accumuli.

### Backlog pronto $B[n]$

Il backlog pronto aumenta con il gating e con i rientri (quando vengono messi in coda pronta), e diminuisce con gli avvii $a[n]$:

$$B[n+1] = B[n] + a_0[n] + r[n] - a[n].$$

### WIP operativo $L[n]$

Il WIP aumenta con gli avvii e diminuisce con i completamenti (consegne):

$$L[n+1] = L[n] + a[n] - c[n].$$

Dove $c[n]$ è il numero di consegne nel passo $n$.

### Memoria / backlog latente $B_{\text{lat}}[n]$

Il backlog latente aumenta con le consegne (perché ogni consegna “entra in finestra” come potenziale sorgente di rework) e diminuisce man mano che la finestra scorre o che il rischio di rientro si esaurisce.

Una forma minimale è:

$$B_{\text{lat}}[n+1] = (1-\gamma) B_{\text{lat}}[n] + \gamma c[n].$$

Dove $\gamma\in(0,1]$ è un tasso di “decadimento della memoria”:

- $\gamma$ alto: memoria breve (profilo di ritardo stretto),
- $\gamma$ basso: memoria lunga (profilo di ritardo con coda lunga).

Questa è una approssimazione compatta di un profilo di ritardo distribuito: non descrive tutta la forma del profilo di ritardo, ma cattura l’idea che la memoria si accumula e poi decade.

***

## Collegamento tra memoria e rientri: funzione di output

Serve una relazione che trasformi $B_{\text{lat}}[n]$ (memoria) in un flusso di rientri $r[n]$.

### Modello lineare minimale

Un modello semplice è:

$$r[n] = \alpha B_{\text{lat}}[n],$$

con $\alpha\ge 0$.

Interpretazione: maggiore massa di consegne recenti esposte, maggiore rework atteso.

### Collegamento con il profilo di ritardo: interpretazione

Nel modello distribuito (Cap. 13) la previsione dei rientri è:

$$\mathbb{E}[r[n]] = \alpha \sum_{m=0}^{\infty} c[n-m]\,k[m].$$

Il modello compatto

$$B_{\text{lat}}[n+1]=(1-\gamma)B_{\text{lat}}[n]+\gamma c[n],\qquad r[n]=\alpha B_{\text{lat}}[n]$$

implica, di fatto, un **profilo di ritardo geometrico**: l’effetto di una consegna fatta oggi su $r[n]$ tra $m$ passi decresce come $(1-\gamma)^m$, quindi

$$k[m]=\gamma(1-\gamma)^m,\qquad \sum_{m=0}^{\infty}k[m]=1.$$

In questo senso:

- $\gamma$ governa la **forma** del profilo di ritardo (memoria breve/lunga);
- $\alpha$ governa la **scala** dell’intensità dei rientri (massa totale del kernel; stesso significato del Cap. 7).

***

## Collegamento con la teoria delle code: completamenti $c[n]$ come capacità limitata

Finora $c[n]$ è un flusso generico. Per collegarsi ai Capitoli 4–5 serve un modello che leghi:

- WIP e capacità,
- variabilità del servizio,
- saturazione.

### Capacità massima e saturazione

Una forma minimale è:

$$c[n] = \min\{L[n], C_{\max}\},$$

dove $C_{\max}$ è la capacità massima di completamento (disturbo o variabile controllabile).

### Capacità effettiva e variabilità (collegamento a $\mathbb{E}[S^2]$)

La teoria M/G/1 mostra che la variabilità aumenta i tempi di attesa e quindi, a parità di carico, riduce l’efficienza operativa percepita. In un modello discreto aggregato, questo può essere rappresentato introducendo un fattore di efficienza $\eta[n]\in(0,1]$:

$$c[n] = \min\{L[n], \eta[n]\,C_{\max}\}.$$

- $\eta[n]$ bassa quando:
  - WIP alto (switching),
  - job molto variabili (coda lunga),
  - rework disordinato,
  - presenza di ritardi che spezzano il flusso.

Una parametrizzazione semplice è:

$$\eta[n] = \frac{1}{1 + k_L L[n]},$$

con $k_L>0$.

Interpretazione: più WIP, meno efficienza; questo cattura l’effetto “non lineare” della congestione senza ricorrere a formule complete di coda.

***

## Modello complessivo: forma in spazio di stato

Raccogliendo le equazioni:

$$x[n+1] = F(x[n], u[n]),$$

dove lo stato è:

$$x[n] = \begin{bmatrix} B[n]\\ L[n]\\ B_{\text{lat}}[n] \end{bmatrix}, \quad u[n] =
\begin{bmatrix} a_0[n]\\ a[n] \end{bmatrix}.$$

Con:

$$\begin{aligned} B[n+1] &= B[n] + a_0[n] + r[n] - a[n],\\ L[n+1] &= L[n] + a[n] - c[n],\\ B_{\text{lat}}[n+1] &= (1-\gamma)B_{\text{lat}}[n] + \gamma c[n],\\ r[n] &= \alpha B_{\text{lat}}[n],\\
c[n] &= \min\{L[n], \eta[n]C_{\max}\},\qquad \eta[n]=\frac{1}{1+k_L L[n]}. \end{aligned}$$

Questo sistema è:

- non lineare (min e dipendenza di $\eta$ da $L$),
- con retroazione (via $r[n]$ e $B_{\text{lat}}[n]$),
- con memoria (via dinamica di $B_{\text{lat}}[n]$).

È quindi coerente con i Capitoli 6–9, ma in forma compatta.

***

## Stabilità del modello: interpretazione con Jacobiano (richiamo Cap. 8)

Per studiare stabilità locale, si può linearizzare intorno a un equilibrio $x^*$.

In forma generale:

$$\Delta x[n+1] \approx J_d(x^*)\,\Delta x[n],$$

dove $J_d$ è lo Jacobiano discreto della mappa $x\mapsto F(x,u^*,d^*)$.

### Criterio di stabilità discreto (richiamo)

Per sistemi discreti, un equilibrio è localmente asintoticamente stabile se tutti gli autovalori di $J_d$ soddisfano:

$$|\lambda_i| < 1.$$

Interpretazione:

- nel continuo si richiedeva parte reale negativa,
- nel discreto si richiede modulo < 1.

Non si sviluppa qui il calcolo completo (dipende dalla forma scelta per $c[n]$ e $\eta[n]$), ma il criterio è quello.

***

## Stima dei parametri: un approccio con incertezza (graduale)

Il modello introduce parametri:

- $\gamma$ (memoria),
- $\alpha$ (intensità rework),
- $C_{\max}$ (capacità),
- $k_L$ (effetto WIP sull’efficienza).

In un sistema reale questi parametri non sono noti con precisione. Occorre stimarli e, soprattutto, rappresentare l’incertezza.

### Stima puntuale (primo livello)

Esempi di stima semplice:

- $\gamma$ da percentili dei ritardi (Cap. 13): memoria breve → $\gamma$ più alto.
- $\alpha$ da rapporto medio rientri/consegne osservato (in media, quante richieste di integrazione per consegna):

$$\alpha \approx \frac{\overline{r}}{\overline{c}}.$$

- $C_{\max}$ come massimo sostenibile di consegne per passo in periodi stabili.
- $k_L$ osservando come l’efficienza (consegne per unità di WIP) cala con WIP.

### Intervalli (secondo livello, più realistico)

Invece di un valore singolo, si usano intervalli:

$$\gamma \in [\gamma_{\min},\gamma_{\max}],\quad \alpha \in [\alpha_{\min},\alpha_{\max}],\quad \dots $$

Questi intervalli possono essere stimati con:

- bootstrap sui dati,
- analisi per sottoperiodi (robustezza temporale),
- scenari prudenziali (valori “worst-case”).

***

## Simulazione robusta: “ensemble” di parametri

Quando i parametri sono incerti, la simulazione non produce un’unica traiettoria, ma un insieme di traiettorie.

### Metodo ensemble (concetto)

1. si estraggono $M$ set di parametri nei loro intervalli;
2. si simula il modello per ciascun set;
3. si ottengono bande di previsione per:
   - WIP $L[n]$,
   - backlog $B[n]$,
   - rientri $r[n]$,
   - flusso di consegne $c[n]$.

Questo consente di valutare politiche non solo per performance media, ma per rischio di instabilità.

### Criterio decisionale (prudenziale)

Una policy $(W_{\max},\text{gating},\dots)$ è robusta se:

- nella grande maggioranza degli scenari, $L[n]$ non diverge;
- i percentili alti del tempo di ciclo non esplodono;
- il sistema converge verso un regime (analogo empirico di stabilità).

***

## Collegamento finale: da modello a politiche del Capitolo 10

Il modello rende esplicito cosa fanno le politiche:

- **limite WIP** agisce su $a[n]$ (avvii) e indirettamente su $\eta[n]$;
- **gating** agisce su $a_0[n]$ (quanto entra in $B$);
- **standardizzazione** aumenta $\eta[n]$ e/o $C_{\max}$ riducendo variabilità;
- **riduzione rework** riduce $\alpha$ (o la produzione di $B_{\text{lat}}$ effettivo);
- **riduzione coda di ritardo** aumenta $\gamma$ (memoria più breve).

In altre parole, le politiche diventano variazioni di parametri e regole sulla dinamica dello stato. Questo è esattamente il senso del controllo: intervenire su variabili che modificano stabilità e prestazioni.

***

## Sintesi del capitolo

Questo capitolo ha introdotto una formulazione compatta e generale per modellare sistemi di lavoro con:

- accumuli (backlog pronto, WIP, memoria),
- retroazione (rework come funzione della memoria),
- capacità limitata e congestione (flusso di consegne dipendente da WIP),
- incertezza dei parametri e simulazione robusta.

I punti chiave sono:

1. uno stato esteso $x[n]=[B[n],L[n],B_{\text{lat}}[n]]^T$ rende visibili WIP e memoria;
2. la memoria può essere modellata con una dinamica di decadimento $(1-\gamma)$ che approssima un profilo di ritardo;
3. la teoria delle code entra come vincolo di capacità e come relazione non lineare tra WIP e efficienza;
4. l’incertezza va trattata con intervalli e simulazioni ensemble;
5. le politiche del Capitolo 10 sono interpretabili come regole su $a_0[n],a[n]$ e variazioni di $\alpha,\gamma,C_{\max},k_L$.

Se si desidera un ulteriore passo, il Capitolo 15 fornisce:

- un’appendice matematica con derivazioni più formali (linearizzazione completa, condizioni di stabilità),
- esempi di stima numerica con dati sintetici,
- e una guida pratica alla scelta di $\Delta$ (giorno vs settimana) e alla validazione del modello.

***

# Linearizzazione, stabiltà e validazione
\chaptersubtitle{(derivazioni più formali, esempi su dati sintetici, scelta del passo $\Delta$ e criteri di controllo)}

Il Capitolo 14 ha introdotto un modello discreto in spazio di stato per sistemi di lavoro con accumuli, retroazione e memoria. Questo capitolo fornisce una appendice matematica e metodologica che:

1. formalizza linearizzazione e stabilità del modello discreto;
2. mostra come collegare parametri e misure osservabili;
3. propone esempi numerici su dati sintetici per prendere dimestichezza;
4. fornisce una guida pratica a:
   - scelta del passo temporale $\Delta$,
   - validazione del modello,
   - criteri di robustezza delle politiche.

L’obiettivo resta coerente con l’impostazione generale: rigore progressivo, ma mantenendo interpretabilità e applicabilità.

***

## Richiamo del modello (forma compatta)

Si considera un modello discreto con stato:

$$x[n]=\begin{bmatrix} B[n]\\L[n]\\B_{\text{lat}}[n]\end{bmatrix}$$

e dinamica (Cap. 14) in forma generica:

$$x[n+1]=F(x[n],u[n],d[n]).$$

Per l’analisi di stabilità si assume, per semplicità, un caso deterministico con ingresso costante $u[n]=u^*$ e disturbo costante $d[n]=d^*$ (o nullo). Un equilibrio $x^*$ soddisfa:

$$x^*=F(x^*,u^*,d^*).$$

>**BOX — Modello dinamico complessivo (Cap. 13–15)**
>
>**(A) Chiusura con profilo di ritardo stimato (ritardo distribuito)**
>
>$$r[n] = \alpha \sum_{m=0}^{\infty} c[n-m]\,k[m].$$
>
>$$a[n] = a_0[n] + r[n],\qquad L[n+1]=L[n]+a[n]-c[n].$$
>
>**(B) Chiusura compatta in spazio di stato (Cap. 14)**
>
>$$x[n]=\begin{bmatrix} B[n]\\ L[n]\\ B_{\text{lat}}[n]\end{bmatrix}, \quad u[n]=\begin{bmatrix} a_0[n]\\ a[n]\end{bmatrix}$$
>
>$$\begin{aligned} B[n+1] &= B[n] + a_0[n] + r[n] - a[n],\\ L[n+1] &= L[n] + a[n] - c[n],\\ B_{\text{lat}}[n+1] &= (1-\gamma)B_{\text{lat}}[n] + \gamma c[n],\\ r[n] &= \alpha B_{\text{lat}}[n],\\ c[n] &= \min\{L[n],\eta[n]C_{\max}\},\qquad \eta[n]=\frac{1}{1+k_L L[n]}. \end{aligned}$$

***

## Linearizzazione discreta: derivazione formale

### Definizione della perturbazione

Si definisce:

$$\Delta x[n]=x[n]-x^*.$$

Si espande $F$ al primo ordine (Taylor multivariata) intorno a $x^*$:

$$F(x^*+\Delta x,u^*,d^*) \approx F(x^*,u^*,d^*) + J_d(x^*)\,\Delta x,$$

dove:

$$J_d(x^*) = \left.\frac{\partial F}{\partial x}\right|_{x^*}$$

è il Jacobiano discreto della mappa.

Poiché $x^*=F(x^*,u^*,d^*)$, otteniamo:

$$x^*+\Delta x[n+1] \approx x^* + J_d(x^*)\,\Delta x[n],$$

e quindi:

$$\Delta x[n+1] \approx J_d(x^*)\,\Delta x[n].$$

Questa è la dinamica linearizzata.

***

## Stabilità discreta: criterio sugli autovalori

### Stabilità asintotica locale

Per il sistema linearizzato:

$$\Delta x[n+1]=J_d\,\Delta x[n],$$

si ha stabilità asintotica locale se e solo se:

$$\mathrm{spr}(J_d) < 1,$$

dove $\mathrm{spr}(\cdot)$ è il raggio spettrale (massimo modulo degli autovalori).

Equivalente:

$$|\lambda_i(J_d)|<1 \quad \text{per ogni autovalore } \lambda_i.$$

### Interpretazione

- Se $|\lambda|<1$: la perturbazione si contrae (ritorno verso l’equilibrio).
- Se $|\lambda|>1$: la perturbazione cresce (instabilità).

Nei sistemi discreti l’instabilità può manifestarsi come:

- divergenza monotona,
- oscillazioni crescenti (autovalori complessi con modulo >1).

***

## Funzione di Lyapunov discreta: criterio alternativo

Per sistemi discreti, una funzione di Lyapunov è una funzione $V(x)\ge 0$ tale che:

$$\Delta V[n]=V(x[n+1])-V(x[n]) \le 0.$$

Se esiste $V$ positiva definita e tale che $\Delta V<0$ per $x\neq x^*$, allora l’equilibrio è asintoticamente stabile.

### Caso lineare: criterio matriciale (forma standard)

Per il sistema lineare $\Delta x[n+1]=A\Delta x[n]$, una scelta comune è:

$$V(\Delta x)=\Delta x^T P \Delta x,$$

con $P$ simmetrica positiva definita ($P\succ 0$). Si ha:

$$\Delta V = \Delta x^T (A^T P A - P)\Delta x.$$

Se esiste $P\succ 0$ tale che:

$$A^T P A - P \prec 0,$$

allora il sistema è asintoticamente stabile.

Questa è la versione discreta della condizione di Lyapunov (utile perché evita il calcolo esplicito degli autovalori quando il sistema è grande o parametrico).

***

## Linearizzazione esplicita del modello stock-and-flow (caso semplificato)

Per rendere concreti i passaggi, si consideri un caso lineare e “dolce” (senza operatori min e senza saturazioni), in cui:

- rework: $r[n]=\alpha B_{\text{lat}}[n]$,
- completamenti: $c[n]=\kappa L[n]$ con $\kappa\in(0,1)$ (frazione di WIP completata per passo),
- avvii: $a[n]=\sigma B[n]$ con $\sigma\in(0,1)$,
- gating: $a_0[n]=a_0^*$ costante con $0\le a_0^*\le A_0$.

Dinamica:

$$\begin{aligned} B[n+1] &= B[n] + a_0^* + \alpha B_{\text{lat}}[n] - \sigma B[n],\\ L[n+1] &= L[n] + \sigma B[n] - \kappa L[n],\\ B_{\text{lat}}[n+1] &= (1-\gamma)B_{\text{lat}}[n] + \gamma \kappa L[n]. \end{aligned} $$

Si riscrive:

$$\begin{aligned} B[n+1] &= (1-\sigma)B[n] + \alpha B_{\text{lat}}[n] + a_0^*,\\ L[n+1] &= \sigma B[n] + (1-\kappa)L[n],\\ B_{\text{lat}}[n+1] &= \gamma \kappa L[n] + (1-\gamma)B_{\text{lat}}[n]. \end{aligned}$$

In forma matriciale:

$$x[n+1]=A x[n] + b,$$

con:

$$A= \begin{bmatrix} 1-\sigma & 0 & \alpha\\ \sigma & 1-\kappa & 0\\ 0 & \gamma\kappa & 1-\gamma \end{bmatrix}, \quad b= \begin{bmatrix} a_0^*\\ 0\\ 0 \end{bmatrix}. $$

L’equilibrio esiste se il sistema è stabile (o comunque se $(I-A)$ è invertibile) e vale:

$$x^*=(I-A)^{-1}b.$$

La stabilità locale dipende dagli autovalori di $A$:

$$|\lambda_i(A)|<1.$$

### Lettura qualitativa dei parametri

- $\sigma$ (avvii): più alto → backlog pronto si svuota più velocemente ma può aumentare WIP.
- $\kappa$ (completamento): più alto → WIP si riduce più rapidamente (maggiore flusso di consegne).
- $\alpha$ (rework): più alto → più retroazione, rischio di instabilità.
- $\gamma$ (decadimento memoria): più alto → memoria più breve, minore persistenza dei rientri.

***

## Condizione intuitiva di stabilità: “retroazione × memoria” sotto soglia

Senza cercare una disuguaglianza chiusa generale (che può essere complessa), si può leggere la stabilità come equilibrio tra:

- dissipazione (svuotamento backlog e WIP) determinata da $\sigma,\kappa$,
- amplificazione (retroazione) determinata da $\alpha$,
- persistenza temporale determinata da $(1-\gamma)$.

In modo qualitativo:

- se la memoria dura a lungo (piccolo $\gamma$) e la retroazione è forte (grande $\alpha$),
  allora una consegna genera rientri persistenti che possono superare la capacità del sistema.

Questo è coerente con i Capitoli 6–9: retroazione + ritardo/memoria può destabilizzare.

***

## Esempio numerico sintetico (stabilità vs instabilità)

Si consideri:

- $\sigma=0.3$ (si avvia il 30% del backlog pronto per passo),
- $\kappa=0.4$ (si completa il 40% del WIP per passo),
- $\gamma=0.3$ (memoria moderata).

### Caso 1: retroazione moderata

Sia $\alpha=0.2$.

La matrice è:

$$
A=
\begin{bmatrix}
0.7 & 0 & 0.2\\
0.3 & 0.6 & 0\\
0 & 0.12 & 0.7
\end{bmatrix}.
$$

In questo caso, tipicamente gli autovalori risultano <1 in modulo (stabilità), e il sistema converge a un regime.

### Caso 2: retroazione forte e memoria lunga

Sia $\alpha=0.7$ e $\gamma=0.05$ (memoria lunga). Allora $(1-\gamma)=0.95$:

$$
A=
\begin{bmatrix}
0.7 & 0 & 0.7\\
0.3 & 0.6 & 0\\
0 & 0.02 & 0.95
\end{bmatrix}.
$$

Qui è plausibile che compaia un autovalore con modulo >1 (instabilità): piccole perturbazioni (ad esempio un periodo di consegne elevate) generano una crescita persistente di $B_{\text{lat}}$, che incrementa $B$ tramite rework e spinge $L$ verso congestione.

Lo scopo dell’esempio non è il valore numerico esatto degli autovalori, ma l’intuizione strutturale: **$\alpha$ alto e $\gamma$ basso rendono il sistema fragile**.

***

## Scelta del passo temporale $\Delta$: criteri pratici

Il passo $\Delta$ determina la “risoluzione temporale” del modello discreto. La scelta deve bilanciare:

- fedeltà dinamica,
- rumorosità dei dati,
- lavoro di raccolta dati,
- utilità decisionale.

### Principio 1: $\Delta$ deve essere più corto del tempo tipico di correzione

Se le decisioni operative (priorità, avvii, allocazione) avvengono settimanalmente, un passo settimanale è naturale.

Se invece avvengono quotidianamente, un passo giornaliero è più coerente.

### Principio 2: evitare passi troppo corti con dati rumorosi

Con passo giornaliero:

- si catturano dettagli,
- ma le sequenze $u[n],r[n]$ possono diventare sparse e rumorose.

Con passo settimanale:

- si perde dettaglio,
- ma le misure diventano più stabili e utili per controllo.

In molti contesti organizzativi, $\Delta=1$ settimana è un buon compromesso iniziale.

### Principio 3: il profilo di ritardo deve essere risolvibile con $\Delta$

Se i ritardi tipici sono dell’ordine di settimane o mesi, un passo settimanale è spesso sufficiente. Se i ritardi tipici sono di pochi giorni, serve un passo più corto.

***

## Validazione del modello: criteri e procedura

La validazione non deve cercare la “perfezione predittiva”, ma la capacità del modello di:

- replicare pattern strutturali (congestione, ondate di rework),
- discriminare politiche migliori da peggiori,
- fornire bande di previsione credibili.

### Split temporale: train/validate

Si divide una serie storica in:

- periodo A (calibrazione parametri),
- periodo B (validazione).

Si verifica se il modello, con parametri stimati su A, riproduce su B:

- media e dispersione di $L[n]$,
- flusso di consegne $c[n]$,
- frequenza e timing di ondate di rientri (anche qualitativamente),
- percentili del tempo di ciclo (se ricostruiti tramite proxy).

### Validazione delle code lunghe

Poiché i fenomeni critici sono spesso in coda (percentili alti), è importante verificare:

- se il modello “vede” periodi di rischio alto (WIP alto, backlog latente alto),
- se le politiche simulate riducono i picchi e non solo la media.

***

## Politiche robuste: criterio di progetto con incertezza

Dato un insieme di parametri incerti (Cap. 14), una politica è robusta se:

1. mantiene $L[n]$ sotto una soglia nella maggioranza degli scenari,
2. evita divergenza (nessuna traiettoria esplode),
3. riduce i percentili alti dei tempi rispetto alla baseline,
4. è insensibile a variazioni moderate dei parametri (bassa sensibilità).

Formalmente, si può definire una funzione costo (semplice):

$$J = w_1 \cdot \max_n L[n] + w_2 \cdot \text{P90}(T_{\text{ciclo}}) + w_3 \cdot \max_n B_{\text{lat}}[n],$$

e confrontare $J$ tra politiche su ensemble di simulazioni.

Non è necessario ottimizzare in modo continuo: spesso basta confrontare poche politiche candidate.

***

## Collegamento esplicito con M/G/1: quando usare quale modello

È utile chiarire come i due livelli (queueing vs stock-and-flow) si integrano:

- **M/G/1** (Cap. 5) è efficace per:
  - comprendere il ruolo della variabilità ($\mathbb{E}[S^2]$),
  - capire la crescita non lineare vicino a $\rho\to 1$,
  - motivare limiti WIP e standardizzazione.

- **Stock-and-flow in spazio di stato** (Cap. 14–15) è efficace per:
  - rappresentare retroazione e memoria,
  - simulare dinamiche su settimane/mesi,
  - testare politiche con ritardi e rework.

In pratica:

- M/G/1 dà principi e sensibilità,
- lo spazio di stato dà traiettorie e scenari.

***

## Sintesi del capitolo

Questo capitolo ha fornito un’appendice più formale e operativa:

1. linearizzazione discreta: $\Delta x[n+1]\approx J_d\Delta x[n]$;
2. criterio di stabilità discreto: $|\lambda_i|<1$;
3. criterio di Lyapunov discreto: esistenza di $P\succ 0$ con $A^TPA-P\prec 0$;
4. esempio lineare con matrice $A$ che rende esplicito il ruolo di:
   - avvii ($\sigma$),
   - completamenti ($\kappa$),
   - rework ($\alpha$),
   - memoria ($\gamma$);
5. guida alla scelta del passo $\Delta$;
6. procedura di validazione e criterio di robustezza con incertezza;
7. chiarimento sul ruolo complementare di M/G/1 e del modello in spazio di stato.

Con questo capitolo si chiude l’architettura teorica completa: dai modelli di coda e variabilità fino alla dinamica con retroazione e memoria, e infine alla progettazione e verifica di politiche di controllo robuste.

***

# Bibliografia e riferimenti

## Teoria delle code e processi stocastici (fondamenti)

Little, J. D. C. (1961). A Proof for the Queueing Formula: L = λW. Operations Research, 9(3), 383–387. doi:10.1287/opre.9.3.383. Link: https://pubsonline.informs.org/doi/10.1287/opre.9.3.383

Wolff, R. W. (1982). Poisson Arrivals See Time Averages (PASTA). Operations Research, 30(2), 223–231. doi:10.1287/opre.30.2.223. Link: https://pubsonline.informs.org/doi/10.1287/opre.30.2.223

Kendall, D. G. (1951). Some Problems in the Theory of Queues. Journal of the Royal Statistical Society: Series B, 13(2), 151–185. doi:10.1111/j.2517-6161.1951.tb00080.x

Kingman, J. F. C. (1961). The Single Server Queue in Heavy Traffic. Mathematical Proceedings of the Cambridge Philosophical Society, 57(4), 902–904. doi:10.1017/S0305004100036094

Pollaczek, F. (1930). Über eine Aufgabe der Wahrscheinlichkeitstheorie. I. Mathematische Zeitschrift, 32, 64–100. doi:10.1007/BF01194620

Khinchin (Khinchin), A. Y. (1932). Mathematical theory of a stationary queue. Matematicheskii Sbornik, 39(4), 73–84.

Kleinrock, L. (1975). Queueing Systems, Volume 1: Theory. Wiley-Interscience. ISBN 978-0-471-49110-1.

Kleinrock, L. (1976). Queueing Systems, Volume 2: Computer Applications. Wiley-Interscience. ISBN 978-0-471-49111-8.

Gross, D., Shortle, J. F., Thompson, J. M., & Harris, C. M. (2008). Fundamentals of Queueing Theory (4th ed.). Wiley. ISBN 978-0-471-79127-0.

Asmussen, S. (2003). Applied Probability and Queues (2nd ed.). Springer. doi:10.1007/b97236. ISBN 978-0-387-00211-8.

Harchol-Balter, M. (2013). Performance Modeling and Design of Computer Systems: Queueing Theory in Action. Cambridge University Press. ISBN 978-1-107-02750-3.

## Variabilità, flusso e collegamento con contesti operativi (produzione/servizi)

Hopp, W. J., & Spearman, M. L. (2008). Factory Physics (3rd ed.). McGraw-Hill/Irwin. ISBN 978-0-07-123246-3.

Reinertsen, D. G. (2009). The Principles of Product Development Flow (2nd ed.). Celeritas Publishing. ISBN 978-1-935401-00-1.

Goldratt, E. M., & Cox, J. (2016; orig. 1984). The Goal: A Process of Ongoing Improvement. North River Press. ISBN 978-0-88427-195-6.

## System dynamics, rework e dinamica dei progetti (accumuli, ritardi, feedback)

Forrester, J. W. (1961). Industrial Dynamics. MIT Press. ISBN 978-0-262-06003-8.

Sterman, J. D. (2000). Business Dynamics: Systems Thinking and Modeling for a Complex World. Irwin/McGraw-Hill. ISBN 978-0-07-238915-9.

Ford, D. N., & Sterman, J. D. (1998). Dynamic modeling of product development processes. System Dynamics Review, 14(1), 31–68. doi:10.1002/(SICI)1099-1727(199821)14:1<31::AID-SDR141>3.0.CO;2-5

Repenning, N. P. (2001). Understanding Fire Fighting in New Product Development. Journal of Product Innovation Management, 18(5), 285–300. doi:10.1016/S0737-6782(01)00099-6

Repenning, N. P., & Sterman, J. D. (2002). Capability Traps and Self-Confirming Attribution Errors in the Dynamics of Process Improvement. Administrative Science Quarterly, 47(2), 265–295. doi:10.2307/3094806

MIT OpenCourseWare (2012). ESD.36 System Project Management — Lecture: The Rework Cycle (materiale didattico). Link: https://ocw.mit.edu

## Sistemi dinamici, linearizzazione (Jacobiano) e stabilità (Lyapunov)

Strogatz, S. H. (2015). Nonlinear Dynamics and Chaos (2nd ed.). CRC Press. ISBN 978-0-8133-4910-7.

Khalil, H. K. (2002). Nonlinear Systems (3rd ed.). Prentice Hall. ISBN 978-0-13-067389-3.

Sontag, E. D. (1998). Mathematical Control Theory: Deterministic Finite Dimensional Systems (2nd ed.). Springer. doi:10.1007/978-1-4612-0577-7. ISBN 978-0-387-98489-6.

## Ritardi, memoria distribuita e funzionali di Lyapunov–Krasovskii

Krasovskii, N. N. (1963). Stability of Motion: Applications of Lyapunov’s Second Method to Differential Systems and Equations with Delay. Stanford University Press.

Hale, J. K., & Verduyn Lunel, S. M. (1993). Introduction to Functional Differential Equations. Springer. doi:10.1007/978-1-4612-4342-7. ISBN 978-0-387-94326-8.

Niculescu, S.-I. (2001). Delay Effects on Stability: A Robust Control Approach. Springer. doi:10.1007/1-84628-553-4. ISBN 978-1-85233-291-4.

Kolmanovskii, V., & Myshkis, A. (1999). Introduction to the Theory and Applications of Functional Differential Equations. Springer. doi:10.1007/978-94-017-1965-0. ISBN 978-0-7923-4832-6.

Fridman, E. (2014). Introduction to Time-Delay Systems: Analysis and Control. Springer/Birkhäuser. doi:10.1007/978-3-319-09393-2. ISBN 978-3-319-09392-5.

## Sistemi complessi (background concettuale)

Nobel Prize (2021). Nobel Prize Lecture — Giorgio Parisi. NobelPrize.org. Link: https://www.nobelprize.org/prizes/physics/2021/parisi/lecture/

Nobel Prize Outreach (2021). Scientific Background for the Nobel Prize in Physics 2021 (PDF). NobelPrize.org. Link: https://www.nobelprize.org/uploads/2021/10/sciback_fy_en_21.pdf

Mézard, M., Parisi, G., & Virasoro, M. A. (1987). Spin Glass Theory and Beyond. World Scientific. ISBN 978-981-459324-0.

Watts, D. J., & Strogatz, S. H. (1998). Collective dynamics of “small-world” networks. Nature, 393, 440–442. doi:10.1038/30918

Barabási, A.-L., & Albert, R. (1999). Emergence of scaling in random networks. Science, 286(5439), 509–512. doi:10.1126/science.286.5439.509

## Sensemaking e decisione in contesti complessi (ponte verso management)

Kurtz, C. F., & Snowden, D. J. (2003). The new dynamics of strategy: Sense-making in a complex and complicated world. IBM Systems Journal, 42(3), 462–483. doi:10.1147/sj.423.0462

Snowden, D. J., & Boone, M. E. (2007). A Leader’s Framework for Decision Making. Harvard Business Review, 85(11), 68–76. Link: https://hbr.org/2007/11/a-leaders-framework-for-decision-making

Stacey, R. D. (2016). Strategic Management and Organisational Dynamics: The Challenge of Complexity to Ways of Thinking about Organisations (7th ed.). Pearson.

***

# Allegati A1–A12 — Appendice matematica estesa

**Convenzioni globali (valide in tutti gli allegati)**  

- Tempo: variabile continua $t\ge 0$ (oppure discreta $n\in\mathbb{N}$ negli esempi discreti).
- Tasso di arrivo: $\lambda$ con unità $[1/\text{tempo}]$.
- Tempo di servizio: $S$ con unità $[\text{tempo}]$.
- Utilizzazione: $\rho=\lambda \mathbb{E}[S]$ (adimensionale).
- Numero nel sistema: $L$ (adimensionale).
- Tempo nel sistema: $W$ con unità $[\text{tempo}]$.
- Tempo d’attesa in coda: $W_q$ con unità $[\text{tempo}]$.
- $F_X(x)=\mathbb{P}(X\le x)$ è la CDF; $f_X(x)$ la densità (se esiste).
- Indicatori: $\mathbf{1}_A$ vale 1 se l’evento $A$ accade, altrimenti 0.
- “a.s.” = quasi certamente.

***

## A1 — Notazione minima di probabilità

### A1.1 Variabili aleatorie, media e varianza
Una variabile aleatoria è una funzione $X:\Omega\to\mathbb{R}$.

Per $X$ integrabile:

- discreta: $\mathbb{E}[X]=\sum_x x\,\mathbb{P}(X=x)$
- continua: $\mathbb{E}[X]=\int x f_X(x)\,dx$

Varianza:
$$
\mathrm{Var}(X)=\mathbb{E}[X^2]-\mathbb{E}[X]^2.
$$

Momenti:
$$
m_k=\mathbb{E}[X^k] \quad (k=1,2,\dots)
$$

### A1.2 Condizionamento e indipendenza
Per evento $A$ con $\mathbb{P}(A)>0$:
$$
\mathbb{E}[X\mid A] = \frac{\mathbb{E}[X\mathbf{1}_A]}{\mathbb{P}(A)}.
$$

Indipendenza: $X$ e $Y$ indipendenti se
$$
\mathbb{P}(X\in B,\,Y\in C)=\mathbb{P}(X\in B)\mathbb{P}(Y\in C)
$$
per ogni boreliani $B,C$.

### A1.3 Controllo dimensionale (utile sempre)
Esempio: $\rho=\lambda\mathbb{E}[S]$ è adimensionale perché
$[\lambda]=1/t$, $[\mathbb{E}[S]]=t$.

#### Esercizio A1
Se $X\sim \mathrm{Exp}(\mu)$, calcola $\mathbb{E}[X]$, $\mathbb{E}[X^2]$.
**Soluzione:** $\mathbb{E}[X]=1/\mu$, $\mathbb{E}[X^2]=2/\mu^2$.

***

## A2 — Arrivi Poisson ed esponenziale tra arrivi

Un processo $N(t)$ è Poisson di tasso $\lambda$ se:

- $N(0)=0$,
- incrementi indipendenti,
- $N(t)\sim\mathrm{Poisson}(\lambda t)$.

Quindi:
$$
\mathbb{P}(N(t)=k)=e^{-\lambda t}\frac{(\lambda t)^k}{k!}.
$$

### A2.1 Tempo del primo arrivo
$$
\mathbb{P}(T_1>t)=\mathbb{P}(N(t)=0)=e^{-\lambda t}
\Rightarrow\;
T_1\sim\mathrm{Exp}(\lambda).
$$
I tempi tra arrivi $(A_i)$ sono i.i.d. $\mathrm{Exp}(\lambda)$.

### A2.2 Assenza di memoria (esponenziale)
Per $X\sim \mathrm{Exp}(\lambda)$:
$$
\mathbb{P}(X>s+t\mid X>s)=\mathbb{P}(X>t).
$$

#### Esercizio A2
Calcola $\mathbb{E}[N(t)]$ e $\mathrm{Var}(N(t))$.
**Soluzione:** entrambe $=\lambda t$.

***

## A3 — CTMC e processi nascita–morte

### A3.1 Catena di Markov a tempo continuo (CTMC)
Una CTMC su stati $\{0,1,2,\dots\}$ è definita dal **generatore** $Q=(q_{ij})$:

- per $i\ne j$, $q_{ij}\ge 0$ è il tasso di transizione $i\to j$,
- $q_{ii}=-\sum_{j\ne i} q_{ij}$.

### A3.2 Processi nascita–morte
È un caso particolare in cui:

- da $n$ si può andare solo a $n+1$ (nascita) con tasso $\lambda_n$,
- o a $n-1$ (morte) con tasso $\mu_n$.

Quindi:
$$
q_{n,n+1}=\lambda_n,\quad q_{n,n-1}=\mu_n,\quad q_{n,n}=-(\lambda_n+\mu_n).
$$

### A3.3 Equazioni di Kolmogorov (forward)
Se $p_n(t)=\mathbb{P}(X(t)=n)$:
$$
\frac{dp_n}{dt}=\sum_{m} p_m(t)q_{m n}.
$$

Per nascita–morte:
$$
\frac{dp_n}{dt}=p_{n-1}\lambda_{n-1}+p_{n+1}\mu_{n+1}-p_n(\lambda_n+\mu_n).
$$

#### Esercizi A3
1) Scrivi $Q$ per un processo nascita–morte con $\lambda_n=\lambda$, $\mu_n=\mu$ per $n\ge 1$, e $\mu_0=0$.  
**Soluzione:** tri-diagonale con costanti.

***

## A4 — M/M/1: distribuzione stazionaria $\pi_n$ e condizione $\rho<1$

### A4.1 Modello M/M/1 come CTMC
Stato $n$ = numero di job nel sistema.  

- Arrivi Poisson: $n\to n+1$ con tasso $\lambda$.
- Servizi esponenziali: $n\to n-1$ con tasso $\mu$ per $n\ge 1$.

Quindi $\lambda_n=\lambda$ e $\mu_n=\mu$ ($n\ge 1$).

### A4.2 Equazioni di bilancio stazionario
In stazionario $p_n(t)\to \pi_n$ e $d\pi_n/dt=0$.

Per nascita–morte vale il **bilancio locale** (detailed balance):
$$
\pi_n \lambda = \pi_{n+1}\mu\quad (n\ge 0).
$$

Da cui ricorrenza:
$$
\pi_{n+1}=\frac{\lambda}{\mu}\pi_n=\rho\,\pi_n,
\quad \rho=\frac{\lambda}{\mu}.
$$

Quindi:
$$
\pi_n=\rho^n \pi_0.
$$

### A4.3 Normalizzazione e $\pi_0$
Imponendo $\sum_{n=0}^{\infty}\pi_n=1$:
$$
\sum_{n=0}^{\infty}\rho^n\pi_0=\pi_0\frac{1}{1-\rho}=1
\quad \Rightarrow\quad \pi_0=1-\rho.
$$

Quindi:
$$
\boxed{\pi_n=(1-\rho)\rho^n,\quad 0\le \rho<1.}
$$

### A4.4 Perché serve $\rho<1$
Se $\rho\ge 1$, la serie $\sum\rho^n$ diverge e non esiste normalizzazione: non esiste distribuzione stazionaria (il sistema “non si stabilizza”).

#### Esercizi A4
1) Calcola $\mathbb{E}[L]$ per M/M/1 usando $\pi_n$.  
**Soluzione:**  
$$
\mathbb{E}[L]=\sum_{n\ge 0} n(1-\rho)\rho^n=\frac{\rho}{1-\rho}.
$$

2) Calcola $\mathbb{P}(L=0)$ e interpreta.  
**Soluzione:** $\pi_0=1-\rho$, probabilità che il server sia vuoto.

***

## A5 — Legge di Little: dimostrazione “sample-path”

### A5.1 Setup: curva del numero nel sistema
Sia $L(t)$ il numero di job nel sistema al tempo $t$. Considera intervallo $[0,T]$.

Sia $N(T)$ il numero di job che **arrivano** nell’intervallo $[0,T]$ (o equivalenti: che entrano nel sistema).

Sia $W_i$ il tempo di permanenza nel sistema del job $i$ (dal suo ingresso alla sua uscita). Per i job che non escono entro $T$, si gestisce con termini di bordo (che diventano trascurabili sotto ipotesi stazionarie e stabilità).

### A5.2 Identità area = somma delle permanenze
Definiamo per ogni job $i$ l’indicatore:
$$
I_i(t)=\mathbf{1}\{\text{job }i\text{ è nel sistema al tempo }t\}.
$$
Allora:
$$
L(t)=\sum_{i} I_i(t).
$$

Integra su $[0,T]$:
$$
\int_0^T L(t)\,dt
=\int_0^T \sum_i I_i(t)\,dt
=\sum_i \int_0^T I_i(t)\,dt.
$$

Ma $\int_0^T I_i(t)\,dt$ è la quantità di tempo che il job $i$ passa nel sistema durante $[0,T]$, che coincide con $W_i$ per i job interamente contenuti in $[0,T]$ (gli altri generano un errore di bordo).

Quindi:
$$
\int_0^T L(t)\,dt
=\sum_{i=1}^{N(T)} W_i + \text{(termini di bordo)}.
$$

Dividendo per $T$:
$$
\frac{1}{T}\int_0^T L(t)\,dt
= \frac{N(T)}{T}\cdot \frac{1}{N(T)}\sum_{i=1}^{N(T)} W_i + \varepsilon(T).
$$

Se il sistema è stabile e stazionario, al limite $T\to\infty$:

- $\frac{1}{T}\int_0^T L(t)\,dt \to \mathbb{E}[L]$,
- $\frac{N(T)}{T}\to \lambda$,
- $\frac{1}{N(T)}\sum W_i \to \mathbb{E}[W]$,
- $\varepsilon(T)\to 0$.

Otteniamo:
$$
\boxed{\mathbb{E}[L]=\lambda \mathbb{E}[W].}
$$

Questa è la legge di Little, dimostrata senza usare Markovianità.

#### Esercizi A5
1) Ripeti la dimostrazione per “solo la coda” (escludendo il job in servizio).  
**Hint:** definisci $L_q(t)$.

2) Spiega perché i termini di bordo vanno a zero in un sistema stabile.  
**Soluzione concettuale:** il numero medio di job “parziali” è limitato e non cresce con $T$, quindi diviso $T$ tende a zero.

***

## A6 — PASTA: gli arrivi Poisson “vedono” le medie temporali

### A6.1 Enunciato
Se gli arrivi sono Poisson e $X(t)$ è un processo stazionario (es. numero nel sistema),
allora la distribuzione di $X$ osservata agli istanti di arrivo coincide con la distribuzione temporale stazionaria:
$$
\mathbb{P}(X(T_k)=n)=\pi_n.
$$

### A6.2 Intuizione rigorosa
Gli arrivi Poisson “campionano” il tempo senza bias: la probabilità di un arrivo in un intervallo piccolo $(t,t+\Delta]$
è proporzionale a $\Delta$ e indipendente dallo stato fino a $t$.

**Nota tecnica:** una dimostrazione completamente formale usa probabilità di Palm; qui basta l’idea, perché PASTA viene usato come lemma operativo.

***

## A7 — Residual life e size-biasing: perché compare $\mathbb{E}[S^2]$

### A7.1 “Osservare un job in servizio” e bias di lunghezza
Se si sceglie un istante casuale nel tempo e si chiede: “che job è in servizio?”, i job lunghi hanno più probabilità di essere osservati, perché occupano il server più a lungo.

Questo produce una **distribuzione size-biased**.

### A7.2 Dimostrazione della densità size-biased
Sia $S$ la durata del job, con densità $f_S(s)$ e media $\mathbb{E}[S]$.

Considera un grande intervallo di tempo. La frazione di tempo occupata da job con durata in $(s,s+ds)$ è proporzionale a:

- numero di job con durata circa $s$: proporzionale a $f_S(s)ds$,
- tempo occupato da ciascuno: proporzionale a $s$.

Quindi la densità osservata $f_{S^*}(s)$ soddisfa:
$$
f_{S^*}(s)\propto s f_S(s).
$$

Normalizzando (l’area deve valere 1):
$$
\int_0^\infty f_{S^*}(s)\,ds = 1
\quad \Rightarrow\quad
f_{S^*}(s)=\frac{s f_S(s)}{\mathbb{E}[S]}.
$$

### A7.3 Vita residua e secondo momento
Dato che si osserva un job di durata totale $S^*=s$, l’istante di osservazione è “uniforme” dentro il suo intervallo di servizio (in media). Quindi la vita residua condizionata è:
$$
\mathbb{E}[S_{\text{res}}\mid S^*=s]=\frac{s}{2}.
$$

Allora:
$$
\mathbb{E}[S_{\text{res}}]
=\mathbb{E}\!\left[\mathbb{E}[S_{\text{res}}\mid S^*]\right]
=\mathbb{E}\!\left[\frac{S^*}{2}\right]
=\frac{1}{2}\mathbb{E}[S^*].
$$

Ma:
$$
\mathbb{E}[S^*]=\int_0^\infty s\, f_{S^*}(s)\,ds
=\int_0^\infty s\,\frac{s f_S(s)}{\mathbb{E}[S]}\,ds
=\frac{\mathbb{E}[S^2]}{\mathbb{E}[S]}.
$$

Quindi:
$$
\boxed{\mathbb{E}[S_{\text{res}}]=\frac{\mathbb{E}[S^2]}{2\mathbb{E}[S]}.}
$$

Questo è il punto matematico preciso: **il secondo momento entra perché la distribuzione osservata è pesata per $s$**.

#### Esercizi A7
1) Se $S$ è deterministica (sempre $s_0$), calcola $\mathbb{E}[S_{\text{res}}]$.  
**Soluzione:** $\mathbb{E}[S^2]=s_0^2$, $\mathbb{E}[S]=s_0$, quindi $\mathbb{E}[S_{\text{res}}]=s_0/2$.

2) Se $S\sim \mathrm{Exp}(\mu)$, verifica che $\mathbb{E}[S_{\text{res}}]=\mathbb{E}[S]=1/\mu$.  
**Soluzione:** $\mathbb{E}[S^2]=2/\mu^2$, quindi $\frac{2/\mu^2}{2(1/\mu)}=1/\mu$.

***

## A8 — M/G/1: formula di Pollaczek–Khinchine via workload

### A8.1 Risultato
Per M/G/1 stabile ($\rho=\lambda\mathbb{E}[S]<1$):
$$
\boxed{\mathbb{E}[W_q]=\frac{\lambda \mathbb{E}[S^2]}{2(1-\rho)} }.
$$

### A8.2 Workload e identificazione con l’attesa
Sia $V(t)$ il workload: tempo necessario a svuotare il sistema da $t$ in poi se non arrivasse più nessuno
(include il residuo del job in servizio).  
In FIFO, l’attesa in coda di un arrivo a tempo $t$ è:
$$
W_q(t)=V(t).
$$
Per PASTA, in stazionario:
$$
\mathbb{E}[W_q]=\mathbb{E}[V].
$$

### A8.3 Bilancio stazionario su $V^2$ (“quadratic trick”)
Tra arrivi, quando $V>0$ vale $\dot V=-1$, quindi $\frac{d}{dt}V^2=-2V$.  
A ogni arrivo con servizio $S$, il workload salta $V\mapsto V+S$, quindi
$$
(V+S)^2 - V^2 = 2VS + S^2.
$$

In stazionario, variazione media di $V^2$ per unità di tempo = 0:
$$
0=\lambda\,\mathbb{E}[2VS+S^2]-2\mathbb{E}[V].
$$
Per PASTA e indipendenza tra $V$ e $S$ all’arrivo:
$$
\mathbb{E}[VS]=\mathbb{E}[V]\mathbb{E}[S].
$$
Quindi:
$$
0=\lambda\left(2\mathbb{E}[V]\mathbb{E}[S]+\mathbb{E}[S^2]\right)-2\mathbb{E}[V].
$$
Risolvendo:
$$
\mathbb{E}[V]=\frac{\lambda\mathbb{E}[S^2]}{2(1-\lambda\mathbb{E}[S])}
=\frac{\lambda\mathbb{E}[S^2]}{2(1-\rho)}.
$$
E dunque $\mathbb{E}[W_q]=\mathbb{E}[V]$.

#### Esercizio A8
Verifica che per $S\sim\mathrm{Exp}(\mu)$ si ottiene $\mathbb{E}[W_q]=\rho/(\mu-\lambda)$.

***

## A9 — Rework come rinnovo: $\mathbb{E}[K]$ e modelli di riapertura

### A9.1 Variabile numero di visite $K$
Sia $K$ il numero di “visite” al ciclo tecnico (prima lavorazione + rientri).

Modello semplice:

- con probabilità $1-p_1$ non rientra: $K=1$
- con probabilità $p_1$ rientra almeno una volta: $K=1+J$
dove $J\ge 1$ è il numero di rientri.

### A9.2 Modello geometrico per rientri multipli
Un modello standard: dopo un rientro, la probabilità di un ulteriore rientro è $\psi$ (con $0\le \psi<1$). Allora $J$ è geometrica su $\{1,2,3,\dots\}$:
$$
\mathbb{P}(J=j)=(1-\psi)\psi^{j-1}.
$$
e:
$$
\mathbb{E}[J]=\frac{1}{1-\psi}.
$$

Quindi:
$$
\mathbb{E}[K]= (1-p_1)\cdot 1 + p_1\cdot \left(1+\mathbb{E}[J]\right)
=1+p_1\mathbb{E}[J]
=1+\frac{p_1}{1-\psi}.
$$

### A9.3 Collegamento con la stima “condizionata” $r$
Nel testo principale si è usato:
$$
r=\mathbb{E}[\text{numero di riaperture}\mid \text{almeno una riapertura}].
$$
Se $J$ è “numero di rientri”, allora $r=\mathbb{E}[J]$ e quindi:
$$
\boxed{\mathbb{E}[K]=1+p_1 r.}
$$

### A9.4 Perché questo moltiplica il carico effettivo
Se il tasso di nuove iniziative è $\lambda_0$, il tasso di “visite” è:
$$
\lambda=\lambda_0\mathbb{E}[K].
$$

#### Esercizi A9
1) Se $p_1=0.9$ e $r=2.5$, calcola $\mathbb{E}[K]$.  
**Soluzione:** $1+0.9\cdot 2.5=3.25$.

2) Modello troncato: $J\in\{1,2,3,4\}$ con probabilità date. Calcola $\mathbb{E}[K]$.  
**Hint:** $\mathbb{E}[J]=\sum j\mathbb{P}(J=j)$.

***

## A10 — Convoluzione e sistemi lineari: proprietà e pratica

### A10.1 Definizione (continuo)
Per un segnale $c(t)$ (con $c(t)=0$ per $t<0$) e un profilo di ritardo $k(\tau)$ (supporto su $\tau\ge 0$):
$$
(c*k)(t)=\int_0^\infty c(t-\tau)k(\tau)\,d\tau
=\int_0^t c(t-\tau)k(\tau)\,d\tau.
$$

### A10.2 Proprietà
Linearità:
$$
(a c_1+b c_2)*k = a(c_1*k)+b(c_2*k).
$$
Associatività (utile per “filtri in cascata”):
$$
(c*k_1)*k_2=c*(k_1*k_2).
$$

### A10.3 Interpretazione fisica
$k(\tau)$ descrive “quanto” un input passato di età $\tau$ influisce oggi.  
Se $k$ ha coda lunga, c’è memoria lunga.

### A10.4 Esempi tipici
1) profilo di ritardo esponenziale: $k(\tau)=\gamma e^{-\gamma \tau}$  
Memoria con decadimento.

2) profilo di ritardo uniforme: $k(\tau)=1/H$ per $\tau\in[0,H]$, $k(\tau)=0$ altrove   
Media mobile.

3) profilo di ritardo power-law: $k(\tau)\propto (\tau+1)^{-(1+\eta)}$  
Coda lunga (memoria “lenta”).

#### Esercizi A10
1) Se $c(t)=C$ costante e $k$ è un profilo di ritardo normalizzato ($\int k=1$), mostra che $(c*k)(t)=C$.  
**Soluzione:** esce $C\int k = C$.

2) Calcola $(c*k)(t)$ con $c(t)=\mathbf{1}_{t\ge 0}$ e profilo di ritardo esponenziale.  
**Soluzione:** $(c*k)(t)=\int_0^t \gamma e^{-\gamma\tau}d\tau=1-e^{-\gamma t}$.

***

## A11 — Stabilità locale: linearizzazione e criteri spettrali

### A11.1 Continuo
$$
\dot{x}=f(x),\quad x\in\mathbb{R}^n,\qquad f(x^*)=0.
$$
Linearizzazione in $x^*$:
$$
\dot{\Delta x}=J(x^*)\Delta x,\qquad
J=\left.\frac{\partial f}{\partial x}\right|_{x^*}.
$$

**Criterio (sufficiente):** se tutti gli autovalori di $J$ hanno parte reale negativa,
$\mathrm{Re}(\lambda_i)<0$, allora l’equilibrio è localmente asintoticamente stabile.

### A11.2 Discreto
$$
x[n+1]=F(x[n]),\qquad x^*=F(x^*).
$$
Linearizzazione:
$$
\Delta x[n+1]=J_d(x^*)\Delta x[n],\qquad
J_d=\left.\frac{\partial F}{\partial x}\right|_{x^*}.
$$

**Criterio:** $|\lambda_i(J_d)|<1$.

#### Esercizio A11
Per $x[n+1]=ax[n]$, condizione di stabilità.
**Soluzione:** $|a|<1$.

***

## A12 — Lyapunov–Krasovskii: idea della stabilità con ritardo

Con ritardo discreto:
$$
\dot{x}(t)=f(x(t),x(t-\tau)).
$$
Lo stato non è solo $x(t)$, ma la storia $x_t(\theta)=x(t+\theta)$ per $\theta\in[-\tau,0]$.
Per questo serve un funzionale $V(x_t)$.

### A12.1 Caso lineare (forma standard)
$$
\dot{x}(t)=A x(t)+B x(t-\tau).
$$

Un funzionale classico:
$$
V(x_t)=x(t)^T P x(t) + \int_{t-\tau}^t x(s)^T Q x(s)\,ds,
\quad P\succ 0,\; Q\succeq 0.
$$

La derivata lungo le traiettorie porta a una condizione matriciale sufficiente (LMI) che garantisce $\dot V<0$
e quindi stabilità asintotica.

**Messaggio operativo:** più grande è $\tau$ (ritardo) o più “pesante” è la retroazione (norma di $B$),
più facile è perdere dissipazione e generare oscillazioni/instabilità.

#### Esercizio A12 (scalare)
Per $\dot{x}(t)=-a x(t)-b x(t-\tau)$ con $a>0$, discuti qualitativamente perché $b$ grande o $\tau$ grande possono destabilizzare.