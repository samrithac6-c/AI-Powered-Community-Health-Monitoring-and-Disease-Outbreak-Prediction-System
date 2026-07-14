Here's the README content:

---

# CommunityHealth AI — Community Health Monitoring & Outbreak Prediction

A fully working, front-end web app built in **plain HTML, CSS, and JavaScript** (no build step, no server, no framework). It runs entirely in the browser and uses `localStorage` as its database, so you can open it and use it immediately.

> **Note on the tech stack:** the original brief asked for Next.js + PostgreSQL + Prisma. This build instead uses vanilla HTML/CSS/JS as requested, with `localStorage` standing in for the database. The code is organized so the same architecture (a `DB` data layer, a `Prediction` engine, an `Outbreak` detector) could be re-pointed at a real API with minimal changes — see "Upgrading to a real backend" below.

## How to run it

No installation needed.

1. Unzip/open the `health-monitor` folder.
2. Double-click `index.html` to open it in your browser — **or**, for the most reliable experience (some browsers restrict `localStorage` on `file://` URLs), serve it locally:
   ```bash
   cd health-monitor
   python3 -m http.server 8000
   # then open http://localhost:8000 in your browser
   ```
3. Log in with a demo account (shown on the sign-in screen), or register a new one:
   - **Citizen:** `demo@healthai.com` / `Demo@123`
   - **Admin:** `admin@healthai.com` / `Admin@123`

The first time the app loads, it seeds itself with a small set of demo users and health reports (including a simulated symptom cluster in "Andheri East") so the Outbreak Detection and Analytics modules have real data to show you immediately.

## Folder structure

```
health-monitor/
├── index.html          # Login
├── register.html        # Registration
├── dashboard.html        # Citizen dashboard
├── health-check.html     # Daily health check-in form + AI risk result
├── history.html          # Citizen's personal report history (search/filter)
├── admin.html             # Admin analytics dashboard
├── emergency.html         # Emergency contacts, hospitals, first aid
├── css/
│   └── style.css          # All styling (design tokens + components)
└── js/
    ├── db.js               # Data layer (localStorage-backed "database")
    ├── prediction.js       # Rule-based AI health risk engine
    ├── outbreak.js          # Community outbreak detection engine
    ├── toast.js             # Toast notification system
    ├── utils.js              # Shared helpers (auth guards, nav, formatting)
    └── page-*.js              # Page-specific logic, one file per screen
```

## Feature checklist (maps to the original brief)

| Module | Where |
|---|---|
| Auth (register/login/logout, protected routes) | `index.html`, `register.html`, `js/db.js`, `js/utils.js` |
| User Dashboard | `dashboard.html` |
| Daily Health Check | `health-check.html` |
| AI Health Risk Prediction (rule-based, swappable) | `js/prediction.js` |
| Disease Outbreak Detection | `js/outbreak.js` |
| Analytics Dashboard (charts) | `admin.html` (Chart.js) |
| Health History (search/filter) | `history.html` |
| Admin Dashboard (users, reports, alerts) | `admin.html` |
| Emergency Assistance | `emergency.html` |
| Notifications (toasts) | `js/toast.js` |

## How the AI risk prediction works

`js/prediction.js` exposes `Prediction.evaluate(input)`. It scores vitals (temperature, heart rate, SpO₂, blood pressure) and symptoms against clinically-inspired thresholds, sums a risk score, and buckets it into **Low / Medium / High** with a recommendation and suggested action. Every screen reads from this one function's output shape — if you later train a real ML model, you only need to replace the body of `evaluate()` (e.g. with a `fetch()` call to a Python model API) and nothing else in the app changes.

## How outbreak detection works

`js/outbreak.js` groups recent (last 7 days) reports by location, and checks whether enough **distinct people** in the same location report an overlapping symptom cluster (e.g. fever + cough). If the count crosses a threshold, it raises a **Watch / Warning / Critical** alert, shown on the citizen dashboard (if it affects their area) and the admin dashboard (all alerts, with the ability to resolve them).

## Testing this build

Every page and the core logic (prediction scoring, outbreak detection, auth, duplicate-email handling, admin visibility) were exercised with an automated jsdom test harness during development — all pages load and run without throwing, and the scoring/outbreak logic produces the expected results on seeded data.

## Upgrading to a real backend later

- Replace `js/db.js`'s localStorage calls with `fetch()` calls to real API routes (the function names/shapes are already written like an API client).
- Replace `Prediction.evaluate()`'s rule-based scoring with a call to a trained ML model endpoint, keeping the same return shape.
- Swap the plain-text-adjacent hash in `db.js` for real server-side password hashing (bcrypt/argon2) once there's a backend to do it in.
