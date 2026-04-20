import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'

const fmt = (n, d = 1) => (n >= 0 ? '+' : '') + Number(n).toFixed(d)
const pnlColor = (v) => v >= 0 ? 'var(--green)' : 'var(--red)'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color: color || 'var(--text-0)' }}>{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  )
}

const EqTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', padding: '10px 14px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-2)', marginBottom: 4 }}>{d.date}</div>
      <div style={{ color: pnlColor(d.cumulative_pnl) }}>Cumulative: {fmt(d.cumulative_pnl)} pts</div>
      <div style={{ color: pnlColor(d.pnl_points), marginTop: 2 }}>Trade: {fmt(d.pnl_points)} pts ({d.exit_type})</div>
    </div>
  )
}

const MonthTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', padding: '10px 14px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11 }}>
      <div style={{ color: 'var(--text-2)' }}>{d.month}</div>
      <div style={{ color: pnlColor(d.pnl) }}>{fmt(d.pnl)} pts</div>
    </div>
  )
}

export default function DashboardPage({ summary }) {
  if (!summary) return (
    <div className="page-body" style={{ color: 'var(--text-2)' }}>
      No results yet. Upload a parquet file and run the backtest first.
    </div>
  )

  const {
    period, total_trades, wins, losses, win_rate, breakeven_wr,
    total_pnl, avg_win, avg_loss, best_trade, worst_trade,
    max_drawdown, max_loss_streak, avg_duration_s,
    buy_trades, sell_trades, buy_win_rate, sell_win_rate,
    no_data_days, no_trade_days, timeout_trades, total_days,
    equity_curve, monthly_pnl, config: cfg
  } = summary

  const edge = win_rate - breakeven_wr

  return (
    <div className="page-body">
      <div className="stat-grid">
        <StatCard label="Win Rate"     value={`${win_rate.toFixed(1)}%`}  sub={`Breakeven: ${breakeven_wr}%  ·  Edge: ${edge >= 0 ? '+' : ''}${edge.toFixed(1)}%`} color={win_rate >= breakeven_wr ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Total P&L"    value={`${fmt(total_pnl)} pts`}    sub={`${total_trades} completed trades`} color={pnlColor(total_pnl)} />
        <StatCard label="Max Drawdown" value={`${fmt(max_drawdown)} pts`} sub={`Max loss streak: ${max_loss_streak}`} color="var(--red)" />
        <StatCard label="Avg Duration" value={`${avg_duration_s.toFixed(0)}s`} sub={`${period.start} → ${period.end}`} />
      </div>

      <div className="section-title">Equity Curve</div>
      <div className="card" style={{ marginBottom: 20, padding: '20px 10px 10px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={equity_curve} margin={{ left: 10, right: 20, top: 5 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} width={55} />
            <Tooltip content={<EqTooltip />} />
            <ReferenceLine y={0} stroke="var(--border-hi)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="cumulative_pnl" stroke="var(--green)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: 'var(--green)', stroke: 'none' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col">
        <div>
          <div className="section-title">Monthly P&L</div>
          <div className="card" style={{ padding: '20px 10px 10px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly_pnl} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<MonthTooltip />} />
                <ReferenceLine y={0} stroke="var(--border-hi)" />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {monthly_pnl.map((e, i) => (
                    <Cell key={i} fill={e.pnl >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'} stroke={e.pnl >= 0 ? 'var(--green)' : 'var(--red)'} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="section-title">Trade Breakdown</div>
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Total Days',   total_days,   ''],
                  ['No Data',      no_data_days,  'var(--text-2)'],
                  ['No Trade',     no_trade_days, 'var(--text-2)'],
                  ['Timeouts',     timeout_trades,'var(--yellow)'],
                  ['Completed',    total_trades,  'var(--text-0)'],
                  ['─', '', ''],
                  ['Wins (TP)',    wins,   'var(--green)'],
                  ['Losses (SL)', losses, 'var(--red)'],
                  ['─', '', ''],
                  ['BUY trades',  `${buy_trades}  ·  WR ${buy_win_rate.toFixed(1)}%`,  'var(--blue)'],
                  ['SELL trades', `${sell_trades}  ·  WR ${sell_win_rate.toFixed(1)}%`,'var(--purple)'],
                  ['─', '', ''],
                  ['Avg Win',    `${fmt(avg_win)} pts`,    'var(--green)'],
                  ['Avg Loss',   `${fmt(avg_loss)} pts`,   'var(--red)'],
                  ['Best Trade', `${fmt(best_trade)} pts`, 'var(--green)'],
                  ['Worst Trade',`${fmt(worst_trade)} pts`,'var(--red)'],
                ].map(([k, v, c], i) => k === '─'
                  ? <tr key={i}><td colSpan={2} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }} /></tr>
                  : <tr key={i}>
                      <td style={{ padding: '5px 0', fontSize: 11, color: 'var(--text-2)', borderBottom: 'none' }}>{k}</td>
                      <td style={{ padding: '5px 0', fontSize: 11, color: c || 'var(--text-1)', textAlign: 'right', fontWeight: 500, borderBottom: 'none' }}>{v}</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-2)', alignItems: 'center', marginTop: 4 }}>
        <span>CONFIG</span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>PIPS = <span style={{ color: 'var(--text-1)' }}>{cfg.pips_distance}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>TP = <span style={{ color: 'var(--text-1)' }}>{cfg.tp_pips}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>SL = <span style={{ color: 'var(--text-1)' }}>{cfg.sl_pips}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>RR = <span style={{ color: 'var(--text-1)' }}>{cfg.tp_pips}:{cfg.sl_pips}</span></span>
      </div>
    </div>
  )
}
