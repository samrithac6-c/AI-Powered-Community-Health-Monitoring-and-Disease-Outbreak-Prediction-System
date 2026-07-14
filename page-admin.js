DB.seedIfNeeded();
const admin = Utils.requireAdmin();

if (admin) {
  Utils.renderNav('admin');

  const COLORS = {
    teal: '#12746F',
    tealDark: '#0E4B4A',
    coral: '#E4572E',
    amber: '#C97A03',
    green: '#1E8E5A',
    grid: '#DCE8E6',
  };

  const users = DB.getUsers();
  const records = DB.getRecords();
  const alerts = Outbreak.detectAndStore();

  // ---------- Stat cards ----------
  const today = new Date().toISOString().slice(0, 10);
  const dailyReports = records.filter(r => r.date === today).length;
  const highRiskUsers = new Set(
    records.filter(r => r.prediction?.risk === 'High').map(r => r.userId)
  ).size;
  const activeAlerts = alerts.length;

  const stats = [
    { label: 'Total users', value: users.length },
    { label: "Today's reports", value: dailyReports },
    { label: 'High-risk users', value: highRiskUsers, cls: highRiskUsers ? 'coral' : 'green' },
    { label: 'Active alerts', value: activeAlerts, cls: activeAlerts ? 'amber' : 'green' },
  ];
  document.getElementById('admin-stats').innerHTML = stats
    .map(
      s => `<div class="card stat-card ${s.cls ? 'stat-card--' + s.cls : ''}">
        <div class="stat-card__label">${s.label}</div>
        <div class="stat-card__value">${s.value}</div>
      </div>`
    )
    .join('');

  // ---------- Alert banners (critical only, at top) ----------
  const critical = alerts.filter(a => a.level === 'Critical' || a.level === 'Warning');
  document.getElementById('alerts-slot').innerHTML = critical
    .map(
      a => `<div class="alert-banner ${a.level === 'Warning' ? 'alert-banner--warning' : ''}">
        <span class="${Utils.alertLevelClass(a.level)}">${a.level}</span>
        <div>
          <div class="alert-banner__title">${a.location} — ${a.clusterLabel}</div>
          <p class="alert-banner__body">${a.message}</p>
        </div>
      </div>`
    )
    .join('');

  // ---------- Alerts table ----------
  const alertsTbody = document.getElementById('alerts-tbody');
  if (alerts.length === 0) {
    document.getElementById('alerts-empty').style.display = 'block';
  } else {
    alertsTbody.innerHTML = alerts
      .map(
        a => `<tr>
          <td>${a.location}</td>
          <td>${a.clusterLabel}</td>
          <td class="mono">${a.count}</td>
          <td><span class="${Utils.alertLevelClass(a.level)}">${a.level}</span></td>
          <td>${a.active ? 'Active' : 'Resolved'}</td>
          <td><button class="btn btn--ghost btn--sm" data-resolve="${a.id}">Resolve</button></td>
        </tr>`
      )
      .join('');
    Utils.qsa('[data-resolve]', alertsTbody).forEach(btn => {
      btn.addEventListener('click', () => {
        DB.resolveAlert(btn.dataset.resolve);
        Toast.show('Alert marked as resolved.', 'success');
        setTimeout(() => window.location.reload(), 400);
      });
    });
  }

  // ---------- Users table ----------
  const usersTbody = document.getElementById('users-tbody');
  function renderUsers(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = users.filter(
      u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    usersTbody.innerHTML = filtered
      .map(u => {
        const count = records.filter(r => r.userId === u.id).length;
        return `<tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role === 'admin' ? '<span class="badge badge--watch">Admin</span>' : 'Citizen'}</td>
          <td class="mono">${count}</td>
        </tr>`;
      })
      .join('');
  }
  renderUsers();
  document.getElementById('user-search').addEventListener('input', (e) => renderUsers(e.target.value));

  // ---------- Reports table ----------
  const reportsTbody = document.getElementById('reports-tbody');
  let liveRecords = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  function renderReports(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = liveRecords.filter(
      r => !q || (r.name || '').toLowerCase().includes(q) || (r.location || '').toLowerCase().includes(q)
    );
    if (filtered.length === 0) {
      reportsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--ink-muted); padding:24px;">No reports found.</td></tr>`;
      return;
    }
    reportsTbody.innerHTML = filtered
      .slice(0, 40)
      .map(
        r => `<tr>
          <td>${Utils.formatDate(r.date)}</td>
          <td>${r.name}</td>
          <td>${r.location || '—'}</td>
          <td><span class="${Utils.riskBadgeClass(r.prediction?.risk)}">${r.prediction?.risk}</span></td>
          <td><button class="btn btn--danger btn--sm" data-delete="${r.id}">Delete</button></td>
        </tr>`
      )
      .join('');
    Utils.qsa('[data-delete]', reportsTbody).forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this report? This cannot be undone.')) return;
        DB.deleteRecord(btn.dataset.delete);
        liveRecords = liveRecords.filter(r => r.id !== btn.dataset.delete);
        Toast.show('Report deleted.', 'success');
        renderReports(document.getElementById('report-search').value);
      });
    });
  }
  renderReports();
  document.getElementById('report-search').addEventListener('input', (e) => renderReports(e.target.value));

  // ---------- Charts ----------
  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  records.forEach(r => { if (r.prediction?.risk) riskCounts[r.prediction.risk]++; });

  new Chart(document.getElementById('riskChart'), {
    type: 'doughnut',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{ data: [riskCounts.Low, riskCounts.Medium, riskCounts.High], backgroundColor: [COLORS.green, COLORS.amber, COLORS.coral], borderWidth: 0 }],
    },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 } } } } },
  });

  const symptomCounts = {};
  records.forEach(r => (r.symptoms || []).forEach(s => (symptomCounts[s] = (symptomCounts[s] || 0) + 1)));
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  new Chart(document.getElementById('symptomChart'), {
    type: 'bar',
    data: {
      labels: topSymptoms.map(([k]) => Prediction.labelFor(k)),
      datasets: [{ data: topSymptoms.map(([, v]) => v), backgroundColor: COLORS.teal, borderRadius: 6 }],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: COLORS.grid }, ticks: { precision: 0 } }, y: { grid: { display: false } } },
    },
  });

  // Weekly trend: last 7 days count
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const trendCounts = days.map(d => records.filter(r => r.date === d).length);

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: days.map(d => Utils.formatDate(d).slice(0, 6)),
      datasets: [{
        data: trendCounts,
        borderColor: COLORS.tealDark,
        backgroundColor: 'rgba(18,116,111,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: COLORS.grid }, ticks: { precision: 0 } } },
    },
  });
}
