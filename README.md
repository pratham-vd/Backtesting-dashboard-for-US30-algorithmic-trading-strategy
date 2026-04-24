# US30 Backtest Terminal

## Setup (do once)

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

---

## Run (every time)

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
uvicorn backend.api:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open: http://localhost:5173

---

## How to use

1. Go to **Data Input** page
2. Drop `us30_filtered.parquet` into the upload zone
3. Adjust PIPS / TP if needed (defaults: 20 / 30)
4. Click **Run Backtest**
5. Results appear automatically

---

## File structure

```
us30-dashboard/
├── backend/
│   ├── api.py            ← FastAPI server (run this)
│   ├── config.py         ← Strategy params
│   ├── data_loader.py    ← Parquet loader
│   ├── strategy.py       ← Level math
│   ├── engine.py         ← Tick simulation
│   ├── report.py         ← Stats builder
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx          ← Entry point
        ├── App.jsx           ← Shell + nav
        ├── api.js            ← All fetch calls
        ├── index.css         ← Dark terminal styles
        └── pages/
            ├── UploadPage.jsx
            ├── DashboardPage.jsx
            ├── TradeLogPage.jsx
            └── AnalyticsPage.jsx
```
