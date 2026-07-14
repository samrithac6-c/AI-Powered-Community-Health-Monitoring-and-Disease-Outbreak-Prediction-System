/**
 * prediction.js — Rule-based AI Health Risk Prediction module.
 *
 * This module exposes a single entry point, Prediction.evaluate(input),
 * which returns { score, risk, recommendation, action, factors }.
 *
 * WHY IT'S BUILT THIS WAY
 * The scoring function below is intentionally the ONLY place that decides
 * risk. If you later train a real ML model (e.g. a classifier served from
 * a Python API), you only need to replace the body of `evaluate()` with a
 * fetch() call to your model endpoint and keep the same return shape.
 * Every screen in the app (Health Check, History, Dashboard, Admin) reads
 * from this shape, so nothing else has to change.
 */

const Prediction = (() => {
  const SEVERE_SYMPTOMS = new Set(['breathing_difficulty', 'chest_pain', 'confusion', 'bluish_lips', 'seizure']);
  const MODERATE_SYMPTOMS = new Set(['high_fever', 'persistent_cough', 'vomiting', 'diarrhea', 'dehydration']);
  const MILD_SYMPTOMS = new Set(['fever', 'cough', 'headache', 'sore_throat', 'fatigue', 'body_ache', 'runny_nose', 'nausea']);

  function scoreVitals({ temperature, heartRate, spo2, bpSystolic, bpDiastolic }) {
    let score = 0;
    const factors = [];

    if (temperature != null) {
      if (temperature >= 39.5) { score += 3; factors.push('High fever (≥39.5°C)'); }
      else if (temperature >= 38) { score += 2; factors.push('Fever (38–39.4°C)'); }
      else if (temperature >= 37.5) { score += 1; factors.push('Mild elevated temperature'); }
    }

    if (heartRate != null) {
      if (heartRate < 50 || heartRate > 120) { score += 3; factors.push('Heart rate strongly out of normal range'); }
      else if (heartRate > 100 || heartRate < 55) { score += 2; factors.push('Heart rate outside normal resting range'); }
    }

    if (spo2 != null) {
      if (spo2 < 90) { score += 4; factors.push('Critically low oxygen saturation (<90%)'); }
      else if (spo2 < 95) { score += 2; factors.push('Below-normal oxygen saturation (90–94%)'); }
    }

    if (bpSystolic != null && bpDiastolic != null) {
      if (bpSystolic >= 160 || bpDiastolic >= 100 || bpSystolic < 90) {
        score += 2;
        factors.push('Blood pressure outside safe range');
      }
    }

    return { score, factors };
  }

  function scoreSymptoms(symptoms = []) {
    let score = 0;
    const factors = [];
    symptoms.forEach(s => {
      if (SEVERE_SYMPTOMS.has(s)) { score += 3; factors.push(`Severe symptom reported: ${labelFor(s)}`); }
      else if (MODERATE_SYMPTOMS.has(s)) { score += 2; factors.push(`Moderate symptom reported: ${labelFor(s)}`); }
      else if (MILD_SYMPTOMS.has(s)) { score += 1; factors.push(`Mild symptom reported: ${labelFor(s)}`); }
    });
    return { score, factors };
  }

  function labelFor(symptomKey) {
    return SYMPTOM_LABELS[symptomKey] || symptomKey.replace(/_/g, ' ');
  }

  const SYMPTOM_LABELS = {
    fever: 'Fever',
    high_fever: 'High Fever',
    cough: 'Cough',
    persistent_cough: 'Persistent Cough',
    breathing_difficulty: 'Difficulty Breathing',
    chest_pain: 'Chest Pain',
    sore_throat: 'Sore Throat',
    headache: 'Headache',
    fatigue: 'Fatigue',
    body_ache: 'Body Ache',
    runny_nose: 'Runny Nose',
    nausea: 'Nausea',
    vomiting: 'Vomiting',
    diarrhea: 'Diarrhea',
    dehydration: 'Dehydration',
    confusion: 'Confusion',
    bluish_lips: 'Bluish Lips/Face',
    seizure: 'Seizure',
  };

  function evaluate(input) {
    const vitalsResult = scoreVitals(input);
    const symptomResult = scoreSymptoms(input.symptoms);
    const score = vitalsResult.score + symptomResult.score;
    const factors = [...vitalsResult.factors, ...symptomResult.factors];

    let risk, recommendation, action;
    if (score >= 8) {
      risk = 'High';
      recommendation = 'Your readings and symptoms indicate a potentially serious health issue.';
      action = 'Please seek in-person medical attention as soon as possible, or contact emergency services.';
    } else if (score >= 4) {
      risk = 'Medium';
      recommendation = 'Some of your readings or symptoms need attention.';
      action = 'Monitor closely over the next 24 hours, rest, stay hydrated, and consult a doctor if symptoms worsen.';
    } else {
      risk = 'Low';
      recommendation = 'Your readings look within a normal, healthy range.';
      action = 'No action needed. Continue your daily health check-ins.';
    }

    if (factors.length === 0) {
      factors.push('All submitted vitals and symptoms are within a normal range.');
    }

    return { score, risk, recommendation, action, factors };
  }

  return { evaluate, labelFor, SYMPTOM_LABELS, SEVERE_SYMPTOMS, MODERATE_SYMPTOMS, MILD_SYMPTOMS };
})();
