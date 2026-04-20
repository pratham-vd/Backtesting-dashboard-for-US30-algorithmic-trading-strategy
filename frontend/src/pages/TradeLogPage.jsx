import { useState, useEffect } from 'react'
import { api } from '../api'

const Badge = ({ type }) => {
  const map = {
    TP:      'badge-tp',
    SL:      'badge-sl',
    TIMEOUT: 'badge-timeout',
    NO_TRADE:'badge-notrade',
    NO_DATA: 'badge-notrade',
  }
  return <span className={`badge ${map[type] || ''}`}>{type}</span>
}

const DirBadge = ({ dir }) => {
  if (!dir) return <span style={{ color: 'var(--text-2)' }}>—</span>
  return <span className={`badge ${dir === 'BUY' ? 'badge-buy' : 'badge-sell'}`}>{dir}</span>
}

const pnlStyle = (v) => ({
  color: v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--text-2)',
  fontWeight: 500,
})
const fmt       = (v)  => v != null ? (v >= 0 ? '+' : '') + Number(v).toFixed(3) : '—'
const shortTime = (ts) => ts ? String(ts).split(' ')[1]?.slice(0, 8) || ts : '—'

const LIMIT = 100

export default function TradeLogPage({ summary }) {
  const [trades,     setTrades]     = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [dirFilter,  setDirFilter]  = useState(null)   // null = ALL
  const [typeFilter, setTypeFilter] = useState(null)   // null = ALL
  const [offset,     setOffset]     = useState(0)

  // ── Fetch whenever any dependency changes ──────────────────
  useEffect(() => {
    if (!summary) return

    let cancelled = false

    const fetchTrades = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.trades({
          direction: dirFilter  ?? undefined,
          exitType:  typeFilter ?? undefined,
          limit:     LIMIT,
          offset,
        })
        if (!cancelled) {
          setTrades(res.trades)
          setTotal(res.total)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
          setTrades([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTrades()
    return () => { cancelled = true }          // cleanup on re-render

  }, [summary, dirFilter, typeFilter, offset]) // explicit deps, no useCallback needed

  // ── Filter helpers ─────────────────────────────────────────
  const pickDir  = (val) => { setDirFilter(val);  setOffset(0) }
  const pickType = (val) => { setTypeFilter(val); setOffset(0) }

  if (!summary) return (
    <div className="page-body" style={{ color: 'var(--text-2)' }}>
      No results yet. Run the backtest first.
    </div>
  )

  const pages   = Math.ceil(total / LIMIT)
  const curPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="page-body">

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="filter-bar">

        {/* Direction */}
        <span style={{ fontSize: 10, color: 'var(--text-2)', letterSpacing: 1 }}>DIRECTION</span>
        {[null, 'BUY', 'SELL'].map((d) => (
          <button
            key={d ?? 'ALL'}
            className={`filter-chip ${dirFilter === d ? 'selected' : ''}`}
            onClick={() => pickDir(d)}
          >
            {d ?? 'ALL'}
          </button>
        ))}

        {/* Result */}
        <span style={{ fontSize: 10, color: 'var(--text-2)', letterSpacing: 1, marginLeft: 8 }}>RESULT</span>
        {[null, 'TP', 'SL', 'TIMEOUT'].map((t) => (
          <button
            key={t ?? 'ALL'}
            className={`filter-chip ${typeFilter === t ? 'selected' : ''}`}
            onClick={() => pickType(t)}
          >
            {t ?? 'ALL'}
          </button>
        ))}

        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-2)' }}>
          {loading
            ? <span style={{ color: 'var(--blue)' }}>Loading...</span>
            : `${total} rows`}
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--red)' }}>
          ✗ {error} — check that the backend is running on port 8000
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Dir</th>
              <th>Ref Price</th>
              <th>Entry</th>
              <th>TP Level</th>
              <th>SL Level</th>
              <th>Exit Price</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Duration</th>
              <th>Result</th>
              <th>P&L (pts)</th>
            </tr>
          </thead>
          <tbody>
            {!loading && trades.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-2)', padding: 32 }}>
                  No rows match the current filters.
                </td>
              </tr>
            ) : trades.map((t, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--text-0)' }}>{t.date}</td>
                <td><DirBadge dir={t.direction} /></td>
                <td>{t.ref_price?.toFixed(2)   ?? '—'}</td>
                <td>{t.entry_price?.toFixed(2) ?? '—'}</td>
                <td style={{ color: 'var(--green-dim)' }}>
                  {t.direction === 'BUY'  ? t.buy_tp?.toFixed(2)
                   : t.direction === 'SELL' ? t.sell_tp?.toFixed(2) : '—'}
                </td>
                <td style={{ color: 'var(--red-dim)' }}>
                  {t.direction === 'BUY'  ? t.buy_sl?.toFixed(2)
                   : t.direction === 'SELL' ? t.sell_sl?.toFixed(2) : '—'}
                </td>
                <td>{t.exit_price?.toFixed(2)      ?? '—'}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 11 }}>{shortTime(t.entry_time)}</td>
                <td style={{ color: 'var(--text-2)', fontSize: 11 }}>{shortTime(t.exit_time)}</td>
                <td style={{ color: 'var(--text-2)' }}>
                  {t.duration_seconds != null ? `${t.duration_seconds.toFixed(0)}s` : '—'}
                </td>
                <td><Badge type={t.exit_type} /></td>
                <td style={pnlStyle(t.pnl_points)}>{fmt(t.pnl_points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <button
            className="btn"
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0 || loading}
          >← Prev</button>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
            Page {curPage} of {pages}
          </span>
          <button
            className="btn"
            onClick={() => setOffset(offset + LIMIT)}
            disabled={curPage >= pages || loading}
          >Next →</button>
        </div>
      )}

    </div>
  )
}
