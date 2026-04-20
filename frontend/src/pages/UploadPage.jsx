import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Play } from 'lucide-react'
import { api } from '../api'

export default function UploadPage({ onRunComplete }) {
  const [drag,      setDrag]      = useState(false)
  const [file,      setFile]      = useState(null)
  const [meta,      setMeta]      = useState(null)
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
    ? ((tpNum / (tpNum + pipsNum * 2)) * 100).toFixed(1)
    : '—'

  const addLog = (msg, type = '') =>
    setLogs(prev => [...prev, { msg, type, id: Date.now() + Math.random() }])

  const handleFile = async (f) => {
    if (!f || !f.name.endsWith('.parquet')) {
      setError('Only .parquet files are accepted.')
      return
    }
    setError(null)
    setFile(f)
    setMeta(null)
    setUploading(true)
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
      const res = await api.run(pipsNum, tpNum)
      addLog(`✓ Done — ${res.days_processed} days processed`, 'ok')
      addLog('Fetching results...', 'info')
      const summary = await api.summary()
      addLog(`✓ Complete — ${summary.total_trades} trades found`, 'ok')
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
    <div className="page-body" style={{ maxWidth: 700 }}>
      <div className="section-title" style={{ marginBottom: 24 }}>Data Input</div>

      <div
        className={`upload-zone ${drag ? 'drag-over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
      >
        <input ref={inputRef} type="file" accept=".parquet" onChange={(e) => handleFile(e.target.files[0])} />
        <div className="upload-icon">
          {meta ? <CheckCircle size={36} color="var(--green)" /> : <Upload size={36} />}
        </div>
        <div className="upload-title">
          {meta ? file.name : 'Drop your parquet file here'}
        </div>
        <div className="upload-sub">
          {meta
            ? `${meta.trading_days} days  ·  ${meta.date_start} → ${meta.date_end}`
            : 'Click to browse or drag & drop  ·  .parquet only'}
        </div>
        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {meta && (
        <>
          <div className="divider" />
          <div className="section-title">Strategy Parameters</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card" style={{ padding: '18px 20px 16px' }}>
              <div className="card-label" style={{ marginBottom: 12 }}>PIPS Distance (points)</div>
              <input
                type="text"
                inputMode="numeric"
                value={pips}
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
                type="text"
                inputMode="numeric"
                value={tp}
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

          {/* Levels preview bar */}
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
          </div>

          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            {running
              ? <><span className="loading-spinner" /> Running...</>
              : <><Play size={14} /> Run Backtest</>
            }
          </button>
        </>
      )}

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
