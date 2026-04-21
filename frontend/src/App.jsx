import { useState, useEffect } from 'react'
import { BarChart2, List, Settings } from 'lucide-react'
import { api } from './api'
import DashboardPage from './pages/DashboardPage'
import TradeLogPage  from './pages/TradeLogPage'
import SettingsPage  from './pages/SettingsPage'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: BarChart2 },
  { id: 'trades',    label: 'Trade Log',  icon: List      },
  { id: 'settings',  label: 'Settings',   icon: Settings  },
]

const fmt = (n, d = 1) => n != null ? (n >= 0 ? '+' : '') + Number(n).toFixed(d) : '—'

export default function App() {
  const [page,     setPage]     = useState('settings')
  const [summary,  setSummary]  = useState(null)
  const [fileInfo, setFileInfo] = useState(null)   // persists across page nav

  // Check backend on mount — restore state if results already exist
  useEffect(() => {
    api.status().then(s => {
      if (s.has_results) {
        api.summary().then(data => {
          setSummary(data)
          setPage('dashboard')
        }).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const handleRunComplete = (summaryData, meta) => {
    setSummary(summaryData)
    if (meta) setFileInfo(meta)
    setPage('dashboard')
  }

  const hasResults = summary !== null

  return (
    <div className="app-shell">

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
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

        {/* File status chip */}
        <div className="sidebar-bottom">
          <div className="file-chip">
            {fileInfo ? (
              <>
                <span className="chip-name">{fileInfo.filename || 'us30_filtered.parquet'}</span>
                <span className="status-dot on" />
                {fileInfo.trading_days} days<br />
                <span style={{ fontSize: 9 }}>
                  {fileInfo.date_start} → {fileInfo.date_end}
                </span>
              </>
            ) : (
              <>
                <span className="status-dot" />
                No file loaded
              </>
            )}
          </div>

          {hasResults && (
            <div style={{
              marginTop: 10, padding: '8px 10px',
              background: 'var(--bg-2)', border: '1px solid var(--border-hi)',
              borderRadius: 'var(--radius)', fontSize: 9.5,
              lineHeight: 1.9
            }}>
              <div style={{ color: summary.win_rate >= summary.breakeven_wr ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                WR {summary.win_rate?.toFixed(1)}%
              </div>
              <div style={{ color: summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmt(summary.total_pnl)} pts
              </div>
              <div style={{ color: 'var(--text-2)' }}>
                {summary.total_trades} trades
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main className="main-content">
        <div className="page-header">
          <span className="page-title">
            {page === 'dashboard' && 'Dashboard  /  Performance & Analytics'}
            {page === 'trades'    && 'Trade Log  /  Full History'}
            {page === 'settings'  && 'Settings  /  Data & Configuration'}
          </span>

          {hasResults && (
            <div className="header-pill">
              <span style={{ color: 'var(--text-2)' }}>
                WR&nbsp;
                <span style={{ color: summary.win_rate >= summary.breakeven_wr ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                  {summary.win_rate?.toFixed(1)}%
                </span>
              </span>
              <span style={{ color: 'var(--border-hi)' }}>│</span>
              <span style={{ color: 'var(--text-2)' }}>
                P&L&nbsp;
                <span style={{ color: summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                  {fmt(summary.total_pnl)} pts
                </span>
              </span>
              <span style={{ color: 'var(--border-hi)' }}>│</span>
              <span style={{ color: 'var(--text-2)' }}>
                <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{summary.total_trades}</span> trades
              </span>
              <span style={{ color: 'var(--border-hi)' }}>│</span>
              <span style={{ color: 'var(--text-2)' }}>
                DD&nbsp;
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                  {fmt(summary.max_drawdown)} pts
                </span>
              </span>
            </div>
          )}
        </div>

        {page === 'dashboard' && <DashboardPage summary={summary} />}
        {page === 'trades'    && <TradeLogPage  summary={summary} />}
        {page === 'settings'  && (
          <SettingsPage
            onRunComplete={handleRunComplete}
            fileInfo={fileInfo}
            setFileInfo={setFileInfo}
            summary={summary}
          />
        )}
      </main>
    </div>
  )
}
