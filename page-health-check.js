DB.seedIfNeeded();
const user = Utils.requireAuth();

if (user) {
  Utils.renderNav('health-check');

  // Prefill known fields
  document.getElementById('name').value = user.name;
  if (user.age) document.getElementById('age').value = user.age;
  if (user.gender) document.getElementById('gender').value = user.gender;
  document.getElementById('date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('date').max = new Date().toISOString().slice(0, 10);

  const SYMPTOM_GROUPS = [
    { key: 'fever', label: 'Fever' },
    { key: 'high_fever', label: 'High Fever' },
    { key: 'cough', label: 'Cough' },
    { key: 'persistent_cough', label: 'Persistent Cough' },
    { key: 'sore_throat', label: 'Sore Throat' },
    { key: 'headache', label: 'Headache' },
    { key: 'fatigue', label: 'Fatigue' },
    { key: 'body_ache', label: 'Body Ache' },
    { key: 'runny_nose', label: 'Runny Nose' },
    { key: 'nausea', label: 'Nausea' },
    { key: 'vomiting', label: 'Vomiting' },
    { key: 'diarrhea', label: 'Diarrhea' },
    { key: 'dehydration', label: 'Dehydration' },
    { key: 'breathing_difficulty', label: 'Difficulty Breathing' },
    { key: 'chest_pain', label: 'Chest Pain' },
    { key: 'confusion', label: 'Confusion' },
    { key: 'bluish_lips', label: 'Bluish Lips/Face' },
    { key: 'seizure', label: 'Seizure' },
  ];

  const chipContainer = document.getElementById('symptom-chips');
  chipContainer.innerHTML = SYMPTOM_GROUPS.map(
    s => `<label class="chip" data-key="${s.key}">
      <input type="checkbox" value="${s.key}" />
      ${s.label}
    </label>`
  ).join('');

  Utils.qsa('.chip', chipContainer).forEach(chip => {
    chip.addEventListener('click', (e) => {
      // allow the native checkbox toggle, then sync class
      setTimeout(() => {
        const checked = chip.querySelector('input').checked;
        chip.classList.toggle('chip--checked', checked);
      }, 0);
    });
  });

  function getSelectedSymptoms() {
    return Utils.qsa('.chip input:checked', chipContainer).map(i => i.value);
  }

  function setFieldError(fieldId, hasError) {
    document.getElementById(fieldId).classList.toggle('field--invalid', hasError);
  }

  function numField(id, min, max) {
    const val = parseFloat(document.getElementById(id).value);
    const valid = !isNaN(val) && val >= min && val <= max;
    return { val, valid };
  }

  const form = document.getElementById('check-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const location = document.getElementById('location').value.trim();
    const date = document.getElementById('date').value;

    const temperature = numField('temperature', 30, 45);
    const heartRate = numField('heartRate', 30, 220);
    const bpSystolic = numField('bpSystolic', 60, 260);
    const bpDiastolic = numField('bpDiastolic', 40, 180);
    const spo2 = numField('spo2', 50, 100);
    const weight = numField('weight', 2, 300);

    setFieldError('field-name', name.length < 2);
    setFieldError('field-age', !(age && age >= 1 && age <= 120));
    setFieldError('field-gender', !gender);
    setFieldError('field-location', location.length < 2);
    setFieldError('field-date', !date);
    setFieldError('field-temperature', !temperature.valid);
    setFieldError('field-heartRate', !heartRate.valid);
    setFieldError('field-bpSystolic', !bpSystolic.valid);
    setFieldError('field-bpDiastolic', !bpDiastolic.valid);
    setFieldError('field-spo2', !spo2.valid);
    setFieldError('field-weight', !weight.valid);

    const allValid = [
      name.length >= 2, age && age >= 1 && age <= 120, !!gender, location.length >= 2, !!date,
      temperature.valid, heartRate.valid, bpSystolic.valid, bpDiastolic.valid, spo2.valid, weight.valid,
    ].every(Boolean);

    if (!allValid) {
      Toast.show('Please fix the highlighted fields.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing with AI...';

    const symptoms = getSelectedSymptoms();
    const vitals = {
      temperature: temperature.val,
      heartRate: heartRate.val,
      bpSystolic: bpSystolic.val,
      bpDiastolic: bpDiastolic.val,
      spo2: spo2.val,
      weight: weight.val,
    };

    setTimeout(() => {
      const prediction = Prediction.evaluate({ ...vitals, symptoms });

      const record = DB.createRecord({
        userId: user.id,
        name, age: Number(age), gender, location, date,
        symptoms, ...vitals, prediction,
      });

      // Re-run outbreak detection now that a new record exists
      Outbreak.detectAndStore();

      renderResult(record);
      Toast.show('Check-in submitted and analyzed successfully.', 'success');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit check-in & get my risk assessment';
      form.style.display = 'none';
    }, 500);
  });

  function renderResult(record) {
    const panel = document.getElementById('result-panel');
    const p = record.prediction;
    panel.style.display = 'block';
    panel.innerHTML = `
      <div class="card card--elevated">
        <span class="eyebrow">AI Risk Assessment</span>
        <div style="display:flex; align-items:center; gap:14px; margin:10px 0 16px;">
          <span class="${Utils.riskBadgeClass(p.risk)}" style="font-size:1rem; padding:10px 20px;">${p.risk} Risk</span>
          <span class="mono" style="color:var(--ink-muted); font-size:0.85rem;">score: ${p.score}</span>
        </div>
        <p style="font-size:0.95rem;">${p.recommendation}</p>
        <p style="font-size:0.95rem;"><strong style="color:var(--teal-900);">Suggested action:</strong> ${p.action}</p>

        <h3 style="font-size:0.95rem; margin-top:20px;">What the AI looked at</h3>
        <ul class="factor-list">
          ${p.factors.map(f => `<li>• ${f}</li>`).join('')}
        </ul>

        <div style="margin-top:22px; display:flex; gap:12px; flex-wrap:wrap;">
          <a href="dashboard.html" class="btn btn--primary">Back to dashboard</a>
          <a href="history.html" class="btn btn--ghost">View history</a>
        </div>
      </div>
    `;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
