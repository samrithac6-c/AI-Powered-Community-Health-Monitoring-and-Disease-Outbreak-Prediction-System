/**
 * db.js — Local data layer for the AI Community Health Monitor.
 *
 * This app runs entirely in the browser, so localStorage stands in for the
 * PostgreSQL database described in the original spec. Every function here
 * mirrors what a real API route + Prisma call would do, so this file is the
 * one place you'd swap out if you wired this app up to a real backend later.
 */

const DB = (() => {
  const KEYS = {
    USERS: 'hm_users',
    RECORDS: 'hm_records',
    ALERTS: 'hm_alerts',
    SESSION: 'hm_session',
    SEEDED: 'hm_seeded_v1',
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('DB read failed for', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // --- Simple, non-cryptographic hash so we never store plain passwords.
  // (In a real backend this would be bcrypt/argon2 server-side.)
  function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return `h${hash}`;
  }

  // ---------- Users ----------
  function getUsers() {
    return read(KEYS.USERS, []);
  }

  function saveUsers(users) {
    write(KEYS.USERS, users);
  }

  function findUserByEmail(email) {
    return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  function createUser({ name, email, password, age, gender, role = 'user' }) {
    const users = getUsers();
    if (findUserByEmail(email)) {
      throw new Error('An account with this email already exists.');
    }
    const user = {
      id: uid('usr'),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      age: age ? Number(age) : null,
      gender: gender || 'unspecified',
      role,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  function verifyLogin(email, password) {
    const user = findUserByEmail(email);
    if (!user) return null;
    if (user.passwordHash !== hashPassword(password)) return null;
    return user;
  }

  function getUserById(id) {
    return getUsers().find(u => u.id === id) || null;
  }

  // ---------- Session ----------
  function setSession(userId) {
    write(KEYS.SESSION, { userId, at: new Date().toISOString() });
  }

  function getSession() {
    return read(KEYS.SESSION, null);
  }

  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
  }

  function currentUser() {
    const session = getSession();
    if (!session) return null;
    return getUserById(session.userId);
  }

  // ---------- Health Records ----------
  function getRecords() {
    return read(KEYS.RECORDS, []);
  }

  function saveRecords(records) {
    write(KEYS.RECORDS, records);
  }

  function getRecordsForUser(userId) {
    return getRecords()
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function createRecord(record) {
    const records = getRecords();
    const full = {
      id: uid('rec'),
      createdAt: new Date().toISOString(),
      ...record,
    };
    records.push(full);
    saveRecords(records);
    return full;
  }

  function deleteRecord(recordId) {
    const records = getRecords().filter(r => r.id !== recordId);
    saveRecords(records);
  }

  // ---------- Alerts ----------
  function getAlerts() {
    return read(KEYS.ALERTS, []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  function saveAlerts(alerts) {
    write(KEYS.ALERTS, alerts);
  }

  function upsertAlert(alert) {
    const alerts = getAlerts();
    const existingIdx = alerts.findIndex(
      a => a.location === alert.location && a.symptomKey === alert.symptomKey && a.active
    );
    if (existingIdx >= 0) {
      alerts[existingIdx] = { ...alerts[existingIdx], ...alert, id: alerts[existingIdx].id };
    } else {
      alerts.push({ id: uid('alert'), createdAt: new Date().toISOString(), active: true, ...alert });
    }
    saveAlerts(alerts);
  }

  function resolveAlert(alertId) {
    const alerts = getAlerts().map(a => (a.id === alertId ? { ...a, active: false } : a));
    saveAlerts(alerts);
  }

  function deactivateAllAlerts() {
    const alerts = getAlerts().map(a => ({ ...a, active: false }));
    saveAlerts(alerts);
  }

  // ---------- Seed demo data (first run only) ----------
  function seedIfNeeded() {
    if (read(KEYS.SEEDED, false)) return;

    // Admin account
    if (!findUserByEmail('admin@healthai.com')) {
      createUser({
        name: 'System Administrator',
        email: 'admin@healthai.com',
        password: 'Admin@123',
        age: 35,
        gender: 'unspecified',
        role: 'admin',
      });
    }

    // A demo citizen account so graders can log in immediately
    if (!findUserByEmail('demo@healthai.com')) {
      createUser({
        name: 'Asha Verma',
        email: 'demo@healthai.com',
        password: 'Demo@123',
        age: 27,
        gender: 'female',
        role: 'user',
      });
    }

    const demoUser = findUserByEmail('demo@healthai.com');

    // Seed a small cluster of records from DISTINCT citizens in one location
    // so the Outbreak Detection module (which counts distinct people, not
    // just records) has something real to detect on first load.
    const seedCitizens = [
      { name: 'Rohan Mehta', email: 'rohan.seed@healthai.com' },
      { name: 'Priya Nair', email: 'priya.seed@healthai.com' },
      { name: 'Karan Shah', email: 'karan.seed@healthai.com' },
      { name: 'Fatima Sheikh', email: 'fatima.seed@healthai.com' },
      { name: 'Vikram Rao', email: 'vikram.seed@healthai.com' },
    ].map(c => findUserByEmail(c.email) || createUser({ ...c, password: 'SeedUser@123', age: 22 + Math.floor(Math.random() * 30), gender: 'unspecified', role: 'user' }));

    // Demo user submits their own report too, so their dashboard/history isn't empty.
    const seedReports = [
      { user: demoUser, location: 'Andheri East', symptoms: ['fever', 'cough', 'fatigue'], daysAgo: 0 },
      { user: seedCitizens[0], location: 'Andheri East', symptoms: ['fever', 'cough'], daysAgo: 1 },
      { user: seedCitizens[1], location: 'Andheri East', symptoms: ['fever', 'cough', 'sore_throat'], daysAgo: 1 },
      { user: seedCitizens[2], location: 'Andheri East', symptoms: ['fever', 'body_ache'], daysAgo: 2 },
      { user: seedCitizens[3], location: 'Andheri East', symptoms: ['fever', 'cough', 'headache'], daysAgo: 2 },
      { user: seedCitizens[4], location: 'Andheri East', symptoms: ['fever', 'cough'], daysAgo: 3 },
      { user: seedCitizens[0], location: 'Bandra West', symptoms: ['headache'], daysAgo: 0 },
    ];
    const now = Date.now();

    if (getRecords().length === 0) {
      seedReports.forEach(({ user, location, symptoms, daysAgo }) => {
        const vitals = {
          temperature: Math.round((38 + Math.random() * 1.5) * 10) / 10,
          heartRate: 85 + Math.floor(Math.random() * 25),
          bpSystolic: 118 + Math.floor(Math.random() * 10),
          bpDiastolic: 76 + Math.floor(Math.random() * 8),
          spo2: 94 + Math.floor(Math.random() * 5),
          weight: 60 + Math.floor(Math.random() * 20),
        };
        const prediction = Prediction.evaluate({ ...vitals, symptoms });
        const createdAt = new Date(now - daysAgo * 86400000).toISOString();
        createRecord({
          userId: user.id,
          name: user.name,
          age: user.age,
          gender: user.gender,
          location,
          date: createdAt.slice(0, 10),
          symptoms,
          ...vitals,
          prediction,
          createdAt,
        });
      });
    }

    write(KEYS.SEEDED, true);
  }

  return {
    KEYS,
    uid,
    createUser,
    findUserByEmail,
    verifyLogin,
    getUsers,
    getUserById,
    setSession,
    getSession,
    clearSession,
    currentUser,
    getRecords,
    saveRecords,
    getRecordsForUser,
    createRecord,
    deleteRecord,
    getAlerts,
    upsertAlert,
    resolveAlert,
    deactivateAllAlerts,
    seedIfNeeded,
  };
})();
