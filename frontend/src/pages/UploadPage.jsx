import { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Play, RefreshCw } from 'lucide-react'
import { api } from '../api'

export default function UploadPage({
  onRunComplete,
  meta, setMeta,
  pips, setPips,
  tp,   setTp,
  targetTime,   setTargetTime,
  offsetSecs,   setOffsetSecs,
  hasPreviousResults
}) {
  const [drag,      setDrag]      = useState(false)
  const [uploading, setUploading] = useState(false)
  const [running,   setRunning]   = useState(false)
  const [logs,      setLogs]      = useState([])
  const [error,     setError]     = useState(null)
  const inputRef = useRef()

  const pipsNum   = Math.max(1, parseInt(pips) || 0)
  const tpNum     = Math.max(1, parseInt(tp)   || 0)
  const offsetNum = Math.max(0, parseInt(offsetSecs) || 0)
  const beWR      = tpNum + pipsNum * 2 > 0
    ? ((tpNum / (tpNum + pipsNum * 2)) * 100).toFixed(1)
    : '—'

  // Compute ref capture time for display
  const computedRefTime = (() => {
    const [hh, mm] = (targetTime || '20:00').split(':').map(Number)
    const totalSecs = hh * 3600 + mm * 60 - offsetNum
    const rh = Math.floor(totalSecs / 3600)
    const rm = Math.floor((totalSecs % 3600) / 60)
    const rs = totalSecs % 60
    return `${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')}:${String(rs).padStart(2,'0')}`
  })()

  // Parse target for api
  const [targetHourNum, targetMinuteNum] = (targetTime || '20:00').split(':').map(Number)

  const addLog = (msg, type = '') =>
    setLogs(prev => [...prev, { msg, type, id: Date.now() + Math.random() }])

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.parquet')) {
      setError('Only .parquet files are accepted.')
      return
    }
    setError(null)
    setMeta(null)
    setUploading(true)
    setLogs([])
    addLog(`Uploading ${f.name}...`, 'info')
    try {
      const res = await api.upload(f)
      setMeta(res.meta)
      addLog(`✓ File accepted — ${res.meta.trading_days} trading days loaded`, 'ok')
      addLog(`  Range: ${res.meta.date_start} → ${res.meta.date_end}`, 'ok')
      addLog(`  Total ticks: ${res.meta.total_ticks.toLocaleString()}`, 'ok')
    } catch (e) {
      setError(e.message)
      addLog(`✗ ${e.message}`, 'err')
    } finally {
      setUploading(false)
    }
  }

  const handleRun = async () => {
    if (pipsNum < 1 || tpNum < 1) {
      setError('PIPS and TP values must be greater than 0.')
      return
    }
    setRunning(true)
    setError(null)
    addLog(`Running backtest  PIPS=${pipsNum}  TP=${tpNum}...`, 'info')
    try {
      const res = await api.run(pipsNum, tpNum, targetHourNum, targetMinuteNum, offsetNum)
      addLog(`✓ Done — ${res.days_processed} days processed`, 'ok')
      addLog('Fetching results...', 'info')
      const summary = await api.summary()
      addLog(`✓ Complete — ${summary.total_trades} trades  ·  WR ${summary.win_rate.toFixed(1)}%  ·  ${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl.toFixed(1)} pts`, 'ok')
      onRunComplete(summary)
    } catch (e) {
      setError(e.message)
      addLog(`✗ ${e.message}`, 'err')
    } finally {
      setRunning(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border-hi)',
    color: 'var(--text-0)',
    fontFamily: 'var(--mono)',
    fontSize: 26,
    fontWeight: 600,
    padding: '8px 0 6px',
    outline: 'none',
    letterSpacing: '-0.5px',
  }

  return (
    <div className="page-body" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="section-title" style={{ marginBottom: 24 }}>Data File</div>

      {/* ── File zone ── */}
      {meta ? (
        /* File loaded — show status card */
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CheckCircle size={30} color="var(--green)" strokeWidth={1.5} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', marginBottom: 5 }}>
                {meta.filename || 'us30_filtered.parquet'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.9 }}>
                {meta.trading_days} trading days
                &nbsp;·&nbsp;
                {meta.date_start} → {meta.date_end}
                &nbsp;·&nbsp;
                {meta.total_ticks?.toLocaleString()} ticks
              </div>
            </div>
            <button
              onClick={() => inputRef.current.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', fontSize: 10,
                background: 'var(--bg-2)', border: '1px solid var(--border-hi)',
                color: 'var(--text-1)', fontFamily: 'var(--mono)',
                cursor: 'pointer', borderRadius: 'var(--radius)',
                letterSpacing: '0.5px', flexShrink: 0,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--green)'; e.target.style.color = 'var(--green)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border-hi)'; e.target.style.color = 'var(--text-1)' }}
            >
              <RefreshCw size={11} /> Replace
            </button>
          </div>
          <input
            ref={inputRef} type="file" accept=".parquet"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          {uploading && (
            <div className="progress-bar" style={{ marginTop: 14 }}>
              <div className="progress-fill" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      ) : (
        /* No file — drop zone */
        <div
          className={`upload-zone ${drag ? 'drag-over' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
        >
          <input ref={inputRef} type="file" accept=".parquet"
            onChange={(e) => handleFile(e.target.files[0])} />
          <div className="upload-icon">
            {uploading ? <span className="loading-spinner" /> : <Upload size={36} />}
          </div>
          <div className="upload-title">
            {uploading ? 'Uploading...' : 'Drop your parquet file here'}
          </div>
          <div className="upload-sub">
            Click to browse or drag & drop  ·  .parquet only
          </div>
          {uploading && (
            <div style={{ marginTop: 16 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Params section — always visible once file loaded ── */}
      {meta && (
        <>
          <div className="divider" />
          <div className="section-title">Strategy Parameters</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card" style={{ padding: '18px 20px 16px' }}>
              <div className="card-label" style={{ marginBottom: 12 }}>PIPS Distance (points)</div>
              <input
                type="text" inputMode="numeric" value={pips}
                style={inputStyle}
                onChange={(e) => setPips(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => setPips(String(Math.min(200, Math.max(1, parseInt(pips) || 20))))}
                onFocus={(e) => e.target.select()}
              />
              <div className="card-sub" style={{ marginTop: 10 }}>Stop order distance from ref_price</div>
            </div>

            <div className="card" style={{ padding: '18px 20px 16px' }}>
              <div className="card-label" style={{ marginBottom: 12 }}>TP Distance (points)</div>
              <input
                type="text" inputMode="numeric" value={tp}
                style={inputStyle}
                onChange={(e) => setTp(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => setTp(String(Math.min(500, Math.max(1, parseInt(tp) || 30))))}
                onFocus={(e) => e.target.select()}
              />
              <div className="card-sub" style={{ marginTop: 10 }}>
                SL = <span style={{ color: 'var(--text-1)' }}>{pipsNum * 2}</span> pts
                {'  ·  '}
                Breakeven WR = <span style={{ color: 'var(--text-1)' }}>{beWR}%</span>
              </div>
            </div>
          </div>

          {/* ── Timing parameters ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* Target time */}
            <div className="card" style={{ padding: '18px 20px 16px' }}>
              <div className="card-label" style={{ marginBottom: 12 }}>Entry Time (IST)</div>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                style={{
                  width: '100%', background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-hi)',
                  color: 'var(--text-0)', fontFamily: 'var(--mono)',
                  fontSize: 26, fontWeight: 600,
                  padding: '8px 0 6px', outline: 'none',
                  colorScheme: 'dark',
                }}
              />
              <div className="card-sub" style={{ marginTop: 10 }}>
                Time at which stop orders are placed (IST)
              </div>
            </div>

            {/* Offset seconds */}
            <div className="card" style={{ padding: '18px 20px 16px' }}>
              <div className="card-label" style={{ marginBottom: 12 }}>Seconds Before Entry</div>
              <input
                type="text"
                inputMode="numeric"
                value={offsetSecs}
                onChange={(e) => setOffsetSecs(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => setOffsetSecs(String(Math.min(300, Math.max(0, parseInt(offsetSecs) || 15))))}
                onFocus={(e) => e.target.select()}
                style={{
                  width: '100%', background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-hi)',
                  color: 'var(--text-0)', fontFamily: 'var(--mono)',
                  fontSize: 26, fontWeight: 600,
                  padding: '8px 0 6px', outline: 'none', letterSpacing: '-0.5px',
                }}
              />
              <div className="card-sub" style={{ marginTop: 10 }}>
                Ref captured at&nbsp;
                <span style={{ color: 'var(--green)' }}>{computedRefTime}</span>
                &nbsp;IST
              </div>
            </div>
          </div>

          {/* Levels preview */}
          <div style={{
            display: 'flex', gap: 20, marginBottom: 24,
            padding: '11px 16px',
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text-2)',
            flexWrap: 'wrap'
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
            <span style={{ color: 'var(--border-hi)' }}>│</span>
            <span>Ref at <span style={{ color: 'var(--text-0)' }}>{computedRefTime}</span></span>
            <span style={{ color: 'var(--border-hi)' }}>│</span>
            <span>Entry <span style={{ color: 'var(--text-0)' }}>{targetTime}</span> IST</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={handleRun} disabled={running}>
              {running
                ? <><span className="loading-spinner" /> Running...</>
                : <><Play size={14} /> {hasPreviousResults ? 'Re-run Backtest' : 'Run Backtest'}</>
              }
            </button>
            {hasPreviousResults && !running && (
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                Changing params and re-running will replace existing results
              </span>
            )}
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
