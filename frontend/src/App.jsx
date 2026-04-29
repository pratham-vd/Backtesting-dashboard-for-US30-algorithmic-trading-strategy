import { useState, useEffect } from 'react'
import { BarChart2, List, Settings } from 'lucide-react'
import { api } from './api'
import DashboardPage from './pages/DashboardPage'
import TradeLogPage  from './pages/TradeLogPage'
import UploadPage    from './pages/UploadPage'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: BarChart2 },
  { id: 'trades',    label: 'Trade Log',  icon: List      },
  { id: 'upload',    label: 'Data Input', icon: Settings  },
]

export default function App() {
  const [page,     setPage]     = useState('upload')
  const [summary,  setSummary]  = useState(null)

  // Lifted state — persists when navigating away from Data Input
  const [meta,     setMeta]     = useState(null)   // file info after upload
  const [pips,     setPips]     = useState('20')   // strategy params
  const [tp,       setTp]       = useState('30')
  const [targetTime,   setTargetTime]   = useState('20:00')  // HH:MM IST
  const [offsetSecs,   setOffsetSecs]   = useState('15')     // seconds before target

  // Restore full state on mount / page refresh
  useEffect(() => {
    api.status().then(s => {
      // Restore file info so Data Input page shows correctly
      if (s.meta) {
        setMeta(s.meta)
      }
      // Restore last-used strategy params
      if (s.last_config) {
        setPips(String(s.last_config.pips_distance))
        setTp(String(s.last_config.tp_pips))
        if (s.last_config.target_hour !== undefined) {
          const hh = String(s.last_config.target_hour).padStart(2,'0')
          const mm = String(s.last_config.target_minute).padStart(2,'0')
          setTargetTime(`${hh}:${mm}`)
          setOffsetSecs(String(s.last_config.offset_seconds))
        }
      }
      // Restore results and go to dashboard
      if (s.has_results) {
        api.summary().then(data => {
          setSummary(data)
          setPage('dashboard')
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const handleRunComplete = (summaryData) => {
    setSummary(summaryData)
    setPage('dashboard')
  }

  return (
    <div className="app-shell">

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        <div
          className="sidebar-logo"
          onClick={async () => {
            try { await api.reset() } catch {}
            setSummary(null)
            setMeta(null)
            setPips('20')
            setTp('30')
            setPage('upload')
          }}
          title="Reset everything"
          style={{ cursor: 'pointer', userSelect: 'none', transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <div className="ticker">US30</div>
          <div className="sub">Backtest Terminal</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon size={13} strokeWidth={1.5} />
              {label}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main className="main-content">
        <div className="page-header">
          <span className="page-title">
            {page === 'dashboard' && 'Dashboard  /  Performance & Analytics'}
            {page === 'trades'    && 'Trade Log  /  Full History'}
            {page === 'upload'    && 'Data Input  /  Upload & Configure'}
          </span>
        </div>

        {page === 'dashboard' && <DashboardPage summary={summary} />}
        {page === 'trades'    && <TradeLogPage  summary={summary} />}
        {page === 'upload'    && (
          <UploadPage
            onRunComplete={handleRunComplete}
            meta={meta}
            setMeta={setMeta}
            pips={pips}
            setPips={setPips}
            tp={tp}
            setTp={setTp}
            targetTime={targetTime}
            setTargetTime={setTargetTime}
            offsetSecs={offsetSecs}
            setOffsetSecs={setOffsetSecs}
            hasPreviousResults={summary !== null}
          />
        )}
      </main>
    </div>
  )
}
