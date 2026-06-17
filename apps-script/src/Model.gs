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
    return normalizeStatus_(job.status) === 'done' && numberJobField_(job, 'service_time_d', ['service_time_h']) > 0;
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

  return {
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
    return sum + Number(job.visit_number || 1);
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
