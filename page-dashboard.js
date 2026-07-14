DB.seedIfNeeded();
const user = Utils.requireAuth();

if (user) {
  Utils.renderNav('dashboard');

  document.getElementById('date-label').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  document.getElementById('welcome-heading').textContent = `Welcome back, ${user.name.split(' ')[0]}`;

  const records = DB.getRecordsForUser(user.id);
  const today = new Date().toISOString().slice(0, 10);
  const todaysRecord = records.find(r => r.date === today);

  document.getElementById('welcome-sub').textContent = todaysRecord
    ? "You've already checked in today. Nice work staying consistent."
    : "You haven't checked in yet today — it only takes two minutes.";

  // ---------- Stat cards ----------
  const highRiskCount = records.filter(r => r.prediction?.risk === 'High').length;
  const last7 = records.filter(r => new Date(r.date) >= new Date(Date.now() - 7 * 86400000));
  const statCards = [
    { label: 'Total check-ins', value: records.length, cls: '' },
    { label: 'Check-ins (7 days)', value: last7.length, cls: '' },
    { label: 'High-risk reports', value: highRiskCount, cls: highRiskCount > 0 ? 'coral' : 'green' },
    { label: 'Latest risk level', value: todaysRecord?.prediction?.risk || (records[0]?.prediction?.risk ?? '—'), cls: '' },
  ];
  document.getElementById('stat-cards').innerHTML = statCards
    .map(
      s => `<div class="card stat-card ${s.cls ? 'stat-card--' + s.cls : ''}">
        <div class="stat-card__label">${s.label}</div>
        <div class="stat-card__value">${s.value}</div>
      </div>`
    )
    .join('');

  // ---------- Recent submissions table ----------
  const tbody = document.getElementById('recent-tbody');
  const recent = records.slice(0, 6);
  if (recent.length === 0) {
    document.getElementById('recent-empty').style.display = 'block';
    document.getElementById('recent-table').style.display = 'none';
  } else {
    tbody.innerHTML = recent
      .map(
        r => `<tr>
          <td>${Utils.formatDate(r.date)}</td>
          <td>${(r.symptoms || []).length ? r.symptoms.map(Prediction.labelFor).join(', ') : '—'}</td>
          <td class="mono">${r.temperature?.toFixed(1)}°C</td>
          <td class="mono">${r.spo2}%</td>
          <td><span class="${Utils.riskBadgeClass(r.prediction?.risk)}">${r.prediction?.risk}</span></td>
        </tr>`
      )
      .join('');
  }

  // ---------- Risk panel ----------
  const riskPanel = document.getElementById('risk-panel');
  const latest = records[0];
  if (!latest) {
    riskPanel.innerHTML = `<div class="empty-state" style="padding:24px 0;">
      <div class="empty-state__icon">✨</div>
      <p>No risk data yet. Complete a daily check-in to get your AI-generated risk assessment.</p>
    </div>`;
  } else {
    riskPanel.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <span class="${Utils.riskBadgeClass(latest.prediction.risk)}" style="font-size:0.9rem; padding:8px 16px;">${latest.prediction.risk} Risk</span>
        <span style="color:var(--ink-muted); font-size:0.82rem;">as of ${Utils.formatDate(latest.date)}</span>
      </div>
      <p style="font-size:0.9rem;">${latest.prediction.recommendation}</p>
      <p style="font-size:0.9rem;"><strong style="color:var(--teal-900);">Suggested action:</strong> ${latest.prediction.action}</p>
    `;
  }

  // ---------- Community alerts relevant to this user ----------
  const alerts = Outbreak.detectAndStore();
  const myLocations = new Set(records.map(r => r.location).filter(Boolean));
  const relevant = alerts.filter(a => myLocations.has(a.location));
  const alertSlot = document.getElementById('alert-slot');
  if (relevant.length > 0) {
    alertSlot.innerHTML = relevant
      .map(
        a => `<div class="alert-banner ${a.level === 'Watch' ? 'alert-banner--watch' : a.level === 'Warning' ? 'alert-banner--warning' : ''}">
          <span class="${Utils.alertLevelClass(a.level)}">${a.level}</span>
          <div>
            <div class="alert-banner__title">Community health alert — ${a.location}</div>
            <p class="alert-banner__body">${a.message}</p>
          </div>
        </div>`
      )
      .join('');
  }
}
