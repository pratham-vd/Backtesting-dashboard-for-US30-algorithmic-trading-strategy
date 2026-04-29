# api.py — FastAPI backend for US30 Backtest Dashboard

import os
import io
import math
import traceback
from typing import Optional

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import config
import engine

app = FastAPI(title="US30 Backtest API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://backtesting-software-us30.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory state
_state = {
    "parquet_path": None,
    "results":      None,
    "summary":      None,
    "meta":         None,
}

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Summary builder ───────────────────────────────────────────

def _build_summary(results: list) -> dict:
    df = pd.DataFrame(results)

    total_days = len(df)
    no_data    = int((df['exit_type'] == 'NO_DATA').sum())
    no_trade   = int((df['exit_type'] == 'NO_TRADE').sum())
    timeouts   = int((df['exit_type'] == 'TIMEOUT').sum())

    trades   = df[df['exit_type'].isin(['TP', 'SL'])].copy()
    n_trades = len(trades)
    wins     = int((trades['exit_type'] == 'TP').sum())
    losses   = int((trades['exit_type'] == 'SL').sum())
    win_rate = round(wins / n_trades * 100, 2) if n_trades > 0 else 0.0
    total_pnl = round(float(trades['pnl_points'].sum()), 3) if n_trades > 0 else 0.0
    avg_win   = round(float(trades.loc[trades['exit_type'] == 'TP',  'pnl_points'].mean()), 3) if wins   > 0 else 0.0
    avg_loss  = round(float(trades.loc[trades['exit_type'] == 'SL',  'pnl_points'].mean()), 3) if losses > 0 else 0.0
    best      = round(float(trades['pnl_points'].max()), 3) if n_trades > 0 else 0.0
    worst     = round(float(trades['pnl_points'].min()), 3) if n_trades > 0 else 0.0
    avg_dur   = round(float(trades['duration_seconds'].mean()), 1) if n_trades > 0 else 0.0

    # Max consecutive losses
    max_streak = streak = 0
    for t in trades['exit_type']:
        streak     = streak + 1 if t == 'SL' else 0
        max_streak = max(max_streak, streak)

    # Max drawdown
    if n_trades > 0:
        running = trades['pnl_points'].cumsum()
        peak    = running.cummax()
        max_dd  = round(float((running - peak).min()), 3)
    else:
        max_dd = 0.0

    # BUY vs SELL
    buy_t  = trades[trades['direction'] == 'BUY']
    sell_t = trades[trades['direction'] == 'SELL']
    buy_wr  = round(float((buy_t['exit_type']  == 'TP').mean() * 100), 2) if len(buy_t)  > 0 else 0.0
    sell_wr = round(float((sell_t['exit_type'] == 'TP').mean() * 100), 2) if len(sell_t) > 0 else 0.0

    # Equity curve
    if n_trades > 0:
        ts = trades.sort_values('date').copy()
        ts['cumulative_pnl'] = ts['pnl_points'].cumsum()
        equity_curve = ts[['date', 'cumulative_pnl', 'pnl_points', 'exit_type']].to_dict('records')
    else:
        equity_curve = []

    # Monthly P&L
    monthly = []
    if n_trades > 0:
        trades['month'] = pd.to_datetime(trades['date']).dt.to_period('M').astype(str)
        monthly = trades.groupby('month')['pnl_points'].sum().reset_index().rename(
            columns={'pnl_points': 'pnl'}).to_dict('records')

    # Timeout stats
    timeout_df    = df[df['exit_type'] == 'TIMEOUT']
    timeout_stats = {}
    if len(timeout_df) > 0:
        timeout_stats = {
            'count'  : len(timeout_df),
            'avg_pnl': round(float(timeout_df['pnl_points'].mean()), 3),
            'min_pnl': round(float(timeout_df['pnl_points'].min()),  3),
            'max_pnl': round(float(timeout_df['pnl_points'].max()),  3),
        }

    return {
        "period"         : {"start": str(df['date'].min()), "end": str(df['date'].max())},
        "total_days"     : total_days,
        "no_data_days"   : no_data,
        "no_trade_days"  : no_trade,
        "timeout_trades" : timeouts,
        "total_trades"   : n_trades,
        "wins"           : wins,
        "losses"         : losses,
        "win_rate"       : win_rate,
        "breakeven_wr"   : 57.1,
        "total_pnl"      : total_pnl,
        "avg_win"        : avg_win,
        "avg_loss"       : avg_loss,
        "best_trade"     : best,
        "worst_trade"    : worst,
        "avg_duration_s" : avg_dur,
        "max_drawdown"   : max_dd,
        "max_loss_streak": max_streak,
        "buy_trades"     : len(buy_t),
        "sell_trades"    : len(sell_t),
        "buy_win_rate"   : buy_wr,
        "sell_win_rate"  : sell_wr,
        "equity_curve"   : equity_curve,
        "monthly_pnl"    : monthly,
        "timeout_stats"  : timeout_stats,
        "config"         : {
            "pips_distance": config.PIPS_DISTANCE,
            "tp_pips"      : config.TP_PIPS,
            "sl_pips"      : config.PIPS_DISTANCE * 2,
        }
    }


# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "US30 Backtest API running"}


@app.post("/reset")
def reset():
    """Clear all uploaded data and backtest results from memory."""
    _state["parquet_path"] = None
    _state["results"]      = None
    _state["summary"]      = None
    _state["meta"]         = None
    return {"success": True}


@app.get("/status")
def status():
    return {
        "file_loaded": _state["parquet_path"] is not None,
        "has_results": _state["results"] is not None,
        "meta": _state["meta"],
        "last_config": {
            "pips_distance":  config.PIPS_DISTANCE,
            "tp_pips":        config.TP_PIPS,
            "target_hour":    config.TARGET_HOUR,
            "target_minute":  config.TARGET_MINUTE,
            "offset_seconds": config.OFFSET_SECONDS,
        } if _state["results"] is not None else None,
    }


@app.post("/upload")
async def upload_parquet(file: UploadFile = File(...)):
    if not file.filename.endswith(".parquet"):
        raise HTTPException(400, "Only .parquet files accepted.")

    contents = await file.read()

    try:
        df = pd.read_parquet(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, f"Could not read parquet: {e}")

    required = {'ask', 'bid'}
    if not required.issubset(set(df.columns)):
        raise HTTPException(400, f"Parquet must have columns: {required}. Got: {list(df.columns)}")

    save_path = os.path.join(UPLOAD_DIR, "us30_filtered.parquet")
    with open(save_path, "wb") as f:
        f.write(contents)

    _state["parquet_path"] = save_path
    _state["results"]      = None
    _state["summary"]      = None

    df['date'] = (pd.to_datetime(df.index).date
                  if isinstance(df.index, pd.DatetimeIndex)
                  else pd.to_datetime(df['date']).dt.date)

    _state["meta"] = {
        "filename"    : file.filename,
        "total_ticks" : len(df),
        "trading_days": int(df['date'].nunique()),
        "date_start"  : str(df['date'].min()),
        "date_end"    : str(df['date'].max()),
    }

    return {"success": True, "meta": _state["meta"]}


@app.post("/run")
def run_backtest(
    pips_distance:  int = 20,
    tp_pips:        int = 30,
    target_hour:    int = 20,
    target_minute:  int = 0,
    offset_seconds: int = 15,
):
    if _state["parquet_path"] is None:
        raise HTTPException(400, "No parquet file uploaded yet.")

    from datetime import datetime, timedelta

    config.PIPS_DISTANCE = pips_distance
    config.TP_PIPS       = tp_pips
    config.PARQUET_PATH  = _state["parquet_path"]

    # Compute ref capture time = target - offset
    config.TARGET_HOUR    = target_hour
    config.TARGET_MINUTE  = target_minute
    config.OFFSET_SECONDS = offset_seconds

    target_dt  = datetime(2000, 1, 1, target_hour, target_minute, 0)
    ref_dt     = target_dt - timedelta(seconds=offset_seconds)
    timeout_dt = target_dt + timedelta(minutes=4)

    config.REF_HOUR   = ref_dt.hour
    config.REF_MINUTE = ref_dt.minute
    config.REF_SECOND = ref_dt.second

    config.TIMEOUT_HOUR   = timeout_dt.hour
    config.TIMEOUT_MINUTE = timeout_dt.minute
    config.TIMEOUT_SECOND = timeout_dt.second

    try:
        import data_loader
        daily_groups = data_loader.load_and_group()

        results = [
            engine.simulate_day(date, day_ticks)
            for date, day_ticks in sorted(daily_groups.items())
        ]

        _state["results"] = results
        _state["summary"] = _build_summary(results)

        return {"success": True, "days_processed": len(results)}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Backtest failed: {str(e)}")


@app.get("/summary")
def get_summary():
    if _state["summary"] is None:
        raise HTTPException(400, "No results yet. Run /run first.")
    return _state["summary"]


@app.get("/trades")
def get_trades(
    direction: Optional[str] = None,
    exit_type: Optional[str] = None,
    limit: int = 500,
    offset: int = 0
):
    if _state["results"] is None:
        raise HTTPException(400, "No results yet.")

    df = pd.DataFrame(_state["results"])

    if direction:
        df = df[df['direction'] == direction.upper()]
    if exit_type:
        df = df[df['exit_type'] == exit_type.upper()]

    total = len(df)
    page  = df.iloc[offset: offset + limit]

    def _clean(val):
        if val is None:
            return None
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val

    trades_clean = [
        {k: _clean(v) for k, v in row.items()}
        for row in page.to_dict('records')
    ]

    return {"total": total, "offset": offset, "limit": limit, "trades": trades_clean}
