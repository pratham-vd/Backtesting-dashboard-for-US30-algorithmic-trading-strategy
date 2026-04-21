import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Play, RefreshCw } from 'lucide-react'
import { api } from '../api'

export default function SettingsPage({ onRunComplete, fileInfo, setFileInfo, summary }) {
  const [drag,      setDrag]      = useState(false)
  const [uploading, setUploading] = useState(false)
  const [running,   setRunning]   = useState(false)
  const [logs,      setLogs]      = useState([])
  const [pips,      setPips]      = useState('20')
  const [tp,        setTp]        = useState('30')
  const [error,     setError]     = useState(null)
  const inputRef = useRef()

  const pipsNum = Math.max(1, parseInt(pips) || 0)
  const tpNum   = Math.max(1, parseInt(tp)   || 0)
  const beWR    = tpNum + pipsNum * 2 > 0
    ? ((tpNum / (tpNum + pipsNum * 2)) * 100).toFixed(1) : '—'

  const addLog = (msg, type = '') =>
    setLogs(prev => [...prev, { msg, type, id: Date.now() + Math.random() }])

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.parquet')) {
      setError('Only .parquet files are accepted.')
      return
    }
    setError(null)
    setUploading(true)
    addLog(`Uploading ${f.name}...`, 'info')
    try {
      const res = await api.upload(f)
      setFileInfo(res.meta)
      addLog(`✓ ${res.meta.trading_days} trading days loaded`, 'ok')
      addLog(`  ${res.meta.date_start} → ${res.meta.date_end}`, 'ok')
      addLog(`  ${res.meta.total_ticks.toLocaleString()} ticks`, 'ok')
    } catch (e) {
      setError(e.message)
      addLog(`✗ ${e.message}`, 'err')
    } finally {
      setUploading(false)
    }
  }

  const handleRun = async () => {
    if (!fileInfo) { setError('Upload a parquet file first.'); return }
    if (pipsNum < 1 || tpNum < 1) { setError('PIPS and TP must be > 0.'); return }
    setRunning(true)
    setError(null)
    addLog(`Running backtest  PIPS=${pipsNum}  TP=${tpNum}...`, 'info')
    try {
      const res = await api.run(pipsNum, tpNum)
      addLog(`✓ ${res.days_processed} days processed`, 'ok')
      const s = await api.summary()
      addLog(`✓ ${s.total_trades} trades  ·  WR ${s.win_rate.toFixed(1)}%  ·  P&L ${s.total_pnl >= 0 ? '+' : ''}${s.total_pnl.toFixed(1)} pts`, 'ok')
      onRunComplete(s, fileInfo)
    } catch (e) {
      setError(e.message)
      addLog(`✗ ${e.message}`, 'err')
    } finally {
      setRunning(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: 'none', borderBottom: '1px solid var(--border-hi)',
    color: 'var(--text-0)', fontFamily: 'var(--mono)',
    fontSize: 28, fontWeight: 600, padding: '8px 0 6px',
    outline: 'none', letterSpacing: '-0.5px',
  }

  return (
    <div className="page-body" style={{ maxWidth: 680 }}>

      {/* ── File section ───────────────────────────────── */}
      <div className="section-title">Data File</div>

      {fileInfo ? (
        /* File already loaded — show status card */
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <CheckCircle size={28} color="var(--green)" strokeWidth={1.5} />
              <div>
                <div style={{ color: 'var(--text-0)', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  {fileInfo.filename || 'us30_filtered.parquet'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.8 }}>
                  {fileInfo.trading_days} trading days
                  &nbsp;·&nbsp;
                  {fileInfo.date_start} → {fileInfo.date_end}
                  &nbsp;·&nbsp;
                  {fileInfo.total_ticks?.toLocaleString()} ticks
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => inputRef.current.click()}
              style={{ flexShrink: 0 }}
            >
              <RefreshCw size={11} /> Replace
            </button>
          </div>
          <input
            ref={inputRef} type="file" accept=".parquet"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {uploading && (
            <div className="progress-bar" style={{ marginTop: 14 }}>
              <div className="progress-fill" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      ) : (
        /* No file — show drop zone */
        <div
          className={`upload-zone ${drag ? 'drag-over' : ''}`}
          style={{ marginBottom: 20 }}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
        >
          <input
            ref={inputRef} type="file" accept=".parquet"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="upload-icon">
            {uploading ? <span className="loading-spinner" /> : <Upload size={34} strokeWidth={1.2} />}
          </div>
          <div className="upload-title">Drop your parquet file here</div>
          <div className="upload-sub">Click to browse  ·  .parquet only</div>
          {uploading && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 11 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* ── Strategy params ─────────────────────────────── */}
      <div className="section-title">Strategy Parameters</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '18px 22px 16px' }}>
          <div className="card-label" style={{ marginBottom: 10 }}>PIPS Distance</div>
          <input
            type="text" inputMode="numeric" value={pips}
            style={inputStyle}
            onChange={(e) => setPips(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setPips(String(Math.min(200, Math.max(1, parseInt(pips) || 20))))}
            onFocus={(e) => e.target.select()}
          />
          <div className="card-sub">Stop order distance from ref_price</div>
        </div>

        <div className="card" style={{ padding: '18px 22px 16px' }}>
          <div className="card-label" style={{ marginBottom: 10 }}>Take Profit</div>
          <input
            type="text" inputMode="numeric" value={tp}
            style={inputStyle}
            onChange={(e) => setTp(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => setTp(String(Math.min(500, Math.max(1, parseInt(tp) || 30))))}
            onFocus={(e) => e.target.select()}
          />
          <div className="card-sub">
            SL = <span style={{ color: 'var(--text-1)' }}>{pipsNum * 2} pts</span>
            &nbsp;·&nbsp;
            Breakeven = <span style={{ color: 'var(--yellow)' }}>{beWR}%</span>
          </div>
        </div>
      </div>

      {/* Levels preview */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 24,
        padding: '11px 16px',
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', fontSize: 10.5, color: 'var(--text-2)',
        flexWrap: 'wrap', alignItems: 'center'
      }}>
        <span>PIPS = <span style={{ color: 'var(--text-0)' }}>{pipsNum}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>TP = <span style={{ color: 'var(--green)' }}>+{tpNum} pts</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>SL = <span style={{ color: 'var(--red)' }}>-{pipsNum * 2} pts</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>RR = <span style={{ color: 'var(--text-0)' }}>{tpNum}:{pipsNum * 2}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>Breakeven = <span style={{ color: 'var(--yellow)' }}>{beWR}%</span></span>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleRun}
        disabled={running || !fileInfo}
        style={{ minWidth: 160 }}
      >
        {running
          ? <><span className="loading-spinner" /> Running...</>
          : <><Play size={13} /> {summary ? 'Re-run Backtest' : 'Run Backtest'}</>
        }
      </button>

      {/* Current results summary (if exists) */}
      {summary && (
        <>
          <div className="divider" />
          <div className="section-title">Current Results</div>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {[
                ['Win Rate',    `${summary.win_rate?.toFixed(1)}%`, summary.win_rate >= summary.breakeven_wr ? 'var(--green)' : 'var(--red)'],
                ['Total P&L',  `${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl?.toFixed(1)} pts`, summary.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'],
                ['Trades',     summary.total_trades, 'var(--text-0)'],
                ['Max DD',     `${summary.max_drawdown?.toFixed(1)} pts`, 'var(--red)'],
                ['Avg Win',    `+${summary.avg_win?.toFixed(1)} pts`, 'var(--green)'],
                ['Avg Loss',   `${summary.avg_loss?.toFixed(1)} pts`, 'var(--red)'],
              ].map(([k, v, c], i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderRight: i % 3 !== 2 ? '1px solid var(--border)' : 'none',
                  borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ fontSize: 9.5, color: 'var(--text-2)', letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' }}>{k}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Console */}
      {logs.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-title">Console</div>
          <div className="terminal-log">
            {logs.map(l => (
              <span key={l.id} className={`log-line log-${l.type}`}>{`> ${l.msg}\n`}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
