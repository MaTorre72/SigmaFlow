// Fase V2: percorso semantico dedicato alla nuova dashboard.
// Questo file non modifica ne' riusa computeVisiteFromLog_: la cronologia
// originale viene letta e normalizzata in memoria senza essere alterata.

var DASHBOARD_V2_OPERATIONAL_ROLES_ = ['backlog', 'prep', 'wip', 'stand_by', 'done'];

function dashboardV2ColumnMap_(config) {
  var map = {};
  columnsFromConfig_(config).forEach(function(column) {
    map[column.id] = column;
  });
  return map;
}

function dashboardV2CloneEvent_(event) {
  var clone = {};
  Object.keys(event || {}).forEach(function(key) { clone[key] = event[key]; });
  return clone;
}

// V2.1 (§3): comprime soltanto i passaggi consecutivi verso la stessa
// colonna. Conserva riferimenti agli eventi grezzi e segnala i salti
// logici, ma non inventa stati, timestamp o permanenze intermedie.
function normalizeActivityLogForDashboard_(job, columnMap, now) {
  var raw = job && job.activity_log_json;
  var parsed = [];
  var anomalies = [];
  if (raw) {
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        anomalies.push({ type: 'invalid_activity_log', message: 'La cronologia non e un array.' });
        parsed = [];
      }
    } catch (err) {
      anomalies.push({ type: 'invalid_activity_log', message: 'La cronologia non e interpretabile.' });
      parsed = [];
    }
  }

  var ordered = parsed.map(function(event, index) {
    return { event: dashboardV2CloneEvent_(event), original_index: index };
  }).sort(function(a, b) {
    var compared = dashboardV2Instant_(a.event.ts) - dashboardV2Instant_(b.event.ts);
    return compared !== 0 ? compared : a.original_index - b.original_index;
  });

  var logicalStates = [];
  var significantEvents = [];
  var compressedDuplicates = [];
  var skippedStates = [];
  var previousColumnId = null;

  ordered.forEach(function(entry) {
    var event = entry.event;
    if (event.type !== 'move') { return; }
    var timestamp = dashboardV2Instant_(event.ts);
    if (!event.ts || isNaN(timestamp.getTime())) {
      anomalies.push({
        type: 'invalid_move_timestamp',
        event_id: event.id || null,
        original_event_index: entry.original_index
      });
      return;
    }
    var targetColumn = columnMap[event.to];
    if (!targetColumn) {
      anomalies.push({
        type: 'unknown_target_column',
        event_id: event.id || null,
        column_id: event.to || null,
        original_event_index: entry.original_index
      });
      return;
    }

    if (previousColumnId === event.to) {
      var state = logicalStates[logicalStates.length - 1];
      state.original_event_refs.push({ id: event.id || null, index: entry.original_index });
      compressedDuplicates.push({
        event_id: event.id || null,
        original_event_index: entry.original_index,
        column_id: event.to,
        retained_entry_ts: state.entered_at
      });
      return;
    }

    var previousState = logicalStates.length ? logicalStates[logicalStates.length - 1] : null;
    if (previousState) {
      previousState.exited_at = event.ts;
      if (event.from !== undefined && event.from !== null && event.from !== previousState.column_id) {
        anomalies.push({
          type: 'discontinuous_from',
          event_id: event.id || null,
          declared_from: event.from,
          reconstructed_from: previousState.column_id,
          original_event_index: entry.original_index
        });
      }
    }

    var previousRole = previousState ? previousState.role : null;
    var skipped = dashboardV2SkippedRoles_(previousRole, targetColumn.role);
    if (skipped.length) {
      skippedStates.push({
        event_id: event.id || null,
        from_role: previousRole,
        to_role: targetColumn.role,
        skipped_roles: skipped,
        at: event.ts
      });
    }

    var logicalState = {
      column_id: event.to,
      role: targetColumn.role,
      entered_at: event.ts,
      exited_at: null,
      original_event_refs: [{ id: event.id || null, index: entry.original_index }]
    };
    logicalStates.push(logicalState);
    significantEvents.push({
      type: 'state_entry',
      at: event.ts,
      from_column_id: previousState ? previousState.column_id : null,
      from_role: previousRole,
      to_column_id: event.to,
      to_role: targetColumn.role,
      original_event_ref: { id: event.id || null, index: entry.original_index }
    });
    previousColumnId = event.to;
  });

  if (logicalStates.length) {
    var finalEnd = job.incarico_chiuso_ts || (now ? now.toISOString() : null);
    logicalStates[logicalStates.length - 1].exited_at = finalEnd;
  }

  return {
    job_id: job.job_id || null,
    logical_states: logicalStates,
    significant_events: significantEvents,
    compressed_duplicates: compressedDuplicates,
    skipped_states: skippedStates,
    anomalies: anomalies,
    original_event_count: parsed.length
  };
}

function dashboardV2SkippedRoles_(fromRole, toRole) {
  var fromIndex = DASHBOARD_V2_OPERATIONAL_ROLES_.indexOf(fromRole);
  var toIndex = DASHBOARD_V2_OPERATIONAL_ROLES_.indexOf(toRole);
  if (fromIndex < 0 || toIndex <= fromIndex + 1 || toIndex > 2) { return []; }
  return DASHBOARD_V2_OPERATIONAL_ROLES_.slice(fromIndex + 1, toIndex);
}

function dashboardV2CurrentWork_(jobs, columnMap) {
  var totals = {
    wip_jobs: 0, wip_points: 0,
    future_work_jobs: 0, future_work_points: 0,
    backlog_jobs: 0, backlog_points: 0,
    prep_jobs: 0, prep_points: 0,
    waiting_jobs: 0, waiting_points: 0
  };
  jobs.forEach(function(job) {
    var column = columnMap[normalizeStatus_(job.status)] || { role: 'neutral' };
    var points = jobPoints_(job);
    if (column.role === 'wip') {
      totals.wip_jobs++;
      totals.wip_points += points;
    }
    if (column.role === 'backlog' || column.role === 'prep') {
      totals.future_work_jobs++;
      totals.future_work_points += points;
    }
    if (column.role === 'backlog') {
      totals.backlog_jobs++;
      totals.backlog_points += points;
    }
    if (column.role === 'prep') {
      totals.prep_jobs++;
      totals.prep_points += points;
    }
    if (column.role === 'stand_by') {
      totals.waiting_jobs++;
      totals.waiting_points += points;
    }
  });
  Object.keys(totals).forEach(function(key) { totals[key] = round_(totals[key]); });
  return totals;
}

function dashboardV2OptionalNumber_(value) {
  if (value === '' || value === null || value === undefined) { return null; }
  var numeric = Number(value);
  return isFinite(numeric) ? numeric : null;
}

// Numerazione sull'intera cronologia disponibile, prima di filtrare finestre.
// La chiusura richiede una vera uscita dal ruolo WIP: ne' now ne' una
// consegna o una chiusura amministrativa chiudono artificialmente l'episodio.
function dashboardV2WipEpisodes_(normalized, now) {
  var episodes = [];
  normalized.forEach(function(item) {
    var active = null;
    var number = 0;
    item.significant_events.forEach(function(event) {
      if (dashboardV2Instant_(event.at) > now) { return; }
      if (event.to_role === 'wip' && !active) {
        active = {
          job_id: item.job_id, wip_episode_number: ++number,
          opened_at: event.at, closed_at: null,
          opening_event_ref: event.original_event_ref, closing_event_ref: null
        };
        episodes.push(active);
      } else if (event.to_role !== 'wip' && active) {
        active.closed_at = event.at;
        active.closing_event_ref = event.original_event_ref;
        active = null;
      }
    });
  });
  return episodes;
}

// Bucket mobili consecutivi di 7 giorni, (inizio, fine], ancorati a now.
// Le settimane senza aperture valgono zero e restano nella media.
function dashboardV2Absorption_(episodes, jobsById, now, weeks, windowWeeks, minSamples) {
  var duration = 7 * 86400000;
  var weekly = [];
  for (var i = 0; i < weeks; i++) {
    var end = new Date(now.getTime() - (weeks - 1 - i) * duration);
    var start = new Date(end.getTime() - duration);
    var inWeek = episodes.filter(function(e) {
      var at = dashboardV2Instant_(e.opened_at);
      return at > start && at <= end;
    });
    var first = inWeek.filter(function(e) { return e.wip_episode_number === 1; });
    weekly.push({
      period_start: start.toISOString(), period_end: end.toISOString(),
      first_wip_episodes: first.length,
      rework_wip_episodes: inWeek.length - first.length,
      total_wip_episodes: inWeek.length,
      rework_episode_share: inWeek.length ? (inWeek.length - first.length) / inWeek.length : null,
      new_work_absorbed_points_week: first.reduce(function(sum, e) { return sum + jobPoints_(jobsById[e.job_id]); }, 0)
    });
  }
  weekly.forEach(function(bucket, i) {
    var sample = weekly.slice(Math.max(0, i + 1 - windowWeeks), i + 1);
    var count = sample.reduce(function(sum, b) { return sum + b.first_wip_episodes; }, 0);
    var enough = sample.length === windowWeeks && count >= minSamples;
    bucket.new_work_capacity_points_per_week = enough
      ? sample.reduce(function(sum, b) { return sum + b.new_work_absorbed_points_week; }, 0) / windowWeeks : null;
    bucket.new_work_capacity_jobs_per_week = enough ? count / windowWeeks : null;
    bucket.sample_size = count;
    bucket.quality = enough ? 'sufficient' : 'insufficient';
  });
  return weekly;
}

// Aggrega numeratore e denominatore dei bucket della finestra configurata.
// Non media le percentuali settimanali: settimane con volumi diversi devono
// pesare per il numero reale di ingressi in lavorazione.
function dashboardV3RecentRework_(capacity) {
  var newWork = (capacity || {}).new_work || {};
  var weekly = newWork.weekly || [];
  var windowWeeks = Number(newWork.window_weeks);
  var validWindow = isFinite(windowWeeks) && windowWeeks > 0 &&
    Math.floor(windowWeeks) === windowWeeks && weekly.length >= windowWeeks;
  if (!validWindow) {
    return {
      first_wip_entries: 0,
      rework_wip_entries: 0,
      total_wip_entries: 0,
      rework_share: null,
      rework_window_weeks: null,
      rework_window_start: null,
      rework_window_end: null
    };
  }
  var sample = weekly.slice(weekly.length - windowWeeks);
  var first = sample.reduce(function(sum, bucket) {
    return sum + Number(bucket.first_wip_episodes || 0);
  }, 0);
  var rework = sample.reduce(function(sum, bucket) {
    return sum + Number(bucket.rework_wip_episodes || 0);
  }, 0);
  var total = first + rework;
  return {
    first_wip_entries: first,
    rework_wip_entries: rework,
    total_wip_entries: total,
    rework_share: total ? rework / total : null,
    rework_window_weeks: windowWeeks,
    rework_window_start: sample[0].period_start,
    rework_window_end: sample[sample.length - 1].period_end
  };
}

function dashboardV2CapacityMetric_(visits, jobsById, since, now, windowWeeks, minSamples) {
  var eligible = visits.filter(function(visit) {
    if (!visit.consegna_ts) { return false; }
    var completedAt = dashboardV2Instant_(visit.consegna_ts);
    return !isNaN(completedAt.getTime()) && completedAt > since && completedAt <= now;
  });
  var usable = eligible.filter(function(visit) { return Boolean(jobsById[visit.job_id]); });
  var sampleSize = usable.length;
  var enough = sampleSize >= minSamples;
  var points = usable.reduce(function(sum, visit) {
    return sum + jobPoints_(jobsById[visit.job_id]);
  }, 0);
  var completionWeeks = {};
  usable.forEach(function(visit) {
    var instant = dashboardV2Instant_(visit.consegna_ts);
    var localDay = new Date(dashboardV2WallClock_(instant).slice(0, 10) + 'T00:00:00Z');
    localDay.setUTCDate(localDay.getUTCDate() - ((localDay.getUTCDay() + 6) % 7));
    completionWeeks[localDay.toISOString().slice(0, 10)] = true;
  });
  return {
    rolling_capacity_points_per_week: enough ? round_(points / windowWeeks) : null,
    rolling_capacity_visits_per_week: enough ? round_(sampleSize / windowWeeks) : null,
    quality: enough ? 'sufficient' : 'insufficient',
    sample_size: sampleSize,
    window_weeks: windowWeeks,
    window_start: since.toISOString(),
    window_end: now.toISOString(),
    timezone: SIGMAFLOW.TZ,
    completed_points: round_(points),
    weeks_with_completions: Object.keys(completionWeeks).length,
    excluded_visits_without_job: eligible.length - usable.length,
    completions: usable.map(function(visit) {
      return {
        job_id: visit.job_id,
        incarico: (jobsById[visit.job_id] || {}).title || visit.job_id,
        cliente: (jobsById[visit.job_id] || {}).client || '',
        numero_visita: visit.numero_visita === undefined ? null : visit.numero_visita,
        consegna_ts: visit.consegna_ts,
        punti: jobPoints_(jobsById[visit.job_id])
      };
    }).sort(function(a, b) { return Date.parse(a.consegna_ts) - Date.parse(b.consegna_ts); })
  };
}

function dashboardV2Capacity_(jobs, archivedJobs, visits, archivedVisits, config, now, futureWorkPoints, episodes) {
  var windowWeeks = Number(config.capacity_window_weeks);
  var trendWeeks = Number(config.wip_trend_weeks);
  var minSamples = Number(config.min_samples_capacity);
  var validWindow = isFinite(windowWeeks) && windowWeeks > 0 && Math.floor(windowWeeks) === windowWeeks;
  var enoughHistoryConfigured = validWindow && isFinite(trendWeeks) && trendWeeks >= windowWeeks && Math.floor(trendWeeks) === trendWeeks && minSamples >= 1 && isFinite(minSamples) && Math.floor(minSamples) === minSamples;
  var configQuality = enoughHistoryConfigured ? 'valid' : 'invalid';
  if (!enoughHistoryConfigured) {
    return {
      configuration_quality: configQuality,
      configuration_message: 'Finestre e minimo campionario devono essere interi positivi; wip_trend_weeks deve essere almeno capacity_window_weeks.',
      observed: { rolling_capacity_points_per_week: null, rolling_capacity_visits_per_week: null, quality: 'insufficient', sample_size: 0, window_weeks: validWindow ? windowWeeks : null },
      new_work: { new_work_capacity_points_per_week: null, new_work_capacity_jobs_per_week: null, quality: 'insufficient', sample_size: 0, window_weeks: validWindow ? windowWeeks : null, first_cycle_definition: 'apertura del primo episodio WIP del job', weekly: [] },
      committed_weeks: null,
      committed_weeks_quality: 'insufficient',
      committed_weeks_sample_size: 0
    };
  }

  var since = new Date(now.getTime() - windowWeeks * 7 * 86400000);
  var allJobs = jobs.concat(archivedJobs || []);
  var jobsById = indexBy_(allJobs, 'job_id');
  var allVisits = visits.concat(archivedVisits || []);
  var observed = dashboardV2CapacityMetric_(allVisits, jobsById, since, now, windowWeeks, minSamples);
  // Decisione Marco: punti del job contati una sola volta, all'apertura
  // dell'episodio WIP 1. Riprese conteggiate senza replicare la taglia.
  var weekly = dashboardV2Absorption_(episodes, jobsById, now, trendWeeks, windowWeeks, minSamples);
  var firstCycle = weekly[weekly.length - 1];
  var newWorkPoints = firstCycle.new_work_capacity_points_per_week;
  var committedWeeks = newWorkPoints !== null && newWorkPoints > 0
    ? round_(futureWorkPoints / newWorkPoints)
    : null;
  return {
    configuration_quality: configQuality,
    configuration_message: null,
    observed: observed,
    new_work: {
      new_work_capacity_points_per_week: newWorkPoints,
      new_work_capacity_jobs_per_week: firstCycle.new_work_capacity_jobs_per_week,
      quality: firstCycle.quality,
      sample_size: firstCycle.sample_size,
      window_weeks: windowWeeks,
      first_cycle_definition: 'apertura del primo episodio WIP del job',
      bucket_convention: 'rolling_7_days_start_exclusive_end_inclusive',
      weekly: weekly
    },
    committed_weeks: committedWeeks,
    committed_weeks_quality: committedWeeks === null ? 'insufficient' : firstCycle.quality,
    committed_weeks_sample_size: firstCycle.sample_size
  };
}

// Calendario V2: giorni civili nel fuso applicativo, mai nel fuso del processo.
function dashboardV2WallClock_(instant) {
  return Utilities.formatDate(instant, SIGMAFLOW.TZ, "yyyy-MM-dd'T'HH:mm:ss");
}

function dashboardV2LocalInstant_(wall) {
  var target = Date.parse(wall + 'Z');
  var value = target;
  // Risolve l'offset del fuso anche quando il bucket attraversa il cambio DST.
  for (var i = 0; i < 4; i++) {
    var delta = target - Date.parse(dashboardV2WallClock_(new Date(value)) + 'Z');
    value += delta;
    if (!delta) { break; }
  }
  return new Date(value);
}

function dashboardV2Instant_(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(value)) {
    var wall = value.length === 10 ? value + 'T00:00:00' : value.length === 16 ? value + ':00' : value;
    return dashboardV2LocalInstant_(wall);
  }
  return new Date(value);
}

function dashboardV2CalendarWeeks_(now, count) {
  if (!isFinite(count) || count < 1 || Math.floor(count) !== count) { return []; }
  var civil = new Date(dashboardV2WallClock_(now).slice(0, 10) + 'T00:00:00Z');
  civil.setUTCDate(civil.getUTCDate() - ((civil.getUTCDay() + 6) % 7));
  var buckets = [];
  for (var i = count - 1; i >= 0; i--) {
    var startDay = new Date(civil.getTime() - i * 7 * 86400000);
    var endDay = new Date(startDay.getTime() + 7 * 86400000);
    var start = dashboardV2LocalInstant_(startDay.toISOString().slice(0, 19));
    var end = dashboardV2LocalInstant_(endDay.toISOString().slice(0, 19));
    var thursday = new Date(startDay.getTime() + 3 * 86400000);
    var isoYear = thursday.getUTCFullYear();
    var week = Math.ceil(((thursday - Date.UTC(isoYear, 0, 1)) / 86400000 + 1) / 7);
    buckets.push({
      period_start: start.toISOString(), period_end: end.toISOString(),
      observed_until: new Date(Math.min(end.getTime(), now.getTime())).toISOString(),
      is_partial: now < end, calendar_year: startDay.getUTCFullYear(),
      month: startDay.getUTCMonth() + 1, iso_week: week, iso_week_year: isoYear
    });
  }
  return buckets;
}

// Acquisizione una sola volta sullo storico completo; ritorni dalle attese
// distinti dalle riprese WIP (che iniziano soltanto all'apertura episodio >1).
// Nessuna ponderazione in punti degli avvii/riprese: la taglia e' del job.
function dashboardV2FlowEvents_(normalized, episodes, jobsById, visits, now) {
  var events = [];
  var excluded = [];
  function append(type, jobId, at, ref, points) {
    var instant = dashboardV2Instant_(at);
    if (isNaN(instant.getTime()) || instant > now) { return; }
    events.push({ type: type, job_id: jobId, at: instant.toISOString(), source_ref: ref, points: points });
  }
  normalized.forEach(function(item) {
    var acquired = false;
    var seenOperational = false;
    item.significant_events.forEach(function(event) {
      var activeRole = ['backlog', 'prep', 'wip'].indexOf(event.to_role) >= 0;
      // Uno storico che inizia in attesa/done e' gia' operativo: il rientro
      // non prova una nuova acquisizione. Non inventiamo una data antecedente.
      if (activeRole && !acquired && !seenOperational) {
        append('new_work', item.job_id, event.at, event.original_event_ref, jobPoints_(jobsById[item.job_id]));
        acquired = true;
      }
      if (activeRole && event.from_role === 'stand_by') {
        var closure = jobsById[item.job_id].incarico_chiuso_ts;
        if (closure && dashboardV2Instant_(closure) <= dashboardV2Instant_(event.at)) {
          excluded.push({ job_id: item.job_id, event_ref: event.original_event_ref, reason: 'return_after_recorded_closure' });
        } else {
          append('returns_after_wait', item.job_id, event.at, event.original_event_ref, null);
        }
      }
      if (event.to_role !== 'neutral') { seenOperational = true; }
    });
  });
  episodes.forEach(function(episode) {
    append('started_wip', episode.job_id, episode.opened_at, episode.opening_event_ref, null);
    append(episode.wip_episode_number === 1 ? 'first_wip' : 'rework_wip', episode.job_id,
      episode.opened_at, episode.opening_event_ref,
      episode.wip_episode_number === 1 ? jobPoints_(jobsById[episode.job_id]) : null);
  });
  visits.forEach(function(visit) {
    if (!visit.consegna_ts) { return; }
    if (!jobsById[visit.job_id] || isNaN(dashboardV2Instant_(visit.consegna_ts).getTime())) {
      excluded.push({ job_id: visit.job_id, visit_id: visit.visit_id || null, reason: 'unusable_technical_completion' });
      return;
    }
    append('technical_completion', visit.job_id, visit.consegna_ts,
      { visit_id: visit.visit_id || null, numero_visita: visit.numero_visita }, jobPoints_(jobsById[visit.job_id]));
  });
  events.sort(function(a, b) { return Date.parse(a.at) - Date.parse(b.at); });
  return { events: events, exclusions: excluded };
}

function dashboardV2FlowTotals_(events) {
  var totals = { new_work_jobs: 0, new_work_points: 0, returns_after_wait_events: 0,
    started_wip_episodes: 0, first_wip_episodes: 0, rework_wip_episodes: 0,
    new_work_absorbed_points: 0, completed_visits: 0, completed_points: 0 };
  events.forEach(function(event) {
    if (event.type === 'new_work') { totals.new_work_jobs++; totals.new_work_points += event.points; }
    if (event.type === 'returns_after_wait') { totals.returns_after_wait_events++; }
    if (event.type === 'started_wip') { totals.started_wip_episodes++; }
    if (event.type === 'first_wip') { totals.first_wip_episodes++; totals.new_work_absorbed_points += event.points; }
    if (event.type === 'rework_wip') { totals.rework_wip_episodes++; }
    if (event.type === 'technical_completion') { totals.completed_visits++; totals.completed_points += event.points; }
  });
  return totals;
}

function dashboardV2Flow_(normalized, episodes, jobs, visits, config, now) {
  var source = dashboardV2FlowEvents_(normalized, episodes, indexBy_(jobs, 'job_id'), visits, now);
  var buckets = dashboardV2CalendarWeeks_(now, Number(config.wip_trend_weeks));
  return {
    timezone: SIGMAFLOW.TZ, bucket_convention: 'ISO_week_start_inclusive_end_exclusive',
    metadata_anchor: 'period_start_local_date',
    resumption_definition: 'uscita da stand_by verso backlog/prep/wip; distinta dagli episodi WIP successivi',
    post_closure_classification_quality: 'limited_by_available_closure_history',
    episode_points_policy: 'unweighted_except_first_absorption',
    quality: buckets.length ? 'available' : 'invalid_configuration',
    exclusions: source.exclusions, events: source.events,
    weekly: buckets.map(function(bucket) {
      var start = Date.parse(bucket.period_start), end = Date.parse(bucket.period_end);
      return Object.assign({}, bucket, dashboardV2FlowTotals_(source.events.filter(function(event) {
        var at = Date.parse(event.at); return at >= start && at < end;
      })));
    })
  };
}

function dashboardV2StockKey_(role) {
  return role === 'wip' ? 'wip' : role === 'stand_by' ? 'waiting' :
    (role === 'backlog' || role === 'prep') ? 'future_work' : null;
}

// Stock puntuale e media pesata sulla durata osservata del bucket. La fine
// di una permanenza e' il prossimo ingresso, non consegna/chiusura cache.
function dashboardV2Stocks_(normalized, jobsById, start, sampledAt, observedUntil) {
  return dashboardV2StocksFromIndex_(dashboardV2StockIndex_(normalized, jobsById), start, sampledAt, observedUntil);
}

// Indicizza una sola volta gli istanti delle permanenze. In Apps Script la
// conversione dei timestamp civili Europe/Rome e' costosa: prima veniva
// ripetuta per ogni job dentro ogni settimana e ogni mese dello storico.
function dashboardV2StockIndex_(normalized, jobsOrIndex) {
  var jobsById = Array.isArray(jobsOrIndex) ? indexBy_(jobsOrIndex, 'job_id') : jobsOrIndex;
  var intervals = [];
  var firstEntryByJob = {};
  normalized.forEach(function(item) {
    var states = item.logical_states || [];
    var points = jobPoints_(jobsById[item.job_id] || {});
    states.forEach(function(state, index) {
      var entered = dashboardV2Instant_(state.entered_at).getTime();
      var exited = index + 1 < states.length
        ? dashboardV2Instant_(states[index + 1].entered_at).getTime() : Infinity;
      if (!isFinite(entered)) { return; }
      if (firstEntryByJob[item.job_id] === undefined || entered < firstEntryByJob[item.job_id]) {
        firstEntryByJob[item.job_id] = entered;
      }
      intervals.push({ job_id: item.job_id, role: state.role, points: points,
        entered: entered, exited: exited });
    });
  });
  return { intervals: intervals, first_entry_by_job: firstEntryByJob };
}

function dashboardV2StocksFromIndex_(stockIndex, start, sampledAt, observedUntil) {
  var result = { future_work_stock_jobs: 0, future_work_stock_points: 0,
    wip_stock_jobs: 0, wip_stock_points: 0, waiting_stock_jobs: 0, waiting_stock_points: 0,
    avg_wip_jobs: 0, avg_wip_points: 0 };
  var duration = observedUntil - start;
  (stockIndex.intervals || []).forEach(function(interval) {
    var key = dashboardV2StockKey_(interval.role);
    if (key && interval.entered <= sampledAt && sampledAt < interval.exited) {
      result[key + '_stock_jobs']++;
      result[key + '_stock_points'] += interval.points;
    }
    if (interval.role === 'wip' && duration > 0) {
      var weight = Math.max(0, Math.min(interval.exited, observedUntil) - Math.max(interval.entered, start)) / duration;
      result.avg_wip_jobs += weight;
      result.avg_wip_points += weight * interval.points;
    }
  });
  if (duration <= 0) { result.avg_wip_jobs = null; result.avg_wip_points = null; }
  return result;
}

function dashboardV2CFD_(normalized, jobs, flow, now, stockIndex) {
  var jobsById = indexBy_(jobs, 'job_id');
  stockIndex = stockIndex || dashboardV2StockIndex_(normalized, jobsById);
  var failed = [];
  var weekly = flow.weekly.map(function(bucket) {
    var start = Date.parse(bucket.period_start);
    var until = Date.parse(bucket.observed_until);
    // Bucket chiuso: fotografia immediatamente prima del bordo esclusivo.
    // Bucket corrente: fotografia inclusiva a generated_at.
    var sampledAt = bucket.is_partial ? now.getTime() : until - 1;
    var stocks = dashboardV2StocksFromIndex_(stockIndex, start, sampledAt, until);
    var totals = dashboardV2FlowTotals_(flow.events.filter(function(event) {
      return Date.parse(event.at) <= sampledAt;
    }));
    var row = Object.assign({}, bucket, stocks, { sampled_at: new Date(sampledAt).toISOString() });
    row.cumulative = {};
    Object.keys(totals).forEach(function(key) { row.cumulative['cum_' + key] = totals[key]; });
    row.boundaries = {};
    ['jobs', 'points'].forEach(function(unit) {
      // La base in conteggi e' una cumulata di consegne, non job unici.
      var completed = unit === 'jobs' ? totals.completed_visits : totals.completed_points;
      var boundaries = { completed_boundary: completed };
      boundaries.waiting_boundary = completed + stocks['waiting_stock_' + unit];
      boundaries.wip_boundary = boundaries.waiting_boundary + stocks['wip_stock_' + unit];
      boundaries.future_work_boundary = boundaries.wip_boundary + stocks['future_work_stock_' + unit];
      row.boundaries[unit] = boundaries;
      var residuals = [boundaries.waiting_boundary - completed - stocks['waiting_stock_' + unit],
        boundaries.wip_boundary - boundaries.waiting_boundary - stocks['wip_stock_' + unit],
        boundaries.future_work_boundary - boundaries.wip_boundary - stocks['future_work_stock_' + unit]];
      if (residuals.some(function(value) { return Math.abs(value) > 1e-9; })) {
        failed.push({ period_start: bucket.period_start, unit: unit, residuals: residuals });
      }
    });
    return row;
  });
  var current = dashboardV2StocksFromIndex_(stockIndex, now.getTime(), now.getTime(), now.getTime());
  var missing = normalized.filter(function(item) {
    return stockIndex.first_entry_by_job[item.job_id] === undefined || stockIndex.first_entry_by_job[item.job_id] > now.getTime();
  }).map(function(item) { return item.job_id; });
  return {
    timezone: SIGMAFLOW.TZ, stock_convention: 'end_exclusive_snapshot_or_generated_at',
    cumulative_scope: 'all_available_history',
    count_boundary_base: 'technical_completions_not_unique_jobs',
    history_quality: missing.length ? 'partial' : 'available_not_certified_complete',
    jobs_without_observed_state: missing, current: current, weekly: weekly,
    validation: { buckets_checked: weekly.length, identities_checked: weekly.length * 6,
      absolute_tolerance: 1e-9, passed: weekly.length ? failed.length === 0 : null, failures: failed }
  };
}

// V2.5: calendario completo indipendente dalla finestra operativa. La prima
// evidenza non certifica la completezza della raccolta negli anni precedenti.
function dashboardV2History_(normalized, jobs, flow, now, stockIndex) {
  var timestamps = flow.events.map(function(e) { return Date.parse(e.at); });
  var indexed = normalized.map(function(item) {
    return { job_id: item.job_id, logical_states: item.logical_states.map(function(state) {
      var at = dashboardV2Instant_(state.entered_at);
      if (at <= now) { timestamps.push(at.getTime()); }
      return Object.assign({}, state, { entered_at: at.toISOString() });
    }) };
  });
  var first = timestamps.length ? Math.min.apply(null, timestamps) : null;
  var result = { history_start: first === null ? null : new Date(first).toISOString(),
    available_years: [], fully_observed_calendar_years: [], comparable_years: [],
    comparison_quality: 'insufficient',
    comparison_message: 'Dati storici ancora insufficienti o completezza della raccolta non certificata.',
    coverage_definition: 'intervallo fra prima evidenza disponibile e generated_at; non prova assenza di lacune',
    empty_state_messages: {
      month: 'Dati non ancora disponibili per questo mese.',
      quarter: 'Dati non ancora disponibili per questo trimestre.'
    },
    monthly: [], quarterly: [], weekly: [], annual_cfd: [] };
  if (first === null) { return result; }
  var firstLocal = dashboardV2WallClock_(new Date(first)).slice(0, 10);
  var currentLocal = dashboardV2WallClock_(now).slice(0, 10);
  var firstYear = Number(firstLocal.slice(0, 4)), currentYear = Number(currentLocal.slice(0, 4));
  var count = Math.ceil((Date.parse(currentLocal + 'T00:00:00Z') - Date.parse(firstLocal + 'T00:00:00Z')) / (7 * 86400000)) + 1;
  var weeks = dashboardV2CalendarWeeks_(now, count).filter(function(b) { return Date.parse(b.period_end) > first; });
  var months = [];
  var cursor = new Date(firstLocal.slice(0, 7) + '-01T00:00:00Z');
  while (true) {
    var start = dashboardV2LocalInstant_(cursor.toISOString().slice(0, 19));
    if (start > now) { break; }
    var next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    var end = dashboardV2LocalInstant_(next.toISOString().slice(0, 19));
    var iso = dashboardV2CalendarWeeks_(start, 1)[0];
    months.push({ period_start: start.toISOString(), period_end: end.toISOString(),
      observed_until: new Date(Math.min(end.getTime(), now.getTime())).toISOString(),
      calendar_year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1,
      iso_week: iso.iso_week, iso_week_year: iso.iso_week_year, is_partial: now < end });
    cursor = next;
  }
  var quarters = [];
  var firstMonthIndex = Number(firstLocal.slice(5, 7)) - 1;
  var quarterCursor = new Date(Date.UTC(firstYear, Math.floor(firstMonthIndex / 3) * 3, 1));
  while (true) {
    var quarterStart = dashboardV2LocalInstant_(quarterCursor.toISOString().slice(0, 19));
    if (quarterStart > now) { break; }
    var quarterNext = new Date(Date.UTC(quarterCursor.getUTCFullYear(), quarterCursor.getUTCMonth() + 3, 1));
    var quarterEnd = dashboardV2LocalInstant_(quarterNext.toISOString().slice(0, 19));
    var quarterIso = dashboardV2CalendarWeeks_(quarterStart, 1)[0];
    quarters.push({ period_start: quarterStart.toISOString(), period_end: quarterEnd.toISOString(),
      observed_until: new Date(Math.min(quarterEnd.getTime(), now.getTime())).toISOString(),
      calendar_year: quarterCursor.getUTCFullYear(), quarter: Math.floor(quarterCursor.getUTCMonth() / 3) + 1,
      iso_week: quarterIso.iso_week, iso_week_year: quarterIso.iso_week_year, is_partial: now < quarterEnd });
    quarterCursor = quarterNext;
  }
  function series(buckets, emptyStateMessage) {
    var rows = dashboardV2CFD_(indexed, jobs, { events: flow.events, weekly: buckets }, now, stockIndex).weekly;
    return rows.map(function(row) {
      var start = Date.parse(row.period_start), end = Date.parse(row.period_end);
      var totals = dashboardV2FlowTotals_(flow.events.filter(function(e) { var at = Date.parse(e.at); return at >= start && at < end; }));
      var hasStock = ['future_work', 'wip', 'waiting'].some(function(key) {
        return Number(row[key + '_stock_jobs'] || 0) > 0 || Number(row[key + '_stock_points'] || 0) > 0;
      });
      var hasFlow = ['new_work_jobs', 'started_wip_episodes', 'rework_wip_episodes',
        'returns_after_wait_events', 'completed_visits'].some(function(key) { return Number(totals[key] || 0) > 0; });
      return Object.assign({}, row, totals, {
        temporal_coverage: start < first ? 'left_truncated' : row.is_partial ? 'in_progress' : 'full_calendar_bucket',
        comparable: false,
        has_data: hasStock || hasFlow,
        empty_state_message: hasStock || hasFlow ? null : emptyStateMessage,
        // Throughput nel bucket, non rate annualizzato su un periodo parziale.
        throughput_completed_visits: totals.completed_visits,
        throughput_completed_points: totals.completed_points
      });
    });
  }
  result.weekly = series(weeks, null);
  result.monthly = series(months, result.empty_state_messages.month);
  result.quarterly = series(quarters, result.empty_state_messages.quarter);
  for (var year = firstYear; year <= currentYear; year++) {
    result.available_years.push(year);
    var t0 = dashboardV2LocalInstant_(year + '-01-01T00:00:00');
    var t1 = dashboardV2LocalInstant_((year + 1) + '-01-01T00:00:00');
    if (first <= t0 && t1 <= now) { result.fully_observed_calendar_years.push(year); }
    if (t0 < first) {
      result.annual_cfd.push({ calendar_year: year, period_start: t0.toISOString(), quality: 'insufficient_start_coverage', offset: null, points: [] });
      continue;
    }
    var anchorBucket = { period_start: t0.toISOString(), period_end: t1.toISOString(), observed_until: t0.toISOString(), is_partial: true };
    var anchor = dashboardV2CFD_(indexed, jobs, { events: flow.events, weekly: [anchorBucket] }, t0, stockIndex).weekly[0];
    var offset = { jobs: anchor.boundaries.jobs.completed_boundary, points: anchor.boundaries.points.completed_boundary };
    var samples = [anchor].concat(result.monthly.filter(function(row) { return row.calendar_year === year; }));
    result.annual_cfd.push({ calendar_year: year, period_start: t0.toISOString(),
      quality: 'available_not_certified_complete', offset: offset, offset_convention: 'completed_boundary_at_start_inclusive',
      points: samples.map(function(row) {
        var rebased = {};
        ['jobs', 'points'].forEach(function(unit) {
          rebased[unit] = {};
          Object.keys(row.boundaries[unit]).forEach(function(key) { rebased[unit][key] = row.boundaries[unit][key] - offset[unit]; });
        });
        return { sampled_at: row.sampled_at, original_boundaries: row.boundaries, rebased_boundaries: rebased,
          future_work_stock_jobs: row.future_work_stock_jobs, future_work_stock_points: row.future_work_stock_points,
          wip_stock_jobs: row.wip_stock_jobs, wip_stock_points: row.wip_stock_points,
          waiting_stock_jobs: row.waiting_stock_jobs, waiting_stock_points: row.waiting_stock_points };
      }) });
  }
  return result;
}

// V2.6: solo contratto diagnostico, nessuna nuova regola di business.
// Le anomalie gia' rilevate restano in dataQuality: non duplicarle o
// trasformarle in correzioni/flag persistenti attraverso issues.
function dashboardV2DiagnosticContract_() {
  return {
    issues: [],
    diagnostics: {
      issue_detection: {
        status: 'structure_only',
        empty_list_means: 'nessun rilevatore issues attivato; non certifica assenza di problemi',
        supported_categories: ['long_wip', 'long_prep', 'long_external_wait',
          'abnormal_history', 'post_closure_reopening', 'missing_size', 'stale_status', 'excluded_job'],
        item_fields: ['type', 'severity', 'job_id', 'title', 'message', 'detected_at'],
        existing_history_anomalies_path: 'dataQuality.anomalies',
        persistence: 'none'
      },
      closure_history: {
        reconstruction_quality: 'not_reliably_reconstructible',
        count_available: false,
        reason: 'La chiusura puo essere scritta o cancellata senza evento storico; il valore corrente non conserva tutte le chiusure precedenti.',
        implementation_status: 'not_implemented_pending_human_review'
      },
      experimental_congestion: {
        official_model: 'plateau',
        comparison_status: 'not_implemented',
        affects_operational_metrics: false,
        message: 'Nessun decadimento della capacita applicato; confronto sperimentale non disponibile nel contratto V2.'
      }
    }
  };
}

// La taratura operativa proviene solo da CONFIG. Ogni campo quantitativo e'
// obbligatorio: nessuno storico o percentile puo' sostituirlo.
function dashboardV3Calibration_(config) {
  var minimum = dashboardV2OptionalNumber_(config.wip_target_min_jobs);
  var maximum = dashboardV2OptionalNumber_(config.wip_target_max_jobs);
  var referencePoints = dashboardV2OptionalNumber_(config.flow_reference_points_per_week);
  var referenceCompletions = dashboardV2OptionalNumber_(config.flow_reference_completions_per_week);
  var slowRatio = dashboardV2OptionalNumber_(config.flow_slow_ratio);
  var valid = minimum !== null && minimum >= 0 && maximum !== null && maximum >= minimum &&
    referencePoints !== null && referencePoints > 0 &&
    referenceCompletions !== null && referenceCompletions > 0 &&
    slowRatio !== null && slowRatio > 0 && slowRatio <= 1;
  return {
    valid: valid,
    wip_target_min_jobs: minimum,
    wip_target_max_jobs: maximum,
    reference_points_per_week: referencePoints,
    reference_completions_per_week: referenceCompletions,
    slow_ratio: slowRatio,
    calibration_date: config.calibration_date || '',
    calibration_version: config.calibration_version || '',
    calibration_note: config.calibration_note || ''
  };
}

// V3: una sola diagnosi operativa. Le condizioni sono esplicite e
// reciprocamente esclusive; l'ordine implementa la precedenza del design.
function dashboardV3FlowState_(currentWork, capacity, config) {
  var calibration = dashboardV3Calibration_(config);
  var minimum = calibration.wip_target_min_jobs;
  var maximum = calibration.wip_target_max_jobs;
  var lower = calibration.valid
    ? round_(calibration.reference_points_per_week * calibration.slow_ratio) : null;
  var recent = capacity.observed || {};
  var recentValue = recent.rolling_capacity_points_per_week;
  var recentReliable = recent.quality === 'sufficient' && recentValue !== null;
  var status = 'INSUFFICIENT_DATA';
  var message = 'Dati recenti insufficienti per valutare il ritmo del sistema.';

  if (!calibration.valid) {
    message = 'Taratura non configurata.';
  } else if (currentWork.wip_jobs > maximum) {
    status = 'HIGH_LOAD';
    message = 'Lavori attivi sopra la fascia configurata.';
  } else if (currentWork.wip_jobs < minimum) {
    status = 'UNDERFED';
    message = 'Il sistema ha poco lavoro attivo rispetto alla fascia configurata.';
  } else if (!recentReliable) {
    status = 'INSUFFICIENT_DATA';
  } else if (recentValue < lower) {
    status = 'SLOWING';
    message = 'Il lavoro attivo è sufficiente, ma i completamenti sono sotto il ritmo atteso.';
  } else {
    status = 'REGULAR';
    message = 'Ritmo coerente con il riferimento configurato.';
  }

  return {
    system_flow_status: status,
    system_flow_message: message,
    system_flow_quality: status === 'INSUFFICIENT_DATA' ? 'insufficient' : 'sufficient',
    calibration: calibration,
    recent_completion_throughput: {
      points_per_week: recentValue === undefined ? null : recentValue,
      visits_per_week: recent.rolling_capacity_visits_per_week === undefined ? null : recent.rolling_capacity_visits_per_week,
      quality: recent.quality || 'insufficient',
      sample_size: Number(recent.sample_size || 0),
      window_weeks: recent.window_weeks || null,
      window_start: recent.window_start || null,
      window_end: recent.window_end || null,
      timezone: recent.timezone || SIGMAFLOW.TZ,
      completed_points: recent.completed_points === undefined ? null : recent.completed_points,
      weeks_with_completions: Number(recent.weeks_with_completions || 0)
    },
    system_flow_detail: {
      wip_current: currentWork.wip_jobs,
      wip_target_min: minimum,
      wip_target_max: maximum,
      reference_points_per_week: calibration.reference_points_per_week,
      reference_completions_per_week: calibration.reference_completions_per_week,
      slowing_threshold_points_per_week: lower,
      slow_ratio: calibration.slow_ratio
    }
  };
}

function dashboardV3DaysSince_(value, now) {
  var instant = dashboardV2Instant_(value);
  if (!value || isNaN(instant.getTime()) || instant > now) { return null; }
  return round_((now.getTime() - instant.getTime()) / 86400000);
}

// V5 Fase 3 (§10): unita' di attraversamento ricostruite esclusivamente
// dalla sequenza normalizzata dei `to`. Il primo ingresso in backlog/prep/WIP
// apre l'unita'; stand-by, neutral e i successivi rientri non la azzerano;
// l'ingresso in done la chiude. Solo un nuovo ingresso operativo dopo done
// puo' aprire una seconda unita' per lo stesso job.
function dashboardV5Timing_(normalized, jobs) {
  var jobsById = indexBy_(jobs || [], 'job_id');
  var units = [];
  var exclusions = [];
  var operationalRoles = ['backlog', 'prep', 'wip'];

  (normalized || []).forEach(function(item) {
    var job = jobsById[item.job_id] || {};
    var openedAt = null;
    var openedRole = null;
    var sawWait = false;
    var returnedAfterWait = false;
    var unitNumber = 0;
    (item.logical_states || []).forEach(function(state) {
      var at = dashboardV2Instant_(state.entered_at);
      if (isNaN(at.getTime())) { return; }
      if (operationalRoles.indexOf(state.role) >= 0) {
        if (openedAt === null) {
          openedAt = at;
          openedRole = state.role;
          sawWait = false;
          returnedAfterWait = false;
        } else if (sawWait) {
          returnedAfterWait = true;
        }
        return;
      }
      if (state.role === 'stand_by' && openedAt !== null) {
        sawWait = true;
        return;
      }
      if (state.role !== 'done') { return; }
      if (openedAt === null) {
        exclusions.push({ job_id: item.job_id, consegna_ts: at.toISOString(), reason: 'missing_observed_entry' });
        return;
      }
      var days = (at.getTime() - openedAt.getTime()) / 86400000;
      if (!(days > 0)) {
        exclusions.push({ job_id: item.job_id, ingresso_ts: openedAt.toISOString(),
          consegna_ts: at.toISOString(), reason: 'non_positive_interval' });
      } else {
        unitNumber++;
        units.push({
          job_id: item.job_id,
          cliente: job.client || '',
          incarico: job.title || item.job_id,
          unita_attraversamento: unitNumber,
          taglia: ['XS', 'S', 'M', 'L', 'XL'].indexOf(job.size_class) >= 0 ? job.size_class : 'M',
          ingresso_ts: openedAt.toISOString(),
          ingresso_ruolo: openedRole,
          consegna_ts: at.toISOString(),
          lead_time_days: round_(days),
          rientro_intermedio: returnedAfterWait
        });
      }
      openedAt = null;
      openedRole = null;
      sawWait = false;
      returnedAfterWait = false;
    });
  });

  function median(values) {
    if (!values.length) { return null; }
    var middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  }
  function summarize(values) {
    var sorted = values.slice().sort(function(a, b) { return a - b; });
    return {
      median_days: sorted.length ? round_(median(sorted)) : null,
      p80_days: sorted.length ? round_(percentile_(sorted, 0.80)) : null,
      sample_size: sorted.length,
      quality: sorted.length >= 5 ? 'sufficient' : (sorted.length ? 'partial' : 'insufficient')
    };
  }

  var sizes = ['XS', 'S', 'M', 'L', 'XL'];
  var bySize = {};
  sizes.forEach(function(size) {
    bySize[size] = summarize(units.filter(function(unit) { return unit.taglia === size; })
      .map(function(unit) { return unit.lead_time_days; }));
  });
  var overall = summarize(units.map(function(unit) { return unit.lead_time_days; }));
  return {
    lead_time_median_days: overall.median_days,
    lead_time_p80_days: overall.p80_days,
    lead_time_sample_size: overall.sample_size,
    lead_time_quality: overall.quality,
    lead_time_by_size: bySize,
    // La stima M/G/1 legacy e' teorica e usa una popolazione diversa
    // (visite/tempi di servizio): non viene presentata come lead time reale.
    little_estimated_days: null,
    units: units,
    exclusions: exclusions
  };
}

function dashboardV3WaitLabel_(columnId) {
  var waitLabels = { wait_client: 'Cliente', wait_authority: 'Ente', wait_internal: 'Interna' };
  return waitLabels[columnId] || null;
}

function dashboardV3ReworkOrigin_(normalizedJob, episode) {
  var states = (normalizedJob || {}).logical_states || [];
  var openingRef = episode.opening_event_ref || {};
  var openingIndex = -1;
  for (var i = 0; i < states.length; i++) {
    if (states[i].role !== 'wip') { continue; }
    var sameEvent = (states[i].original_event_refs || []).some(function(ref) {
      if (openingRef.id && ref.id) { return openingRef.id === ref.id; }
      return openingRef.index !== undefined && ref.index === openingRef.index;
    });
    if (sameEvent || states[i].entered_at === episode.opened_at) {
      openingIndex = i;
      break;
    }
  }
  var immediateIndex = openingIndex - 1;
  var previousIndex = immediateIndex;
  // ToDo/preparazione e' spesso il passaggio tecnico obbligatorio prima del
  // WIP. Lo si salta soltanto se dietro esiste una vera provenienza diversa
  // dal WIP; nel percorso diretto WIP -> ToDo -> WIP resta invece la causa.
  while (previousIndex >= 0 && states[previousIndex].role === 'prep') {
    previousIndex--;
  }
  if (previousIndex >= 0 && states[previousIndex].role === 'wip') {
    previousIndex = immediateIndex;
  }
  var previous = previousIndex >= 0 ? states[previousIndex] : null;
  if (!previous) { return 'Altro'; }
  var waitLabel = dashboardV3WaitLabel_(previous.column_id);
  if (waitLabel) { return 'Attesa ' + waitLabel.toLowerCase(); }
  if (previous.role === 'backlog' || previous.role === 'prep') { return 'Backlog/preparazione'; }
  if (previous.role === 'done') { return 'Dopo consegna'; }
  return 'Altro';
}

function dashboardV3Details_(jobs, normalized, episodes, columnMap, now, capacity, recentRework) {
  var normalizedById = indexBy_(normalized, 'job_id');
  var openEpisodes = {};
  episodes.forEach(function(episode) {
    if (episode.closed_at === null) { openEpisodes[episode.job_id] = episode; }
  });
  var details = { wip: [], future_work: [], waiting: [], resumed: [], recent_completions: [] };
  jobs.forEach(function(job) {
    var column = columnMap[normalizeStatus_(job.status)] || { role: 'neutral', id: job.status };
    var normalizedJob = normalizedById[job.job_id] || { logical_states: [] };
    var lastState = normalizedJob.logical_states.length ? normalizedJob.logical_states[normalizedJob.logical_states.length - 1] : null;
    var stateMatchesCurrentRole = lastState && lastState.role === column.role;
    var since = stateMatchesCurrentRole ? lastState.entered_at : (job.status_since_ts || null);
    var common = { job_id: job.job_id, incarico: job.title || job.job_id, cliente: job.client || '', punti: jobPoints_(job) };
    if (column.role === 'wip') {
      var active = openEpisodes[job.job_id];
      details.wip.push(Object.assign({}, common, {
        ingresso_lavoro_attivo: active ? active.opened_at : since,
        durata_episodio_giorni: dashboardV3DaysSince_(active ? active.opened_at : since, now)
      }));
    } else if (column.role === 'backlog' || column.role === 'prep') {
      details.future_work.push(Object.assign({}, common, {
        fase: column.role === 'backlog' ? 'Da programmare' : 'Pronto da avviare',
        dal: since,
        anzianita_giorni: dashboardV3DaysSince_(since, now)
      }));
    } else if (column.role === 'stand_by') {
      var waitLabel = dashboardV3WaitLabel_(column.id) || dashboardV3WaitLabel_(normalizeStatus_(job.status));
      details.waiting.push(Object.assign({}, common, {
        tipo_attesa: waitLabel || 'Altra attesa',
        dal: since,
        durata_giorni: dashboardV3DaysSince_(since, now)
      }));
    }
  });
  var previousEpisodeExit = {};
  episodes.forEach(function(episode) {
    var job = jobs.filter(function(item) { return item.job_id === episode.job_id; })[0] || {};
    var openedAt = dashboardV2Instant_(episode.opened_at);
    var inRecentWindow = recentRework && recentRework.rework_window_start && recentRework.rework_window_end &&
      openedAt > dashboardV2Instant_(recentRework.rework_window_start) &&
      openedAt <= dashboardV2Instant_(recentRework.rework_window_end);
    if (episode.wip_episode_number > 1 && inRecentWindow) {
      details.resumed.push({
        job_id: episode.job_id,
        cliente: job.client || '',
        incarico: job.title || episode.job_id,
        numero_rientro: episode.wip_episode_number - 1,
        stato_provenienza: dashboardV3ReworkOrigin_(normalizedById[episode.job_id], episode),
        data_uscita_precedente: previousEpisodeExit[episode.job_id] || null,
        data_ripresa: episode.opened_at
      });
    }
    if (episode.closed_at) { previousEpisodeExit[episode.job_id] = episode.closed_at; }
  });
  details.wip.sort(function(a, b) { return Number(b.durata_episodio_giorni || 0) - Number(a.durata_episodio_giorni || 0); });
  details.future_work.sort(function(a, b) { return Number(b.anzianita_giorni || 0) - Number(a.anzianita_giorni || 0); });
  details.waiting.sort(function(a, b) { return Number(b.durata_giorni || 0) - Number(a.durata_giorni || 0); });
  details.resumed.sort(function(a, b) { return Date.parse(b.data_ripresa) - Date.parse(a.data_ripresa); });
  details.recent_completions = (((capacity || {}).observed || {}).completions || []).slice();
  return details;
}

// V4: riepilogo circoscritto ai controlli realmente implementati. Non
// trasforma issues=[] in una certificazione generale di qualita'.
function dashboardV4Diagnostics_(normalized, visits, jobs, cfd) {
  var jobIds = {};
  (jobs || []).forEach(function(job) { jobIds[job.job_id] = true; });
  var anomalies = (normalized || []).reduce(function(all, item) { return all.concat(item.anomalies || []); }, []);
  var latest = [];
  (normalized || []).forEach(function(item) {
    (item.significant_events || []).forEach(function(event) { if (event.at) { latest.push(Date.parse(event.at)); } });
  });
  (visits || []).forEach(function(visit) { if (visit.consegna_ts) { latest.push(Date.parse(visit.consegna_ts)); } });
  latest = latest.filter(function(value) { return isFinite(value); });
  var weekly = (cfd || {}).weekly || [];
  var last = weekly.length ? weekly[weekly.length - 1] : null;
  var failures = !last ? [] : (((cfd || {}).validation || {}).failures || []).filter(function(failure) {
    return failure.period_start === last.period_start;
  });
  var violated = failures.reduce(function(sum, failure) {
    return sum + (failure.residuals || []).filter(function(value) { return Math.abs(value) > 1e-9; }).length;
  }, 0);
  return {
    scope_note: 'Riepilogo dei controlli implementati; non certifica l’assenza di ogni possibile anomalia.',
    last_cfd_bucket: last ? {
      period_start: last.period_start,
      sampled_at: last.sampled_at,
      identities_checked: 6,
      identities_verified: 6 - violated,
      identities_violated: violated
    } : { period_start: null, sampled_at: null, identities_checked: 0, identities_verified: 0, identities_violated: 0 },
    jobs_without_observed_state: ((cfd || {}).jobs_without_observed_state || []).length,
    unparsable_logs: anomalies.filter(function(item) { return item.type === 'invalid_activity_log'; }).length,
    orphan_columns: Object.keys(anomalies.filter(function(item) { return item.type === 'unknown_target_column'; }).reduce(function(ids, item) {
      ids[item.column_id || '(senza id)'] = true;
      return ids;
    }, {})).length,
    visits_without_matching_job: (visits || []).filter(function(visit) { return !jobIds[visit.job_id]; }).length,
    latest_data_ts: latest.length ? new Date(Math.max.apply(null, latest)).toISOString() : null
  };
}

// Contratto V2 incrementale: serie ISO distinte dai bucket mobili capacita'.
function buildDashboardStateV2_(jobs, visits, config, now, archivedJobs, archivedVisits) {
  var columnMap = dashboardV2ColumnMap_(config);
  var currentWork = dashboardV2CurrentWork_(jobs, columnMap);
  var normalized = jobs.concat(archivedJobs || []).map(function(job) {
    return normalizeActivityLogForDashboard_(job, columnMap, now);
  });
  var episodes = dashboardV2WipEpisodes_(normalized, now);
  var capacity = dashboardV2Capacity_(jobs, archivedJobs || [], visits, archivedVisits || [], config, now, currentWork.future_work_points, episodes);
  var firstCount = episodes.filter(function(e) { return e.wip_episode_number === 1; }).length;
  var allJobs = jobs.concat(archivedJobs || []);
  var flow = dashboardV2Flow_(normalized, episodes, allJobs, visits.concat(archivedVisits || []), config, now);
  var stockIndex = dashboardV2StockIndex_(normalized, allJobs);
  var cfd = dashboardV2CFD_(normalized, allJobs, flow, now, stockIndex);
  var history = dashboardV2History_(normalized, allJobs, flow, now, stockIndex);
  var systemFlow = dashboardV3FlowState_(currentWork, capacity, config);
  var recentRework = dashboardV3RecentRework_(capacity);
  var details = dashboardV3Details_(allJobs, normalized, episodes, columnMap, now, capacity, recentRework);
  var timing = dashboardV5Timing_(normalized, allJobs);
  details.timing = ['XS', 'S', 'M', 'L', 'XL'].map(function(size) {
    var row = timing.lead_time_by_size[size];
    return { taglia: size, mediana_giorni: row.median_days, p80_giorni: row.p80_days,
      numero_casi: row.sample_size, qualita: row.quality };
  });
  var diagnostic = dashboardV2DiagnosticContract_();
  diagnostic.diagnostics.summary = dashboardV4Diagnostics_(normalized, visits.concat(archivedVisits || []), allJobs, cfd);
  diagnostic.diagnostics.timing = {
    interval_method: 'first_operational_entry_to_next_done; intermediate_returns_do_not_reset',
    median_method: 'average_of_middle_values',
    p80_method: 'nearest_rank',
    excluded_intervals: timing.exclusions,
    theoretical_reference: 'La stima M/G/1 legacy usa visite e tempi di servizio; non sostituisce il lead time osservato.'
  };
  // Cumulative eventi esposte separatamente dalle boundary CFD.
  flow.cumulative = cfd.weekly.map(function(row) {
    return Object.assign({ period_start: row.period_start, period_end: row.period_end,
      sampled_at: row.sampled_at }, row.cumulative);
  });
  flow.flow_status = systemFlow.system_flow_status;
  flow.flow_message = systemFlow.system_flow_message;
  return {
    contract_version: 'V5-timing',
    generated_at: now.toISOString(),
    currentWork: currentWork,
    futureWork: {
      future_work_jobs: currentWork.future_work_jobs,
      future_work_points: currentWork.future_work_points,
      backlog_jobs: currentWork.backlog_jobs,
      backlog_points: currentWork.backlog_points,
      prep_jobs: currentWork.prep_jobs,
      prep_points: currentWork.prep_points,
      committed_weeks: capacity.committed_weeks,
      committed_weeks_quality: capacity.committed_weeks_quality,
      committed_weeks_sample_size: capacity.committed_weeks_sample_size
    },
    capacity: capacity,
    flow: flow,
    cfd: cfd,
    history: history,
    timing: {
      lead_time_median_days: timing.lead_time_median_days,
      lead_time_p80_days: timing.lead_time_p80_days,
      lead_time_sample_size: timing.lead_time_sample_size,
      lead_time_quality: timing.lead_time_quality,
      lead_time_by_size: timing.lead_time_by_size,
      little_estimated_days: timing.little_estimated_days
    },
    rework: recentRework,
    systemFlow: systemFlow,
    details: details,
    issues: diagnostic.issues,
    diagnostics: diagnostic.diagnostics,
    wipEpisodes: {
      scope: 'all_available_history_until_generated_at',
      first_wip_episodes: firstCount,
      rework_wip_episodes: episodes.length - firstCount,
      total_wip_episodes: episodes.length,
      rework_episode_share: episodes.length ? (episodes.length - firstCount) / episodes.length : null,
      distinct_rework_jobs: Object.keys(episodes.filter(function(e) { return e.wip_episode_number > 1; }).reduce(function(ids, e) { ids[e.job_id] = true; return ids; }, {})).length,
      episodes: episodes
    },
    dataQuality: {
      normalized_jobs: normalized.length,
      jobs_without_significant_moves: normalized.filter(function(item) { return !item.significant_events.length; }).map(function(item) { return item.job_id; }),
      anomalies: normalized.reduce(function(all, item) {
        return all.concat(item.anomalies.map(function(anomaly) {
          var copy = dashboardV2CloneEvent_(anomaly);
          copy.job_id = item.job_id;
          return copy;
        }));
      }, [])
    }
  };
}

// Diagnostica read-only per il gate umano V2.2 sul database TEST.
function checkDashboardV2MetricsOnTest() {
  return withTestSpreadsheet_(function() {
    var config = readConfig_();
    var jobs = loadJobsWithVisitSummary_();
    var visits = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE));
    var archivedJobs = loadArchivedJobsWithVisitSummary_();
    var archivedVisits = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.VISITE_ARCHIVIO));
    var state = buildDashboardStateV2_(jobs, visits, config, new Date(), archivedJobs, archivedVisits);
    var result = {
      currentWork: state.currentWork,
      capacity: state.capacity,
      futureWork: state.futureWork,
      cfdValidation: state.cfd.validation,
      cfdCurrent: state.cfd.current,
      cfdSample: state.cfd.weekly.slice(-3),
      historySummary: { history_start: state.history.history_start,
        available_years: state.history.available_years, comparable_years: state.history.comparable_years,
        comparison_quality: state.history.comparison_quality,
        monthly_buckets: state.history.monthly.length, quarterly_buckets: state.history.quarterly.length,
        weekly_buckets: state.history.weekly.length },
      wipEpisodes: {
        scope: state.wipEpisodes.scope,
        first_wip_episodes: state.wipEpisodes.first_wip_episodes,
        rework_wip_episodes: state.wipEpisodes.rework_wip_episodes,
        total_wip_episodes: state.wipEpisodes.total_wip_episodes,
        rework_episode_share: state.wipEpisodes.rework_episode_share
      },
      dataQuality: state.dataQuality
    };
    // Visibile nel registro dell'editor anche con il normale Esegui.
    // Le serie complete restano nel contratto; il registro mostra il
    // riepilogo per evitare il troncamento dei risultati nell'editor.
    Logger.log(JSON.stringify(result, function(key, value) {
      return key === 'weekly' ? undefined : value;
    }, 2));
    return result;
  });
}
