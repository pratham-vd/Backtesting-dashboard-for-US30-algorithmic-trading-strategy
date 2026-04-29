# ─────────────────────────────────────────────────────────────
#  engine.py  —  Tick-by-tick simulation for one trading day
#
#  Bid/Ask logic (critical for accuracy):
#  ┌──────────────┬───────────────┬───────────────────────────┐
#  │ Event        │ Price used    │ Reason                    │
#  ├──────────────┼───────────────┼───────────────────────────┤
#  │ BUY entry    │ ASK           │ You pay ask to buy        │
#  │ SELL entry   │ BID           │ You receive bid to sell   │
#  │ BUY TP exit  │ BID >= buy_tp │ You sell at bid           │
#  │ BUY SL exit  │ BID <= buy_sl │ You sell at bid           │
#  │ SELL TP exit │ ASK <= sel_tp │ You buy back at ask       │
#  │ SELL SL exit │ ASK >= sel_sl │ You buy back at ask       │
#  │ BUY timeout  │ last BID      │ Conservative long exit    │
#  │ SELL timeout │ last ASK      │ Conservative short exit   │
#  └──────────────┴───────────────┴───────────────────────────┘
#
#  NOTE: _REF_TIME is NOT cached at module level — config values
#  are read fresh inside simulate_day so runtime overrides from
#  api.py are always respected.
# ─────────────────────────────────────────────────────────────

from datetime import time
import config
from strategy import compute_levels


def simulate_day(date, day_ticks) -> dict:
    """
    Simulate a single trading day end-to-end.

    Parameters
    ----------
    date      : date object — the trading day
    day_ticks : DataFrame   — all ticks for this day (IST DatetimeIndex)
                              columns: timestamp, ask, bid, date

    Returns
    -------
    dict with full trade details
    """

    # Read timing from config fresh each call — api.py overrides these
    # before the simulation loop starts.
    ref_time = time(config.REF_HOUR, config.REF_MINUTE, config.REF_SECOND)

    result = {
        'date'             : str(date),
        'ref_time'         : None,
        'ref_price'        : None,
        'buy_entry'        : None,
        'sell_entry'       : None,
        'buy_tp'           : None,
        'buy_sl'           : None,
        'sell_tp'          : None,
        'sell_sl'          : None,
        'direction'        : None,
        'entry_time'       : None,
        'entry_price'      : None,
        'exit_time'        : None,
        'exit_price'       : None,
        'exit_type'        : None,
        'pnl_points'       : None,
        'duration_seconds' : None,
    }

    # ═══════════════════════════════════════════════════════════
    #  STEP 1 — Capture ref_price (last tick at or before ref_time)
    # ═══════════════════════════════════════════════════════════
    ref_candidates = day_ticks[day_ticks.index.time <= ref_time]

    if len(ref_candidates) == 0:
        result['exit_type'] = 'NO_DATA'
        return result

    ref_tick  = ref_candidates.iloc[-1]
    ref_ts    = ref_candidates.index[-1]
    ref_price = (ref_tick['ask'] + ref_tick['bid']) / 2

    result['ref_time'] = str(ref_ts)
    levels = compute_levels(ref_price)
    result.update(levels)

    # ═══════════════════════════════════════════════════════════
    #  STEP 2 — Entry window (all ticks AFTER the ref tick)
    # ═══════════════════════════════════════════════════════════
    entry_window = day_ticks[day_ticks.index > ref_ts]

    if len(entry_window) == 0:
        result['exit_type'] = 'NO_DATA'
        return result

    # ═══════════════════════════════════════════════════════════
    #  STEP 3 — Scan tick by tick for entry trigger
    # ═══════════════════════════════════════════════════════════
    direction   = None
    entry_price = None
    entry_ts    = None
    entry_idx   = None

    buy_entry  = levels['buy_entry']
    sell_entry = levels['sell_entry']

    for i, (ts, tick) in enumerate(entry_window.iterrows()):
        ask = tick['ask']
        bid = tick['bid']

        buy_hit  = ask >= buy_entry
        sell_hit = bid <= sell_entry

        if buy_hit and sell_hit:
            if abs(ask - ref_price) <= abs(bid - ref_price):
                direction, entry_price = 'BUY',  ask
            else:
                direction, entry_price = 'SELL', bid
        elif buy_hit:
            direction, entry_price = 'BUY',  ask
        elif sell_hit:
            direction, entry_price = 'SELL', bid

        if direction is not None:
            entry_ts  = ts
            entry_idx = i
            break

    if direction is None:
        result['exit_type'] = 'NO_TRADE'
        return result

    result['direction']   = direction
    result['entry_time']  = str(entry_ts)
    result['entry_price'] = round(entry_price, 3)

    # ═══════════════════════════════════════════════════════════
    #  STEP 4 — Scan remaining ticks for exit (TP / SL)
    # ═══════════════════════════════════════════════════════════
    post_entry = entry_window.iloc[entry_idx + 1:]

    buy_tp  = levels['buy_tp']
    buy_sl  = levels['buy_sl']
    sell_tp = levels['sell_tp']
    sell_sl = levels['sell_sl']

    exit_price = None
    exit_ts    = None
    exit_type  = None

    for ts, tick in post_entry.iterrows():
        ask = tick['ask']
        bid = tick['bid']

        if direction == 'BUY':
            tp_hit = bid >= buy_tp
            sl_hit = bid <= buy_sl
            if tp_hit and sl_hit:
                if abs(bid - buy_tp) <= abs(bid - buy_sl):
                    exit_price, exit_type = buy_tp, 'TP'
                else:
                    exit_price, exit_type = buy_sl, 'SL'
            elif tp_hit:
                exit_price, exit_type = buy_tp, 'TP'
            elif sl_hit:
                exit_price, exit_type = buy_sl, 'SL'

        else:  # SELL
            tp_hit = ask <= sell_tp
            sl_hit = ask >= sell_sl
            if tp_hit and sl_hit:
                if abs(ask - sell_tp) <= abs(ask - sell_sl):
                    exit_price, exit_type = sell_tp, 'TP'
                else:
                    exit_price, exit_type = sell_sl, 'SL'
            elif tp_hit:
                exit_price, exit_type = sell_tp, 'TP'
            elif sl_hit:
                exit_price, exit_type = sell_sl, 'SL'

        if exit_type is not None:
            exit_ts = ts
            break

    # ═══════════════════════════════════════════════════════════
    #  STEP 5 — Handle TIMEOUT
    # ═══════════════════════════════════════════════════════════
    if exit_type is None:
        exit_type = 'TIMEOUT'
        if len(post_entry) > 0:
            last       = post_entry.iloc[-1]
            exit_ts    = post_entry.index[-1]
            exit_price = last['bid'] if direction == 'BUY' else last['ask']
        else:
            exit_ts    = entry_ts
            exit_price = entry_price

    # ═══════════════════════════════════════════════════════════
    #  STEP 6 — P&L and duration
    # ═══════════════════════════════════════════════════════════
    exit_price = round(exit_price, 3)
    pnl = (exit_price - entry_price) if direction == 'BUY' else (entry_price - exit_price)

    result['exit_price']       = exit_price
    result['exit_time']        = str(exit_ts)
    result['exit_type']        = exit_type
    result['pnl_points']       = round(pnl, 3)
    result['duration_seconds'] = round((exit_ts - entry_ts).total_seconds(), 1)

    return result
