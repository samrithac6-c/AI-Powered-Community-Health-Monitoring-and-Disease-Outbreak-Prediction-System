DB.seedIfNeeded();
const user = Utils.requireAuth();

if (user) {
  Utils.renderNav('history');

  const allRecords = DB.getRecordsForUser(user.id);
  const tbody = document.getElementById('history-tbody');
  const emptyState = document.getElementById('history-empty');
  const searchInput = document.getElementById('search-input');
  const riskFilter = document.getElementById('risk-filter');
  const dateFilter = document.getElementById('date-filter');

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const risk = riskFilter.value;
    const date = dateFilter.value;

    const filtered = allRecords.filter(r => {
      const matchesQuery =
        !q ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.symptoms || []).some(s => Prediction.labelFor(s).toLowerCase().includes(q));
      const matchesRisk = !risk || r.prediction?.risk === risk;
      const matchesDate = !date || r.date === date;
      return matchesQuery && matchesRisk && matchesDate;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    tbody.innerHTML = filtered
      .map(
        r => `<tr>
          <td>${Utils.formatDate(r.date)}</td>
          <td>${r.location || '—'}</td>
          <td class="mono">${r.temperature?.toFixed(1)}°C</td>
          <td class="mono">${r.heartRate} bpm</td>
          <td class="mono">${r.spo2}%</td>
          <td>${(r.symptoms || []).length ? `<div class="tag-list">${r.symptoms.map(s => `<span class="tag">${Prediction.labelFor(s)}</span>`).join('')}</div>` : '<span style="color:var(--ink-muted);">None</span>'}</td>
          <td><span class="${Utils.riskBadgeClass(r.prediction?.risk)}">${r.prediction?.risk}</span></td>
        </tr>`
      )
      .join('');
  }

  searchInput.addEventListener('input', render);
  riskFilter.addEventListener('change', render);
  dateFilter.addEventListener('change', render);
  document.getElementById('clear-filters').addEventListener('click', () => {
    searchInput.value = '';
    riskFilter.value = '';
    dateFilter.value = '';
    render();
  });

  render();
}
