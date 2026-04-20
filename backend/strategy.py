# ─────────────────────────────────────────────────────────────
#  strategy.py  —  Pure math: ref_price → order levels
#  No data, no I/O. Just the formula.
# ─────────────────────────────────────────────────────────────

import config


def compute_levels(ref_price: float) -> dict:
    """
    Given ref_price (mid at 19:59:45 IST), compute all order levels.

    Visual layout:
                    buy_tp   ← ref + 50 pts
                    ───────
                    buy_entry← ref + 20 pts   (Buy Stop placed here)
                    ───────
                    ref_price← captured at 19:59:45
                    ───────
                    sell_entry← ref - 20 pts  (Sell Stop placed here)
                    ───────
                    sell_tp  ← ref - 50 pts

    SL cross-linking:
        buy_sl  = sell_entry  (if buy triggers, SL is the sell stop level)
        sell_sl = buy_entry   (if sell triggers, SL is the buy stop level)

    SL distance from entry = PIPS_DISTANCE × 2 = 40 pts
    TP distance from entry = TP_PIPS            = 30 pts
    """

    buy_entry  = ref_price + config.PIPS_DISTANCE
    sell_entry = ref_price - config.PIPS_DISTANCE

    levels = {
        'ref_price'  : round(ref_price,  3),
        'buy_entry'  : round(buy_entry,  3),
        'sell_entry' : round(sell_entry, 3),
        'buy_tp'     : round(buy_entry  + config.TP_PIPS, 3),
        'buy_sl'     : round(sell_entry, 3),              # 40 pts below buy_entry
        'sell_tp'    : round(sell_entry - config.TP_PIPS, 3),
        'sell_sl'    : round(buy_entry,  3),              # 40 pts above sell_entry
    }

    return levels
