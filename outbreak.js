/**
 * outbreak.js — Community Disease Outbreak Detection module.
 *
 * Strategy: within a rolling time window (default 7 days), group all
 * health records by location. If enough distinct people in the same
 * location report overlapping symptom clusters (e.g. fever + cough),
 * raise a community alert with a severity level based on case count.
 *
 * This is intentionally simple and explainable (no black-box ML) so it's
 * easy to defend in a viva/interview, while still producing a genuinely
 * useful early-warning signal.
 */

const Outbreak = (() => {
  const WINDOW_DAYS = 7;

  // Symptom clusters we watch for. Each cluster needs ALL of its symptoms
  // present in a record to count toward that cluster's case count.
  const CLUSTERS = [
    { key: 'flu_like', label: 'Flu-like illness', symptoms: ['fever', 'cough'] },
    { key: 'gastro', label: 'Gastrointestinal illness', symptoms: ['vomiting', 'diarrhea'] },
    { key: 'respiratory', label: 'Respiratory distress', symptoms: ['breathing_difficulty', 'cough'] },
    { key: 'high_fever_cluster', label: 'High fever cluster', symptoms: ['high_fever'] },
  ];

  function withinWindow(dateStr, days) {
    const recordDate = new Date(dateStr).getTime();
    const cutoff = Date.now() - days * 86400000;
    return recordDate >= cutoff;
  }

  function levelForCount(count) {
    if (count >= 20) return 'Critical';
    if (count >= 10) return 'Warning';
    if (count >= 5) return 'Watch';
    return null;
  }

  /**
   * Re-scans all records and refreshes the alerts table.
   * Returns the list of currently-active alerts.
   */
  function detectAndStore() {
    const records = DB.getRecords().filter(r => withinWindow(r.date || r.createdAt, WINDOW_DAYS));
    DB.deactivateAllAlerts();

    // location -> cluster -> Set(userId or recordId to avoid double counting same user)
    const buckets = {};

    records.forEach(record => {
      const loc = (record.location || 'Unknown').trim();
      if (!buckets[loc]) buckets[loc] = {};

      CLUSTERS.forEach(cluster => {
        const hasAll = cluster.symptoms.every(s => (record.symptoms || []).includes(s));
        if (hasAll) {
          buckets[loc][cluster.key] = buckets[loc][cluster.key] || new Set();
          buckets[loc][cluster.key].add(record.userId || record.id);
        }
      });
    });

    const activeAlerts = [];
    Object.entries(buckets).forEach(([location, clusters]) => {
      Object.entries(clusters).forEach(([clusterKey, peopleSet]) => {
        const count = peopleSet.size;
        const level = levelForCount(count);
        if (!level) return;
        const clusterMeta = CLUSTERS.find(c => c.key === clusterKey);
        const alert = {
          location,
          symptomKey: clusterKey,
          clusterLabel: clusterMeta.label,
          count,
          level,
          windowDays: WINDOW_DAYS,
          message: `${count} people in ${location} reported ${clusterMeta.label.toLowerCase()} symptoms in the last ${WINDOW_DAYS} days.`,
        };
        DB.upsertAlert(alert);
        activeAlerts.push(alert);
      });
    });

    return DB.getAlerts().filter(a => a.active);
  }

  return { detectAndStore, CLUSTERS, WINDOW_DAYS };
})();
