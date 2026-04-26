# config.py — Strategy & engine parameters

# ── Strategy levels (in index points) ────────────────────────
PIPS_DISTANCE = 20    # Stop order distance above/below ref_price
TP_PIPS       = 30    # Take profit distance from entry price
#
# SL is NOT a separate param — it equals the opposite stop entry.
# SL distance from entry = PIPS_DISTANCE * 2 = 40 pts
# Risk:Reward = 30:40 = 0.75  →  breakeven win rate ~57.1%

# ── File path (overridden at runtime by api.py) ───────────────
PARQUET_PATH = "us30_filtered.parquet"

# ── Timing (IST, timezone-naive — parquet is already in IST) ──
REF_HOUR    = 19      # Capture ref_price at or before 19:59:45
REF_MINUTE  = 59
REF_SECOND  = 45

TIMEOUT_HOUR   = 20   # Force-close any open trade at 20:04:00
TIMEOUT_MINUTE = 4
TIMEOUT_SECOND = 0
