import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts'

const fmt  = (n, d = 1) => (n >= 0 ? '+' : '') + Number(n).toFixed(d)
const pClr = (v) => v >= 0 ? 'var(--green)' : 'var(--red)'

/* ── Tooltip components ───────────────────────────────────── */
const TT = ({ style, children }) => (
  <div style={{
    background: 'var(--bg-2)', border: '1px solid var(--border-hi)',
    padding: '10px 14px', borderRadius: 3,
    fontFamily: 'var(--mono)', fontSize: 10.5, lineHeight: 1.8,
    ...style
  }}>{children}</div>
)

const EqTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TT>
      <div style={{ color: 'var(--text-2)', marginBottom: 2 }}>{d.date}</div>
      <div style={{ color: pClr(d.cumulative_pnl) }}>Cumulative: {fmt(d.cumulative_pnl)} pts</div>
      <div style={{ color: pClr(d.pnl_points) }}>Trade: {fmt(d.pnl_points)} pts ({d.exit_type})</div>
    </TT>
  )
}

const MonthTT = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT><div style={{ color: 'var(--text-2)' }}>{d.month}</div><div style={{ color: pClr(d.pnl) }}>{fmt(d.pnl)} pts</div></TT>
}

const DdTT = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return <TT><div style={{ color: 'var(--text-2)' }}>{d.date}</div><div style={{ color: 'var(--red)' }}>{fmt(d.drawdown)} pts</div></TT>
}

const axTick = { fill: 'var(--text-2)', fontSize: 9.5, fontFamily: 'var(--mono)' }

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({ label, value, sub, color }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color: color || 'var(--text-0)' }}>{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  )
}

/* ── Metric row ───────────────────────────────────────────── */
function MRow({ k, v, c }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
      <span style={{ color: 'var(--text-2)' }}>{k}</span>
      <span style={{ color: c || 'var(--text-1)', fontWeight: 500 }}>{v}</span>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
export default function DashboardPage({ summary }) {
  const [tab, setTab] = useState('performance')

  if (!summary) return (
    <div className="page-body" style={{ color: 'var(--text-2)' }}>
      No results yet. Go to Settings, upload a file and run the backtest.
    </div>
  )

  const {
    total_trades, wins, losses, win_rate, breakeven_wr,
    total_pnl, avg_win, avg_loss, best_trade, worst_trade,
    max_drawdown, max_loss_streak, avg_duration_s,
    buy_trades, sell_trades, buy_win_rate, sell_win_rate,
    no_data_days, no_trade_days, timeout_trades, total_days,
    equity_curve, monthly_pnl, timeout_stats, config: cfg
  } = summary

  const edge = win_rate - breakeven_wr
  const pf   = avg_loss < 0 ? (avg_win / Math.abs(avg_loss)).toFixed(2) : '∞'

  // Drawdown series
  const drawdownData = []
  let peak = 0, cum = 0
  equity_curve.forEach(e => {
    cum += e.pnl_points
    if (cum > peak) peak = cum
    drawdownData.push({ date: e.date, drawdown: cum - peak })
  })

  // P&L histogram
  const pnls = equity_curve.map(e => e.pnl_points).filter(v => v != null)
  let histogram = []
  if (pnls.length > 0) {
    const hmin = Math.floor(Math.min(...pnls) / 5) * 5
    const hmax = Math.ceil(Math.max(...pnls) / 5) * 5
    const buckets = {}
    for (let b = hmin; b <= hmax; b += 5) buckets[b] = 0
    pnls.forEach(v => { const b = Math.floor(v / 5) * 5; if (buckets[b] !== undefined) buckets[b]++ })
    histogram = Object.entries(buckets).map(([b, count]) => ({ bucket: Number(b), label: `${b >= 0 ? '+' : ''}${b}`, count }))
  }

  return (
    <div className="page-body">

      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="stat-grid">
        <StatCard
          label="Win Rate"
          value={`${win_rate.toFixed(1)}%`}
          sub={`Breakeven ${breakeven_wr}%  ·  Edge ${edge >= 0 ? '+' : ''}${edge.toFixed(1)}%`}
          color={win_rate >= breakeven_wr ? 'var(--green)' : 'var(--red)'}
        />
        <StatCard
          label="Total P&L"
          value={`${fmt(total_pnl)} pts`}
          sub={`${wins}W / ${losses}L  ·  ${total_trades} trades`}
          color={pClr(total_pnl)}
        />
        <StatCard
          label="Max Drawdown"
          value={`${fmt(max_drawdown)} pts`}
          sub={`Streak: ${max_loss_streak}L  ·  PF: ${pf}`}
          color="var(--red)"
        />
        <StatCard
          label="Avg Duration"
          value={`${avg_duration_s?.toFixed(0)}s`}
          sub={`${no_trade_days} no-trades  ·  ${timeout_trades} timeouts`}
        />
      </div>

      {/* ── Equity curve (big, full width, gradient fill) ── */}
      <div className="section-title">Equity Curve</div>
      <div className="card" style={{ marginBottom: 28, padding: '24px 12px 16px' }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={equity_curve} margin={{ left: 12, right: 24, top: 8 }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={axTick} tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={axTick} tickLine={false} axisLine={false}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
              width={58}
            />
            <Tooltip content={<EqTooltip />} />
            <ReferenceLine y={0} stroke="var(--border-hi)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="cumulative_pnl"
              stroke="var(--green)"
              strokeWidth={1.8}
              fill="url(#eqGrad)"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--green)', stroke: 'var(--bg-0)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="tab-row">
        {[
          ['performance', 'Performance'],
          ['risk',        'Risk & Distribution'],
          ['breakdown',   'Trade Breakdown'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >{label}</button>
        ))}
      </div>

      {/* ══ Tab: Performance ════════════════════════════ */}
      {tab === 'performance' && (
        <div className="two-col">

          {/* Monthly P&L */}
          <div>
            <div className="section-title">Monthly P&L</div>
            <div className="card" style={{ padding: '20px 10px 12px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly_pnl} margin={{ left: 0, right: 10 }}>
                  <XAxis dataKey="month" tick={axTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={axTick} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<MonthTT />} />
                  <ReferenceLine y={0} stroke="var(--border-hi)" />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {monthly_pnl.map((e, i) => (
                      <Cell key={i}
                        fill={e.pnl >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'}
                        stroke={e.pnl >= 0 ? 'var(--green)' : 'var(--red)'} strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BUY vs SELL */}
          <div>
            <div className="section-title">BUY vs SELL Win Rate</div>
            <div className="card" style={{ padding: '20px 10px 12px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'BUY',  wr: buy_win_rate,  n: buy_trades },
                    { name: 'SELL', wr: sell_win_rate, n: sell_trades },
                    { name: 'ALL',  wr: win_rate,      n: total_trades },
                  ]}
                  margin={{ left: 0, right: 10 }}
                >
                  <XAxis dataKey="name" tick={axTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis domain={[0, 100]} tick={axTick} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}%`} width={40} />
                  <Tooltip
                    formatter={(v, _, p) => [`${v.toFixed(1)}%  (${p.payload.n} trades)`, 'Win Rate']}
                    contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', fontFamily: 'var(--mono)', fontSize: 10.5 }}
                  />
                  <ReferenceLine y={breakeven_wr} stroke="var(--yellow)" strokeDasharray="4 4" />
                  <Bar dataKey="wr" radius={[3, 3, 0, 0]}>
                    {[buy_win_rate, sell_win_rate, win_rate].map((v, i) => (
                      <Cell key={i}
                        fill={v >= breakeven_wr ? 'var(--green-dim)' : 'var(--red-dim)'}
                        stroke={v >= breakeven_wr ? 'var(--green)' : 'var(--red)'} strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 9.5, color: 'var(--text-2)', textAlign: 'center', marginTop: 6 }}>
                Yellow dashed = breakeven {breakeven_wr}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Tab: Risk ═══════════════════════════════════ */}
      {tab === 'risk' && (
        <>
          <div className="two-col">

            {/* Risk metrics */}
            <div>
              <div className="section-title">Risk Metrics</div>
              <div className="card">
                {[
                  ['Profit Factor',    pf,                                     Number(pf) >= 1 ? 'var(--green)' : 'var(--red)'],
                  ['Avg Win',          `${fmt(avg_win)} pts`,                  'var(--green)'],
                  ['Avg Loss',         `${fmt(avg_loss)} pts`,                 'var(--red)'],
                  ['RR Ratio',         `${cfg.tp_pips} : ${cfg.sl_pips}`,      'var(--text-1)'],
                  ['Max Drawdown',     `${fmt(max_drawdown)} pts`,              'var(--red)'],
                  ['Max Loss Streak',  `${max_loss_streak} trades`,             max_loss_streak >= 5 ? 'var(--red)' : 'var(--yellow)'],
                  ['Best Trade',       `${fmt(best_trade)} pts`,                'var(--green)'],
                  ['Worst Trade',      `${fmt(worst_trade)} pts`,               'var(--red)'],
                  ['Avg Duration',     `${avg_duration_s?.toFixed(0)}s`,        'var(--text-1)'],
                  ['Timeouts',         timeout_trades,                           timeout_trades > 5 ? 'var(--yellow)' : 'var(--text-1)'],
                ].map(([k, v, c], i) => <MRow key={i} k={k} v={v} c={c} />)}

                {timeout_stats?.count > 0 && (
                  <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,213,79,0.05)', border: '1px solid rgba(255,213,79,0.18)', borderRadius: 3, fontSize: 10.5 }}>
                    <div style={{ color: 'var(--yellow)', marginBottom: 4, fontWeight: 600 }}>⚠ Timeout Analysis</div>
                    <div style={{ color: 'var(--text-2)', lineHeight: 2 }}>
                      {timeout_stats.count} trades timed out at 20:04 IST<br />
                      Avg P&L: <span style={{ color: pClr(timeout_stats.avg_pnl) }}>{fmt(timeout_stats.avg_pnl)} pts</span>
                      &nbsp;·&nbsp;Range: {fmt(timeout_stats.min_pnl)} → {fmt(timeout_stats.max_pnl)} pts
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* P&L histogram */}
            <div>
              <div className="section-title">P&L Distribution</div>
              <div className="card" style={{ padding: '20px 10px 12px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={histogram} margin={{ left: 0, right: 10 }}>
                    <XAxis dataKey="label" tick={axTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                    <YAxis tick={axTick} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-hi)', fontFamily: 'var(--mono)', fontSize: 10.5 }} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {histogram.map((e, i) => (
                        <Cell key={i}
                          fill={e.bucket >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'}
                          stroke={e.bucket >= 0 ? 'var(--green)' : 'var(--red)'} strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Drawdown chart full width */}
          <div className="section-title">Drawdown Over Time</div>
          <div className="card" style={{ padding: '20px 12px 12px' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={drawdownData} margin={{ left: 12, right: 24 }}>
                <XAxis dataKey="date" tick={axTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" />
                <YAxis tick={axTick} tickLine={false} axisLine={false} width={55} />
                <Tooltip content={<DdTT />} />
                <ReferenceLine y={0} stroke="var(--border-hi)" />
                <Bar dataKey="drawdown" fill="var(--red-dim)" stroke="var(--red)" strokeWidth={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ══ Tab: Trade Breakdown ═══════════════════════ */}
      {tab === 'breakdown' && (
        <div className="two-col">
          <div>
            <div className="section-title">Day Summary</div>
            <div className="card">
              {[
                ['Total Days',    total_days,     'var(--text-0)'],
                ['No Data',       no_data_days,   'var(--text-2)'],
                ['No Trade',      no_trade_days,  'var(--text-2)'],
                ['Timeouts',      timeout_trades, 'var(--yellow)'],
                ['Completed',     total_trades,   'var(--text-0)'],
              ].map(([k, v, c], i) => <MRow key={i} k={k} v={v} c={c} />)}
            </div>
          </div>

          <div>
            <div className="section-title">Direction Split</div>
            <div className="card">
              {[
                ['BUY trades',  `${buy_trades}`,   'var(--blue)'],
                ['BUY win rate',`${buy_win_rate.toFixed(1)}%`, buy_win_rate >= breakeven_wr ? 'var(--green)' : 'var(--red)'],
                ['SELL trades', `${sell_trades}`,  'var(--purple)'],
                ['SELL win rate',`${sell_win_rate.toFixed(1)}%`, sell_win_rate >= breakeven_wr ? 'var(--green)' : 'var(--red)'],
                ['Wins (TP)',   wins,               'var(--green)'],
                ['Losses (SL)', losses,             'var(--red)'],
                ['Avg Win',    `${fmt(avg_win)} pts`, 'var(--green)'],
                ['Avg Loss',   `${fmt(avg_loss)} pts`,'var(--red)'],
              ].map(([k, v, c], i) => <MRow key={i} k={k} v={v} c={c} />)}
            </div>
          </div>
        </div>
      )}

      {/* Config footer */}
      <div style={{ marginTop: 20, display: 'flex', gap: 16, fontSize: 9.5, color: 'var(--text-2)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ letterSpacing: 1 }}>CONFIG</span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>PIPS = <span style={{ color: 'var(--text-1)' }}>{cfg.pips_distance}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>TP = <span style={{ color: 'var(--text-1)' }}>{cfg.tp_pips}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>SL = <span style={{ color: 'var(--text-1)' }}>{cfg.sl_pips}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>RR = <span style={{ color: 'var(--text-1)' }}>{cfg.tp_pips}:{cfg.sl_pips}</span></span>
        <span style={{ color: 'var(--border-hi)' }}>│</span>
        <span>Breakeven = <span style={{ color: 'var(--yellow)' }}>{breakeven_wr}%</span></span>
      </div>
    </div>
  )
}
