# Come usare il programma di sviluppo autonomo

## Cosa hai in mano

| File | Dove va | Scopo |
|---|---|---|
| `PROGRAMMA_ACTIVITY_LOG.md` | Root del repo SigmaFlow | Il programma con le 10 fasi |
| `CLAUDE.md` | Root del repo SigmaFlow | Istruzioni permanenti per Claude Code |
| `PROGRAMMA_STATO.md` | Root del repo SigmaFlow | Creato da Claude Code alla Fase A |
| `docs/codex_sigmaflow_activity_log_backend.md` | Cartella `docs/` del repo | Specifica tecnica backend |
| `docs/codex_sigmaflow_activity_log_frontend.md` | Cartella `docs/` del repo | Specifica tecnica frontend |

Copiare tutti i file nelle posizioni indicate prima di avviare la prima sessione.

---

## Come avviare una sessione

Un solo comando, sempre uguale:

```
claude "leggi CLAUDE.md e PROGRAMMA_STATO.md, poi esegui la fase corrente"
```

Se è la prima sessione (Fase A non ancora avviata):

```
claude "leggi CLAUDE.md e PROGRAMMA_ACTIVITY_LOG.md, poi avvia la Fase A"
```

Claude Code legge le istruzioni, identifica la fase, lavora, aggiorna lo stato, si ferma.

---

## Cosa fare ai gate umani (Fasi A, F, J)

### Gate Fase A — Ricognizione
Claude Code crea `RICOGNIZIONE.md` e si ferma.
Tu leggi il file. Se è corretto e completo:
```
claude "la ricognizione è approvata, procedi con la fase B"
```

### Gate Fase F — Migrazione
Claude Code si ferma prima di eseguire la migrazione.
Tu esegui manualmente `migrateToActivityLog()` dall'editor GAS su TEST.
Controlli nel foglio TEST che i dati siano corretti.
Se tutto è ok:
```
claude "migrazione verificata, procedi con la fase G"
```

### Gate Fase J — Deploy finale
Claude Code si ferma dopo il deploy su TEST.
Tu verifichi la Web App in TEST manualmente.
Decidi tu quando e se fare merge su `main` e quando eseguire
la migrazione su PROD — Claude Code non lo fa mai da solo.

---

## Tempistiche consigliate per non consumare troppi token

Il programma è diviso in fasi con durata stimata. Rispettare una fase
per sessione è sufficiente per contenere il consumo.

| Fase | Durata stimata | Token stimati |
|---|---|---|
| A — Ricognizione | 20-30 min | ~15k |
| B — Schema e helpers | 20-30 min | ~20k |
| C — addActivityEvent + get | 30-40 min | ~35k |
| D — update + delete | 20-30 min | ~25k |
| E — moveJob | 15-20 min | ~15k |
| F — migrazione | 20-30 min | ~20k |
| G — Suite test | 40-50 min | ~50k |
| H — Frontend base | 30-40 min | ~35k |
| I — Frontend form + warning | 50-60 min | ~60k |
| J — Deploy e chiusura | 20 min | ~15k |

**Totale stimato: ~290k token** distribuiti su 10 sessioni separate.

Rispetto a un unico prompt che fa tutto: stesso risultato,
ma con verifica a ogni passo e possibilità di correggere prima
che un errore si propaghi alle fasi successive.

### Regola pratica
- Una fase al giorno è un ritmo sostenibile
- Non lanciare mai due fasi nella stessa sessione senza leggere
  prima l'esito della prima
- Se Claude Code si ferma con stato BLOCCATA, leggere le note
  in `PROGRAMMA_STATO.md` prima di riaprire la sessione

---

## Come riprendere dopo un blocco

Se Claude Code aggiorna `PROGRAMMA_STATO.md` con stato BLOCCATA:

1. Leggere la sezione "Note" in `PROGRAMMA_STATO.md`
2. Risolvere il problema indicato (spesso è un file non trovato
   o un test che fallisce per un motivo specifico)
3. Riaprire la sessione con:
   ```
   claude "leggi CLAUDE.md e PROGRAMMA_STATO.md, la fase [X] era bloccata
   per [motivo che hai risolto], riprendi da dove si era fermata"
   ```

---

## Cosa non delegare mai a Claude Code

- Merge su `main`
- Esecuzione di `migrateToActivityLog()` su PROD
- Deploy su PROD
- Modifica delle credenziali o delle Script Properties
