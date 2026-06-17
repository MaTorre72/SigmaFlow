var SIGMAFLOW = {
  TZ: 'Europe/Rome',
  PROP_SPREADSHEET_ID: 'SIGMAFLOW_SPREADSHEET_ID',
  DEFAULT_SPREADSHEET_ID: '1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q',
  DEFAULT_TEST_SPREADSHEET_ID: '15XQwfbTLH4wv8IOzhzIyhpATZY-9KmXoorhD4mpZk4g',
  PROP_TEST_SPREADSHEET_ID: 'SIGMAFLOW_TEST_SPREADSHEET_ID',
  SHEETS: {
    JOBS: 'jobs',
    CASES: 'cases',
    CONFIG: 'config'
  },
  STATUSES: ['backlog', 'in_progress', 'stand_by', 'in_review', 'done'],
  STATUS_ALIASES: {
    blocked: 'stand_by'
  },
  DEFAULT_COLUMN_LABELS: {
    backlog: 'Backlog',
    in_progress: 'In corso',
    stand_by: 'Stand-by',
    in_review: 'In review',
    done: 'Fatto'
  },
  SIZE_POINTS: {
    XS: 3,
    S: 5,
    M: 8,
    L: 13,
    XL: 20
  },
  DEFAULT_CONFIG: {
    team_size: 4,
    observation_window_days: 30,
    size_XS_days: 0.5,
    size_S_days: 1,
    size_M_days: 2,
    size_L_days: 4,
    size_XL_days: 8,
    column_backlog: 'Backlog',
    column_in_progress: 'In corso',
    column_stand_by: 'Stand-by',
    column_in_review: 'In review',
    column_done: 'Fatto'
  }
};
