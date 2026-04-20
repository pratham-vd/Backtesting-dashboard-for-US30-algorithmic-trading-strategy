# ─────────────────────────────────────────────────────────────
#  report.py  —  Generate summary stats + save trade_log.csv
# ─────────────────────────────────────────────────────────────

import pandas as pd
import config


def generate_report(results: list) -> pd.DataFrame:
    """
    Takes the list of result dicts from engine.simulate_day(),
    prints a formatted backtest report, and saves trade_log.csv.

    Returns the full results DataFrame for further analysis.
    """

    df = pd.DataFrame(results)

    # ── Save full trade log ────────────────────────────────────
    df.to_csv(config.TRADE_LOG_PATH, index=False)
    print(f"  Full trade log saved → {config.TRADE_LOG_PATH}\n")

    # ── Classify days ─────────────────────────────────────────
    total_days = len(df)
    no_data    = (df['exit_type'] == 'NO_DATA').sum()
    no_trade   = (df['exit_type'] == 'NO_TRADE').sum()
    timeouts   = (df['exit_type'] == 'TIMEOUT').sum()

    # ── Completed trades (TP or SL only) ──────────────────────
    trades   = df[df['exit_type'].isin(['TP', 'SL'])].copy()
    n_trades = len(trades)
    wins     = (trades['exit_type'] == 'TP').sum()
    losses   = (trades['exit_type'] == 'SL').sum()
    win_rate = (wins / n_trades * 100) if n_trades > 0 else 0.0

    # ── P&L stats ─────────────────────────────────────────────
    total_pnl  = trades['pnl_points'].sum()       if n_trades > 0 else 0.0
    avg_win    = trades.loc[trades['exit_type'] == 'TP', 'pnl_points'].mean() \
                 if wins   > 0 else 0.0
    avg_loss   = trades.loc[trades['exit_type'] == 'SL', 'pnl_points'].mean() \
                 if losses > 0 else 0.0
    best       = trades['pnl_points'].max()       if n_trades > 0 else 0.0
    worst      = trades['pnl_points'].min()       if n_trades > 0 else 0.0
    avg_dur    = trades['duration_seconds'].mean() if n_trades > 0 else 0.0

    # ── Max consecutive losses (loss streak) ──────────────────
    max_streak = streak = 0
    for t in trades['exit_type']:
        streak     = streak + 1 if t == 'SL' else 0
        max_streak = max(max_streak, streak)

    # ── Max drawdown (running P&L peak-to-trough) ─────────────
    if n_trades > 0:
        running  = trades['pnl_points'].cumsum()
        peak     = running.cummax()
        max_dd   = (running - peak).min()
    else:
        max_dd   = 0.0

    # ── Buy vs Sell breakdown ──────────────────────────────────
    buy_trades  = trades[trades['direction'] == 'BUY']
    sell_trades = trades[trades['direction'] == 'SELL']
    buy_wr  = (buy_trades['exit_type']  == 'TP').mean() * 100 if len(buy_trades)  > 0 else 0
    sell_wr = (sell_trades['exit_type'] == 'TP').mean() * 100 if len(sell_trades) > 0 else 0

    # ═══════════════════════════════════════════════════════════
    #  PRINT REPORT
    # ═══════════════════════════════════════════════════════════
    W = 58
    print("=" * W)
    print("       US30 OCO STRADDLE — BACKTEST REPORT")
    print("=" * W)
    print(f"  Period           : {df['date'].min()}  →  {df['date'].max()}")
    print(f"  Days Scanned     : {total_days}")
    print(f"  No Data Days     : {no_data}")
    print(f"  No Trade Days    : {no_trade:<6}  (price never broke ±20 pts)")
    print(f"  Timeout Trades   : {timeouts:<6}  (still open at 20:04 IST)")
    print("-" * W)
    print(f"  Total Trades     : {n_trades}")
    print(f"  ├─ BUY  trades   : {len(buy_trades):<6}  win rate {buy_wr:.1f}%")
    print(f"  └─ SELL trades   : {len(sell_trades):<6}  win rate {sell_wr:.1f}%")
    print(f"  Wins  (TP)       : {wins}")
    print(f"  Losses (SL)      : {losses}")
    print(f"  Win Rate         : {win_rate:.1f}%")
    print(f"  Breakeven WR     : ~57.1%    (RR = 30 : 40)")
    print("-" * W)
    print(f"  Total P&L        : {total_pnl:+.1f} pts")
    print(f"  Avg Win          : {avg_win:+.1f} pts")
    print(f"  Avg Loss         : {avg_loss:+.1f} pts")
    print(f"  Best Trade       : {best:+.1f} pts")
    print(f"  Worst Trade      : {worst:+.1f} pts")
    print(f"  Max Drawdown     : {max_dd:+.1f} pts")
    print(f"  Max Loss Streak  : {max_streak} in a row")
    print(f"  Avg Duration     : {avg_dur:.1f} sec")
    print("=" * W)

    # ── Timeout trades summary (separate block) ────────────────
    timeout_df = df[df['exit_type'] == 'TIMEOUT']
    if len(timeout_df) > 0:
        print(f"\n  TIMEOUT TRADES ({len(timeout_df)} total):")
        print(f"  Avg P&L at timeout : "
              f"{timeout_df['pnl_points'].mean():+.1f} pts")
        print(f"  Timeout P&L range  : "
              f"{timeout_df['pnl_points'].min():+.1f} to "
              f"{timeout_df['pnl_points'].max():+.1f} pts")
        print(f"  (These are excluded from main stats above)")

    print()
    return df
