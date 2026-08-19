var SIGMAFLOW = {
  TZ: 'Europe/Rome',
  PROP_SPREADSHEET_ID: 'SIGMAFLOW_SPREADSHEET_ID',
  PROP_SCHEMA_VERSION: 'SIGMAFLOW_SCHEMA_VERSION',
  SCHEMA_VERSION: '13',
  DEFAULT_SPREADSHEET_ID: '15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g',
  DEFAULT_TEST_SPREADSHEET_ID: '1kzoVGcIqcYIuGWgmRQbeuyK-37cmSaUQye3d36rhDRU',
  PROP_TEST_SPREADSHEET_ID: 'SIGMAFLOW_TEST_SPREADSHEET_ID',
  SHEETS: {
    JOBS: 'jobs',
    CASES: 'cases',
    VISITE: 'visite',
    CONFIG: 'config',
    JOBS_ARCHIVIO: 'jobs_archivio',
    VISITE_ARCHIVIO: 'visite_archivio',
    JOBS_CESTINO: 'jobs_cestino',
    VISITE_CESTINO: 'visite_cestino'
  },
  // N1 (DESIGN_archiviazione.md, §8b): campi di 'jobs' correggibili
  // manualmente tramite un evento 'correction' in Cronologia. Whitelist
  // esplicita — non un editor generico su qualunque colonna del foglio,
  // solo i due campi per cui esiste davvero un percorso di correzione
  // pensato (arrival_ts, gia' prima di questa sessione; incarico_chiuso_ts,
  // aggiunto qui).
  CORRECTABLE_FIELDS: ['arrival_ts', 'incarico_chiuso_ts'],
  STATUS_ALIASES: {
    blocked: 'wait_internal',
    in_progress: 'wip',
    stand_by: 'wait_internal',
    in_review: 'todo'
  },
  COLUMN_ROLES: ['backlog', 'wip', 'stand_by', 'done', 'neutral', 'prep'],
  // aging_days (M0-C): solo per ambienti nuovi/vuoti che creano lo
  // schema da questi default — chi esiste gia' passa invece dalla
  // migrazione una tantum in ensureCurrentSchema_ (Schema.gs), che
  // scrive lo stesso valore (5) solo sulle colonne stand_by ancora
  // prive del campo. Valori di esempio scelti da Marco: 5 per attesa
  // interna, 15 per attesa cliente, 45 per attesa enti — riflettono
  // tempi di risposta attesi diversi per tipo di attesa, non un limite
  // tecnico del modello.
  DEFAULT_COLUMNS: [
    { id: 'notes', label: 'NOTE', role: 'neutral', order: 1, color: '#E8E8E8' },
    { id: 'backlog', label: 'BACKLOG', role: 'backlog', order: 2, color: '#C8D8E8' },
    { id: 'todo', label: 'TO DO', role: 'prep', order: 3, color: '#A8C4E0' },
    { id: 'wip', label: 'WIP', role: 'wip', order: 4, color: '#5B9BD5' },
    { id: 'wait_client', label: 'ATTESA CLIENTE', role: 'stand_by', order: 5, color: '#FFD966', aging_days: 15 },
    { id: 'wait_authority', label: 'ATTESA ENTI', role: 'stand_by', order: 6, color: '#F4B942', aging_days: 45 },
    { id: 'wait_internal', label: 'ATTESA MT/GC', role: 'stand_by', order: 7, color: '#E8A020', aging_days: 5 },
    { id: 'done', label: 'DA INVIARE / DA FATTURARE', role: 'done', order: 8, color: '#70AD47' }
  ],
  PRIORITY_CLASSES: {
    p4_assess: { label: '0_Non urgente 🐘', color: '#D8DEE8', score_max: 2 },
    p1_plan: { label: '1_Da pianificare 🍩', color: '#F2C94C', score_max: 3 },
    p2_urgent: { label: '2_Urgente con margine 🦪', color: '#F2994A', score_max: 4 },
    p3_critical: { label: '3_Urgente 💎', color: '#D92D20', score_max: 99 }
  },
  CARD_COLORS: ['', '#DDEBF7', '#E2F0D9', '#FFF2CC', '#FCE4D6', '#E4DFEC', '#F4CCCC'],
  SIZE_POINTS: {
    XS: 3,
    S: 5,
    M: 8,
    L: 13,
    XL: 20
  },
  REWORK_CAUSES: ['wait_client', 'wait_authority', 'wait_internal', 'manual'],
  // Fase L2 (DESIGN_modello_caso_visita.md, sez. 4): mappa l'id della
  // colonna di attesa lasciata al campo accumulatore sulla visita aperta.
  // Stesso insieme fisso di id gia' assunto da REWORK_CAUSES sopra — una
  // colonna stand_by con un id diverso da questi tre non alimenta nessun
  // accumulatore (limite noto, da rivedere se in futuro si aggiungono
  // colonne di attesa personalizzate).
  WAIT_ACCUMULATOR_FIELDS: {
    wait_client: 't_cliente_d',
    wait_authority: 't_ente_d',
    wait_internal: 't_interno_d'
  },
  SCENARIOS: {
    optimistic: {
      label: 'Scenario ottimistico',
      arrivals_multiplier: 0.85,
      rework_multiplier: 0.80,
      time_multiplier: 0.90,
      capacity_multiplier: 1.05
    },
    baseline: {
      label: 'Scenario medio',
      arrivals_multiplier: 1.00,
      rework_multiplier: 1.00,
      time_multiplier: 1.00,
      capacity_multiplier: 1.00
    },
    pessimistic: {
      label: 'Scenario pessimistico',
      arrivals_multiplier: 1.15,
      rework_multiplier: 1.25,
      time_multiplier: 1.20,
      capacity_multiplier: 0.90
    }
  },
  DEFAULT_CONFIG: {
    team_size: 4,
    observation_window_days: 30,
    archiviazione_giorni_default: 30,
    backup_retention_giorni: 14,
    theoretical_capacity_per_day: '',
    size_XS_days: 0.5,
    size_S_days: 1,
    size_M_days: 2,
    size_L_days: 4,
    size_XL_days: 8,
    columns_json: '',
    assignees_json: '["Alessandra","Giovanni D","Marco","Altro"]',
    ambassadors_json: '[]',
    tags_json: '["AIA","ADR","VIA","rifiuti","acque","aria","suolo","rumore"]',
    scenarios_json: '',
    column_backlog: 'Backlog',
    column_in_progress: 'In corso',
    column_stand_by: 'Stand-by',
    column_in_review: 'In review',
    column_done: 'Fatto'
  }
};
