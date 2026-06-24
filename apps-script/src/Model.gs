function getMetrics() {
  var config = readConfig_();
  var jobs = readTable_(getSpreadsheet_().getSheetByName(SIGMAFLOW.SHEETS.JOBS));
  return ok_(calculateMetrics_(jobs, config, new Date()));
}

function calculateMetrics_(jobs, config, now) {
  var windowDays = Number(config.observation_window_days || 30);
  var since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  var observed = jobs.filter(function(job) {
    return job.arrival_ts && new Date(job.arrival_ts) >= since;
  });
  var completed = observed.filter(function(job) {
    return isDoneStatus_(job.status) && numberJobField_(job, 'service_time_d', ['service_time_h']) > 0;
  });

  var serviceTimes = completed.map(function(job) {
    return numberJobField_(job, 'service_time_d', ['service_time_h']);
  });

  var lambda = observed.length / windowDays;
  var stats = sampleStats_(serviceTimes);
  var teamSize = Number(config.team_size || 1);
  var mu = stats.mean > 0 ? 1 / stats.mean : 0;
  var rho = mu > 0 ? lambda / (teamSize * mu) : 0;

  var mm1 = queueMM1_(lambda, mu, rho, stats.mean);
  var mg1 = queueMG1_(lambda, rho, stats.mean, stats.secondMoment);
  var rework = reworkMetrics_(completed, lambda, teamSize, mu, stats.secondMoment);
  var stability = stabilityMetrics_(rho, rework.rho_effective, stats.cs2);

  var result = {
    window_days: windowDays,
    n_jobs_observed: observed.length,
    lambda: round_(lambda),
    mu: round_(mu),
    rho: round_(rho),
    E_S: round_(stats.mean),
    E_S2: round_(stats.secondMoment),
    Var_S: round_(stats.variance),
    Cs2: round_(stats.cs2),
    MM1: mm1,
    MG1: mg1,
    rework: rework,
    stability: stability,
    distributions: {
      size_counts: countBy_(observed, 'size_class'),
      lead_time_by_size: leadTimeBySize_(completed)
    }
  };
  result.systemState = buildSystemState_(jobs, config, now);
  return result;
}

function buildSystemState_(jobs, config, now) {
  var windowDays = Math.max(1, Number(config.observation_window_days || 30));
  var teamSize = Math.max(1, Number(config.team_size || 1));
  var since = new Date(now.getTime() - windowDays * 864e5);
  var columns = columnsFromConfig_(config);
  var columnMap = {};
  columns.forEach(function(column) {
    columnMap[column.id] = column;
  });

  var observed = jobs.filter(function(job) {
    return job.arrival_ts && new Date(job.arrival_ts) >= since;
  });
  var completed = jobs.filter(function(job) {
    return job.done_ts && new Date(job.done_ts) >= since;
  });
  var completedSamples = completed.filter(function(job) {
    return numberJobField_(job, 'service_time_d', ['service_time_h']) > 0;
  });
  var initiatives = initiativeGroups_(observed);
  var completedInitiatives = initiativeGroups_(completed);
  var initiativeList = Object.keys(initiatives).map(function(key) { return initiatives[key]; });
  var completedList = Object.keys(completedInitiatives).map(function(key) { return completedInitiatives[key]; });
  var reworked = initiativeList.filter(function(item) { return item.reentries > 0; });
  var serviceTimes = completedSamples.map(function(job) {
    return numberJobField_(job, 'service_time_d', ['service_time_h']);
  });
  var stats = sampleStats_(serviceTimes);
  var enoughCompleted = completedSamples.length >= 5 && stats.mean > 0;

  var newRate = initiativeList.length / windowDays;
  var completedRate = completedList.length / windowDays;
  var reworkShare = initiativeList.length ? reworked.length / initiativeList.length : null;
  var conditionalReentries = reworked.length ? reworked.reduce(function(sum, item) {
    return sum + item.reentries;
  }, 0) / reworked.length : null;
  var averagePassages = reworkShare === null ? null : 1 + reworkShare * (conditionalReentries || 0);
  var totalPassageRate = averagePassages === null ? null : newRate * averagePassages;
  var reworkPassageRate = totalPassageRate === null ? null : Math.max(0, totalPassageRate - newRate);
  var effectiveCapacity = enoughCompleted ? teamSize / stats.mean : null;
  var theoreticalCapacity = positiveOrNull_(config.theoretical_capacity_per_day);
  var effectiveLoad = effectiveCapacity && totalPassageRate !== null ? totalPassageRate / effectiveCapacity : null;
  var residualCapacity = effectiveCapacity === null || totalPassageRate === null ? null : effectiveCapacity - totalPassageRate;
  var availableShare = effectiveLoad === null ? null : 1 - effectiveLoad;
  var dataQuality = dataQuality_(initiativeList.length, completedSamples.length);
  var systemStatus = systemStatus_(effectiveLoad, dataQuality);
  var variability = variabilityInterpretation_(enoughCompleted ? stats.cs2 : null);
  var prudentTime = enoughCompleted ? stats.mean + Math.sqrt(stats.variance) : null;
  var highObserved = enoughCompleted && serviceTimes.length ? Math.max.apply(null, serviceTimes) : null;
  var mg1 = enoughCompleted && effectiveLoad < 1
    ? queueMG1_(totalPassageRate, effectiveLoad, stats.mean, stats.secondMoment)
    : unstableQueue_();
  var workload = currentWorkload_(jobs, columnMap);
  var points = pointsStatistics_(jobs, columnMap, since, now);

  return {
    dataQuality: dataQuality,
    systemStatus: systemStatus,
    flowMetrics: {
      window_days: windowDays,
      new_initiatives_observed: initiativeList.length,
      new_initiatives_per_day: round_(newRate),
      completed_initiatives: completedList.length,
      completed_per_day: completedList.length ? round_(completedRate) : null,
      estimated_capacity_per_day: effectiveCapacity === null ? null : round_(effectiveCapacity),
      entry_exit_difference: completedList.length ? round_(newRate - completedRate) : null
    },
    reworkMetrics: {
      initiatives_with_rework: reworkShare === null ? null : round_(reworkShare),
      average_reentries_when_reworked: conditionalReentries === null ? null : round_(conditionalReentries),
      average_passages_per_initiative: averagePassages === null ? null : round_(averagePassages),
      total_passages_per_day: totalPassageRate === null ? null : round_(totalPassageRate),
      additional_passages_from_rework: reworkPassageRate === null ? null : round_(reworkPassageRate)
    },
    workloadMetrics: workload,
    timeMetrics: {
      completed_samples: completedSamples.length,
      average_service_days: enoughCompleted ? round_(stats.mean) : null,
      variability: enoughCompleted ? round_(stats.cs2) : null,
      variability_level: variability.level,
      variability_message: variability.message,
      high_observed_days: highObserved === null ? null : round_(highObserved),
      prudent_service_days: prudentTime === null ? null : round_(prudentTime),
      estimated_wait_days: mg1.Wq,
      estimated_total_days: mg1.W,
      waiting_message: waitingMessage_(effectiveLoad)
    },
    capacityMetrics: {
      theoretical_per_day: theoreticalCapacity,
      effective_per_day: effectiveCapacity === null ? null : round_(effectiveCapacity),
      absorbed_by_new_work: round_(newRate),
      absorbed_by_rework: reworkPassageRate === null ? null : round_(reworkPassageRate),
      effective_load: effectiveLoad === null ? null : round_(effectiveLoad),
      residual_per_day: residualCapacity === null ? null : round_(residualCapacity),
      available_share: availableShare === null ? null : round_(availableShare),
      safety_margin: availableShare === null ? null : round_(availableShare)
    },
    pointsMetrics: points,
    scenarioReadiness: {
      active: false,
      message: 'La simulazione non e ancora attiva. La struttura e pronta per confrontare scenari futuri.',
      scenarios: scenariosFromConfig_(config)
    },
    descriptions: metricDescriptions_()
  };
}

function pointsStatistics_(jobs, columnMap, since, now) {
  var openJobs = jobs.filter(function(job) {
    var column = columnMap[normalizeStatus_(job.status)] || { role: 'neutral' };
    return column.role !== 'done';
  });
  var completed = jobs.filter(function(job) {
    return job.done_ts && new Date(job.done_ts) >= since;
  });
  var added = jobs.filter(function(job) {
    return job.arrival_ts && new Date(job.arrival_ts) >= since;
  });
  var months = monthBuckets_(jobs, now, 6);

  return {
    open_points: sumJobPoints_(openJobs),
    completed_points: sumJobPoints_(completed),
    added_points: sumJobPoints_(added),
    open_cards: openJobs.length,
    timeline: months,
    by_size: pointsBreakdown_(openJobs, 'size_class'),
    by_column: pointsByColumn_(jobs, columnMap),
    by_assignee: pointsBreakdown_(openJobs, 'assignee')
  };
}

function monthBuckets_(jobs, now, count) {
  var first = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
  var buckets = [];
  var byKey = {};
  for (var i = 0; i < count; i++) {
    var date = new Date(first.getFullYear(), first.getMonth() + i, 1);
    var key = Utilities.formatDate(date, SIGMAFLOW.TZ, 'yyyy-MM');
    var bucket = { key: key, label: Utilities.formatDate(date, SIGMAFLOW.TZ, 'MM/yyyy'), entered_points: 0, completed_points: 0, entered_cards: 0, completed_cards: 0, open_points: 0, net_points: 0 };
    buckets.push(bucket);
    byKey[key] = bucket;
  }

  var running = jobs.reduce(function(sum, job) {
    var arrived = job.arrival_ts ? new Date(job.arrival_ts) : null;
    var done = job.done_ts ? new Date(job.done_ts) : null;
    return sum + (arrived && arrived < first && (!done || done >= first) ? jobPoints_(job) : 0);
  }, 0);

  jobs.forEach(function(job) {
    var points = jobPoints_(job);
    var arrivalKey = job.arrival_ts ? Utilities.formatDate(new Date(job.arrival_ts), SIGMAFLOW.TZ, 'yyyy-MM') : '';
    var doneKey = job.done_ts ? Utilities.formatDate(new Date(job.done_ts), SIGMAFLOW.TZ, 'yyyy-MM') : '';
    if (byKey[arrivalKey]) {
      byKey[arrivalKey].entered_points += points;
      byKey[arrivalKey].entered_cards++;
    }
    if (byKey[doneKey]) {
      byKey[doneKey].completed_points += points;
      byKey[doneKey].completed_cards++;
    }
  });

  buckets.forEach(function(bucket) {
    bucket.net_points = bucket.entered_points - bucket.completed_points;
    running += bucket.net_points;
    bucket.open_points = Math.max(0, running);
  });
  return buckets;
}

function pointsBreakdown_(jobs, field) {
  var result = {};
  jobs.forEach(function(job) {
    var key = String(job[field] || 'Non assegnato');
    if (!result[key]) { result[key] = { cards: 0, points: 0 }; }
    result[key].cards++;
    result[key].points += jobPoints_(job);
  });
  return result;
}

function pointsByColumn_(jobs, columnMap) {
  var result = {};
  jobs.forEach(function(job) {
    var status = normalizeStatus_(job.status);
    var column = columnMap[status] || { label: status };
    if (!result[status]) { result[status] = { label: column.label || status, cards: 0, points: 0 }; }
    result[status].cards++;
    result[status].points += jobPoints_(job);
  });
  return result;
}

function sumJobPoints_(jobs) {
  return jobs.reduce(function(sum, job) { return sum + jobPoints_(job); }, 0);
}

function jobPoints_(job) {
  var stored = Number(job.size_points);
  if (stored > 0) { return stored; }
  return SIGMAFLOW.SIZE_POINTS[job.size_class || 'M'] || SIGMAFLOW.SIZE_POINTS.M;
}

function initiativeGroups_(jobs) {
  return jobs.reduce(function(groups, job) {
    var key = job.case_id || job.job_id;
    if (!groups[key]) {
      groups[key] = { id: key, reentries: 0 };
    }
    groups[key].reentries = Math.max(groups[key].reentries, Math.max(0, Number(job.visit_number || 1) - 1));
    return groups;
  }, {});
}

function columnsFromConfig_(config) {
  if (config.columns_json) {
    try {
      var parsed = JSON.parse(config.columns_json);
      if (parsed && parsed.length) {
        return parsed;
      }
    } catch (err) {
      // Usa la configurazione standard se il JSON non e valido.
    }
  }
  return SIGMAFLOW.DEFAULT_COLUMNS;
}

function currentWorkload_(jobs, columnMap) {
  var result = {
    ready: 0,
    in_progress: 0,
    can_return: 0,
    blocked: 0,
    waiting_client: 0,
    waiting_authority: 0,
    waiting_internal: 0
  };
  jobs.forEach(function(job) {
    var column = columnMap[normalizeStatus_(job.status)] || { role: 'neutral' };
    if (column.role === 'backlog') { result.ready++; }
    if (column.role === 'wip') { result.in_progress++; }
    if (column.role === 'stand_by') { result.blocked++; }
    if (column.role === 'done' && !coerceBoolean_(job.invoiced)) { result.can_return++; }
    if (job.status === 'wait_client') { result.waiting_client++; }
    if (job.status === 'wait_authority') { result.waiting_authority++; }
    if (job.status === 'wait_internal') { result.waiting_internal++; }
  });
  return result;
}

function dataQuality_(observedCount, completedCount) {
  var level = observedCount < 10 ? 'low' : (observedCount <= 30 ? 'medium' : 'good');
  var labels = { low: 'BASSA', medium: 'MEDIA', good: 'BUONA' };
  var messages = {
    low: 'I dati sono ancora troppo pochi per leggere bene il sistema.',
    medium: 'La lettura e utile, ma ancora sensibile a pochi casi anomali.',
    good: 'La lettura e piu rappresentativa del funzionamento recente.'
  };
  if (completedCount < 5) {
    messages[level] += ' Servono almeno 5 lavori completati per stimare tempi e capacita.';
  }
  return {
    level: level,
    label: labels[level],
    message: messages[level],
    observed_initiatives: observedCount,
    completed_samples: completedCount,
    capacity_estimable: completedCount >= 5
  };
}

function systemStatus_(load, dataQuality) {
  if (load === null) {
    return {
      code: 'unknown',
      label: 'DATI INSUFFICIENTI',
      message: 'Il sistema non mostra una misura affidabile del carico: servono piu lavori completati.'
    };
  }
  if (load < 0.70) {
    return { code: 'stable', label: 'STABILE', message: 'Il sistema ha margine operativo.' };
  }
  if (load < 0.85) {
    return { code: 'attention', label: 'ATTENZIONE', message: 'Il sistema regge, ma il margine si sta riducendo.' };
  }
  if (load <= 1) {
    return { code: 'stressed', label: 'SOTTO PRESSIONE', message: 'Il sistema e vicino alla saturazione. Rientri e tempi variabili possono aumentare rapidamente le attese.' };
  }
  return { code: 'critical', label: 'CRITICO', message: 'Il carico supera la capacita disponibile. Il lavoro tendera ad accumularsi.' };
}

function variabilityInterpretation_(value) {
  if (value === null) {
    return { level: null, message: 'Dato non ancora stimabile.' };
  }
  if (value < 0.5) {
    return { level: 'BASSA', message: 'I tempi sono abbastanza regolari.' };
  }
  if (value < 1) {
    return { level: 'MEDIA', message: 'I tempi cambiano in modo sensibile tra un lavoro e l altro.' };
  }
  return { level: 'ALTA', message: 'Pochi lavori lunghi possono bloccare molta capacita.' };
}

function waitingMessage_(load) {
  if (load === null) { return 'Dato non ancora stimabile.'; }
  if (load < 0.70) { return 'Attesa tendenzialmente bassa.'; }
  if (load < 0.85) { return 'Attesa in aumento.'; }
  if (load <= 1) { return 'Attesa sensibile: il sistema e quasi pieno.'; }
  return 'Accumulo probabile: il carico supera la capacita.';
}

function scenariosFromConfig_(config) {
  if (config.scenarios_json) {
    try {
      return JSON.parse(config.scenarios_json);
    } catch (err) {
      // Usa gli scenari standard se il JSON non e valido.
    }
  }
  return SIGMAFLOW.SCENARIOS;
}

function positiveOrNull_(value) {
  var number = Number(value);
  return number > 0 ? round_(number) : null;
}

function metricDescriptions_() {
  return {
    new_initiatives_per_day: 'Numero medio di nuove iniziative entrate ogni giorno.',
    total_passages_per_day: 'Passaggi di lavoro richiesti ogni giorno, compresi i rientri.',
    effective_load: 'Quota della capacita effettiva richiesta dal lavoro osservato.',
    ready: 'Lavori visibili e pronti, non ancora avviati.',
    in_progress: 'Lavori attualmente aperti e gestiti dal team.',
    can_return: 'Lavori conclusi ma non ancora fatturati, ancora esposti a richieste successive.',
    prudent_service_days: 'Tempo medio aumentato della variabilita osservata, usato come riferimento prudenziale.'
  };
}

function sampleStats_(values) {
  if (!values.length) {
    return { mean: 0, secondMoment: 0, variance: 0, cs2: 0 };
  }

  var mean = values.reduce(function(sum, value) {
    return sum + value;
  }, 0) / values.length;

  var secondMoment = values.reduce(function(sum, value) {
    return sum + value * value;
  }, 0) / values.length;

  var variance = Math.max(0, secondMoment - mean * mean);
  var cs2 = mean > 0 ? variance / (mean * mean) : 0;

  return { mean: mean, secondMoment: secondMoment, variance: variance, cs2: cs2 };
}

function queueMM1_(lambda, mu, rho, meanServiceDays) {
  if (mu <= 0 || rho >= 1) {
    return unstableQueue_();
  }

  var wq = rho / (mu * (1 - rho));
  var w = wq + meanServiceDays;
  return {
    Wq: round_(wq),
    W: round_(w),
    Lq: round_(lambda * wq),
    L: round_(lambda * w)
  };
}

function queueMG1_(lambda, rho, meanServiceDays, secondMoment) {
  if (rho >= 1) {
    return unstableQueue_();
  }

  var wq = lambda * secondMoment / (2 * (1 - rho));
  var w = wq + meanServiceDays;
  return {
    Wq: round_(wq),
    W: round_(w),
    Lq: round_(lambda * wq),
    L: round_(lambda * w)
  };
}

function reworkMetrics_(completed, lambda, teamSize, mu, secondMoment) {
  var reworked = completed.filter(function(job) {
    return coerceBoolean_(job.is_rework) || Number(job.visit_number) > 1;
  });

  var p1 = completed.length ? reworked.length / completed.length : 0;
  var r = reworked.length ? reworked.reduce(function(sum, job) {
    return sum + Math.max(0, Number(job.visit_number || 1) - 1);
  }, 0) / reworked.length : 0;
  var expectedVisits = 1 + p1 * r;
  var lambdaEffective = lambda * expectedVisits;
  var rhoEffective = mu > 0 ? lambdaEffective / (teamSize * mu) : 0;
  var wq = rhoEffective >= 1 ? null : lambdaEffective * secondMoment / (2 * (1 - rhoEffective));

  return {
    p1: round_(p1),
    r: round_(r),
    E_K: round_(expectedVisits),
    lambda_effective: round_(lambdaEffective),
    rho_effective: round_(rhoEffective),
    Wq: wq === null ? null : round_(wq)
  };
}

function stabilityMetrics_(rho, rhoEffective, cs2) {
  var state = 'stable';
  if (rhoEffective >= 1) {
    state = 'unstable';
  } else if (rhoEffective >= 0.85) {
    state = 'critical';
  } else if (rhoEffective >= 0.70) {
    state = 'stressed';
  }

  return {
    margin: round_(1 - rhoEffective),
    congestion_factor: rho >= 1 ? null : round_(rho / (1 - rho)),
    variability_factor: round_((1 + cs2) / 2),
    system_state: state
  };
}

function leadTimeBySize_(jobs) {
  var groups = {};
  ['XS', 'S', 'M', 'L', 'XL'].forEach(function(size) {
    groups[size] = [];
  });

  jobs.forEach(function(job) {
    var size = job.size_class || 'M';
    if (!groups[size]) {
      groups[size] = [];
    }
    var leadTimeDays = numberJobField_(job, 'lead_time_d', ['lead_time_h']);
    if (leadTimeDays > 0) {
      groups[size].push(leadTimeDays);
    }
  });

  var result = {};
  Object.keys(groups).forEach(function(size) {
    var stats = sampleStats_(groups[size]);
    result[size] = {
      count: groups[size].length,
      mean: round_(stats.mean),
      stddev: round_(Math.sqrt(stats.variance))
    };
  });
  return result;
}

function countBy_(rows, field) {
  return rows.reduce(function(acc, row) {
    var key = row[field] || 'vuoto';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function numberJobField_(job, primary, aliases) {
  if (job[primary] !== undefined && job[primary] !== '') {
    return Number(job[primary]) || 0;
  }

  aliases = aliases || [];
  for (var i = 0; i < aliases.length; i++) {
    if (job[aliases[i]] !== undefined && job[aliases[i]] !== '') {
      if (aliases[i].slice(-2) === '_h' && primary.slice(-2) === '_d') {
        return (Number(job[aliases[i]]) || 0) / 24;
      }
      return Number(job[aliases[i]]) || 0;
    }
  }

  return 0;
}

function unstableQueue_() {
  return { Wq: null, W: null, Lq: null, L: null };
}

function round_(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}
