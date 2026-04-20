import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

const fmt = (n, d = 1) => (n >= 0 ? '+' : '') + Number(n).toFixed(d)
const pnlColor = (v) => v >= 0 ? 'var(--green)' : 'var(--red)'

export default function AnalyticsPage({ summary }) {
  if (!summary) return <div className="page-body" style={{ color: 'var(--text-2)' }}>No results yet. Run the backtest first.</div>

  const {
    equity_curve, win_rate, breakeven_wr, buy_win_rate, sell_win_rate,
    buy_trades, sell_trades, wins, losses, timeout_trades, no_trade_days,
    total_trades, avg_win, avg_loss, max_drawdown, max_loss_streak,
    timeout_stats, config: cfg
  } = summary

  // P&L histogram
  const pnls = equity_curve.map(e => e.pnl_points).filter(v => v != null)
  let histogram = []
  if (pnls.length > 0) {
    const min = Math.floor(Math.min(...pnls) / 5) * 5
    const max = Math.ceil(Math.max(...pnls) / 5) * 5
    const buckets = {}
    for (let b = min; b <= max; b += 5) buckets[b] = 0
    pnls.forEach(v => { const b = Math.floor(v / 5) * 5; if (buckets[b] !== undefined) buckets[b]++ })
    histogram = Object.entries(buckets).map(([b, count]) => ({ bucket: Number(b), label: `${b >= 0 ? '+' : ''}${b}`, count }))
  }

  // Drawdown series
  const drawdownData = []
  let peak = 0, cum = 0
  equity_curve.forEach(e => {
    cum += e.pnl_points
    if (cum > peak) peak = cum
    drawdownData.push({ date: e.date, drawdown: cum - peak })
  })

  const HistTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', padding: '8px 12px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-2)' }}>{d.label} pts</div>
      <div style={{ color: 'var(--text-0)' }}>{d.count} trades</div>
    </div>
  }

  const DdTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', padding: '8px 12px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-2)' }}>{d.date}</div>
      <div style={{ color: 'var(--red)' }}>{fmt(d.drawdown)} pts</div>
    </div>
  }

  const profitFactor = avg_loss < 0 ? (avg_win / Math.abs(avg_loss)).toFixed(2) : '∞'

  return (
    <div className="page-body">
      <div className="two-col">
        <div>
          <div className="section-title">BUY vs SELL Win Rate</div>
          <div className="card" style={{ padding: '20px 10px 10px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                { name: 'BUY',      wr: buy_win_rate,  count: buy_trades },
                { name: 'SELL',     wr: sell_win_rate, count: sell_trades },
                { name: 'COMBINED', wr: win_rate,      count: total_trades },
              ]} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={40} />
                <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', fontFamily: 'var(--mono)', fontSize: 11 }} />
                <ReferenceLine y={breakeven_wr} stroke="var(--yellow)" strokeDasharray="4 4" />
                <Bar dataKey="wr" radius={[3, 3, 0, 0]}>
                  {[buy_win_rate, sell_win_rate, win_rate].map((v, i) => (
                    <Cell key={i} fill={v >= breakeven_wr ? 'var(--green-dim)' : 'var(--red-dim)'} stroke={v >= breakeven_wr ? 'var(--green)' : 'var(--red)'} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 10, color: 'var(--text-2)', textAlign: 'center', marginTop: 4 }}>Yellow = breakeven {breakeven_wr}%</div>
          </div>
        </div>

        <div>
          <div className="section-title">Risk Metrics</div>
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Profit Factor',   profitFactor,                                    Number(profitFactor) >= 1 ? 'var(--green)' : 'var(--red)'],
                  ['Avg Win',         `${fmt(avg_win)} pts`,                            'var(--green)'],
                  ['Avg Loss',        `${fmt(avg_loss)} pts`,                           'var(--red)'],
                  ['RR Ratio',        `${cfg.tp_pips} : ${cfg.sl_pips}`,               'var(--text-1)'],
                  ['Max Drawdown',    `${fmt(max_drawdown)} pts`,                       'var(--red)'],
                  ['Max Loss Streak', `${max_loss_streak} trades`,                      max_loss_streak >= 5 ? 'var(--red)' : 'var(--yellow)'],
                  ['Timeouts',        timeout_trades,                                   timeout_trades > 5 ? 'var(--yellow)' : 'var(--text-1)'],
                  ['No Trade Days',   no_trade_days,                                   'var(--text-2)'],
                  ['Win / Loss',      `${wins} W  /  ${losses} L`,                     'var(--text-1)'],
                ].map(([k, v, c], i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 0', fontSize: 11, color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>{k}</td>
                    <td style={{ padding: '6px 0', fontSize: 11, color: c, textAlign: 'right', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timeout_stats?.count > 0 && (
              <div style={{ marginTop: 14, padding: 10, background: 'rgba(255,213,79,0.05)', border: '1px solid rgba(255,213,79,0.2)', borderRadius: 3, fontSize: 11 }}>
                <div style={{ color: 'var(--yellow)', marginBottom: 4 }}>⚠ Timeout Analysis</div>
                <div style={{ color: 'var(--text-2)', lineHeight: 1.8 }}>
                  {timeout_stats.count} trades timed out at 20:04 IST<br />
                  Avg P&L: <span style={{ color: pnlColor(timeout_stats.avg_pnl) }}>{fmt(timeout_stats.avg_pnl)} pts</span><br />
                  Range: {fmt(timeout_stats.min_pnl)} → {fmt(timeout_stats.max_pnl)} pts
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-title">P&L Distribution</div>
      <div className="card" style={{ marginBottom: 20, padding: '20px 10px 10px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={histogram} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="label" tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<HistTooltip />} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {histogram.map((e, i) => (
                <Cell key={i} fill={e.bucket >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'} stroke={e.bucket >= 0 ? 'var(--green)' : 'var(--red)'} strokeWidth={1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-title">Drawdown Over Time</div>
      <div className="card" style={{ padding: '20px 10px 10px' }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={drawdownData} margin={{ left: 10, right: 20 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} width={50} />
            <Tooltip content={<DdTooltip />} />
            <ReferenceLine y={0} stroke="var(--border-hi)" />
            <Bar dataKey="drawdown" fill="var(--red-dim)" stroke="var(--red)" strokeWidth={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
