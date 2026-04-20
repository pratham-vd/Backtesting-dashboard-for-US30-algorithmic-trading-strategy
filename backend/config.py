# ─────────────────────────────────────────────────────────────
#  config.py  —  All strategy & engine parameters in one place
#  Edit ONLY this file when you want to tweak the strategy.
# ─────────────────────────────────────────────────────────────

# ── File paths ────────────────────────────────────────────────
PARQUET_PATH   = "us30_filtered.parquet"
TRADE_LOG_PATH = "trade_log.csv"

# ── Strategy levels (in index points) ─────────────────────────
PIPS_DISTANCE = 20    # Stop order distance above/below ref_price
TP_PIPS       = 30    # Take profit distance from entry price
#
# NOTE: SL is NOT a separate parameter — it equals the opposite
#       stop entry level.
#       SL distance from entry = PIPS_DISTANCE * 2 = 40 pts
#       Risk:Reward = 30:40 = 0.75  →  breakeven win rate ~57.1%

# ── Timing (IST, timezone-naive — parquet is already in IST) ──
REF_HOUR    = 19      # Capture ref_price at or before 19:59:45
REF_MINUTE  = 59
REF_SECOND  = 45

TIMEOUT_HOUR   = 20   # Force-close any open trade at 20:04:00
TIMEOUT_MINUTE = 4
TIMEOUT_SECOND = 0
