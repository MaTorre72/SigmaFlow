var SIGMAFLOW = {
  TZ: 'Europe/Rome',
  PROP_SPREADSHEET_ID: 'SIGMAFLOW_SPREADSHEET_ID',
  DEFAULT_SPREADSHEET_ID: '1OSVDfy7fOWSBNfoFUNLNHxB5AcdR-q6U59BuJjWaR-Q',
  SHEETS: {
    JOBS: 'jobs',
    CASES: 'cases',
    CONFIG: 'config'
  },
  STATUSES: ['backlog', 'in_progress', 'in_review', 'done', 'blocked'],
  SIZE_POINTS: {
    S: 1,
    M: 3,
    L: 8,
    XL: 20
  },
  DEFAULT_CONFIG: {
    capacity_hours_day: 6,
    team_size: 4,
    observation_window_days: 30,
    size_S_hours: 2,
    size_M_hours: 6,
    size_L_hours: 16,
    size_XL_hours: 40
  }
};
