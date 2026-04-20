import { useState, useEffect } from 'react'
import { Upload, BarChart2, List, TrendingUp } from 'lucide-react'
import { api } from './api'
import UploadPage    from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import TradeLogPage  from './pages/TradeLogPage'
import AnalyticsPage from './pages/AnalyticsPage'

const NAV = [
  { id: 'upload',    label: 'Data Input',  icon: Upload    },
  { id: 'dashboard', label: 'Overview',    icon: BarChart2 },
  { id: 'trades',    label: 'Trade Log',   icon: List      },
  { id: 'analytics', label: 'Analytics',   icon: TrendingUp},
]

const PAGE_TITLES = {
  upload    : 'Data Input  /  Upload & Configure',
  dashboard : 'Overview  /  Equity & Stats',
  trades    : 'Trade Log  /  Full History',
  analytics : 'Analytics  /  Deep Dive',
}

export default function App() {
  const [page,    setPage]    = useState('upload')
  const [summary, setSummary] = useState(null)
  const [status,  setStatus]  = useState({ file_loaded: false, has_results: false })

  useEffect(() => {
    api.status().then(setStatus).catch(() => {})
  }, [])

  useEffect(() => {
    if (status.has_results && !summary) {
      api.summary().then(setSummary).catch(() => {})
    }
  }, [status])

  const handleRunComplete = (summaryData) => {
    setSummary(summaryData)
    setStatus(s => ({ ...s, file_loaded: true, has_results: true }))
    setPage('dashboard')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="ticker">US30</div>
          <div className="sub">Backtest Terminal</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <div key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={14} />
              {label}
            </div>
          ))}
        </nav>
        <div className="sidebar-status">
          <div style={{ marginBottom: 6 }}>
            <span className={`status-dot ${status.file_loaded ? 'active' : ''}`} />
            {status.file_loaded ? 'File loaded' : 'No file'}
          </div>
          <div>
            <span className={`status-dot ${status.has_results ? 'active pulsing' : ''}`} />
            {status.has_results ? 'Results ready' : 'Not run'}
          </div>
          {summary && (
            <div style={{ marginTop: 10, color: 'var(--text-2)', fontSize: 10 }}>
              {summary.period?.start}<br />→ {summary.period?.end}
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <span className="page-title">{PAGE_TITLES[page]}</span>
          {summary && (
            <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
              <span style={{ color: summary.win_rate >= summary.breakeven_wr ? 'var(--green)' : 'var(--red)' }}>
                WR {summary.win_rate?.toFixed(1)}%
              </span>
              {' · '}
              <span style={{ color: summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {summary.total_pnl >= 0 ? '+' : ''}{summary.total_pnl?.toFixed(1)} pts
              </span>
              {' · '}
              {summary.total_trades} trades
            </span>
          )}
        </div>

        {page === 'upload'    && <UploadPage    onRunComplete={handleRunComplete} />}
        {page === 'dashboard' && <DashboardPage summary={summary} />}
        {page === 'trades'    && <TradeLogPage  summary={summary} />}
        {page === 'analytics' && <AnalyticsPage summary={summary} />}
      </main>
    </div>
  )
}
