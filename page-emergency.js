DB.seedIfNeeded();
const user = Utils.requireAuth();

if (user) {
  Utils.renderNav('emergency');

  const HOSPITALS = [
    { name: 'City General Hospital', type: 'Multi-specialty, 24/7 ER', contact: '022-4000-1111' },
    { name: 'Sunrise Community Clinic', type: 'Primary care & urgent care', contact: '022-4000-2222' },
    { name: 'Lifeline Trauma Center', type: 'Trauma & emergency', contact: '022-4000-3333' },
    { name: "St. Mary's Medical College", type: 'Teaching hospital, full services', contact: '022-4000-4444' },
  ];

  document.getElementById('hospital-tbody').innerHTML = HOSPITALS.map(
    h => `<tr><td>${h.name}</td><td>${h.type}</td><td class="mono">${h.contact}</td></tr>`
  ).join('');

  const FIRST_AID = [
    'For high fever: keep the person hydrated, use a cool compress, and seek medical care if temperature exceeds 39.5°C or persists beyond 2 days.',
    'For breathing difficulty or bluish lips: this is a medical emergency — call 108/112 immediately and keep the person upright.',
    'For fainting: lay the person flat, elevate their legs, loosen tight clothing, and check breathing.',
    'For choking: perform the Heimlich maneuver if trained; otherwise call emergency services immediately.',
    'For heavy bleeding: apply firm, direct pressure with a clean cloth and seek medical attention right away.',
    'For suspected heat stroke: move to a cool area, remove excess clothing, and apply cool (not ice-cold) water while awaiting help.',
  ];
  document.getElementById('first-aid-list').innerHTML = FIRST_AID.map(f => `<li>${f}</li>`).join('');
}
