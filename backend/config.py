# config.py — Strategy & engine parameters

# ── Strategy levels (in index points) ────────────────────────
PIPS_DISTANCE = 20    # Stop order distance above/below ref_price
TP_PIPS       = 30    # Take profit distance from entry price
#
# SL is NOT a separate param — it equals the opposite stop entry.
# SL distance from entry = PIPS_DISTANCE * 2 = 40 pts

# ── File path (overridden at runtime by api.py) ───────────────
PARQUET_PATH = "us30_filtered.parquet"

# ── Timing (IST, timezone-naive — parquet is already in IST) ──
# These are all overridden at runtime by api.py when /run is called.

TARGET_HOUR    = 20   # Target time at which orders are placed (IST)
TARGET_MINUTE  = 0

OFFSET_SECONDS = 15   # Seconds before target to capture ref_price
                      # ref_time = target - offset
                      # e.g. target=20:00, offset=15 → ref at 19:59:45

# Derived ref capture time (computed by api.py from target + offset)
REF_HOUR   = 19
REF_MINUTE = 59
REF_SECOND = 45

# Timeout = target + 4 minutes (computed by api.py)
TIMEOUT_HOUR   = 20
TIMEOUT_MINUTE = 4
TIMEOUT_SECOND = 0
