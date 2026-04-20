# ─────────────────────────────────────────────────────────────
#  data_loader.py  —  Load parquet, group by trading day
# ─────────────────────────────────────────────────────────────

import pandas as pd
import config


def load_and_group() -> dict:
    """
    Load us30_filtered.parquet and return a dict of:
        { date_object -> DataFrame of ticks for that day }

    Each DataFrame is sorted chronologically and contains
    columns: timestamp (int64), ask (float64), bid (float64)
    with a DatetimeIndex named 'time' (IST, timezone-naive).
    """

    print("Loading parquet file...")
    df = pd.read_parquet(config.PARQUET_PATH)

    # ── Ensure DatetimeIndex is sorted ────────────────────────
    df = df.sort_index()

    # ── Convert 'date' column to proper date objects ───────────
    # (parquet stores it as object/string, we need date for groupby)
    df['date'] = pd.to_datetime(df['date']).dt.date

    # ── Validate required columns exist ───────────────────────
    required = {'ask', 'bid'}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Parquet is missing required columns: {missing}")

    # ── Group by date ──────────────────────────────────────────
    print(f"Grouping {len(df):,} ticks across trading days...")
    daily_groups = {}
    for d, group in df.groupby('date'):
        daily_groups[d] = group  # already sorted since df is sorted

    print(f"Found {len(daily_groups)} trading days "
          f"({min(daily_groups)} → {max(daily_groups)})\n")

    return daily_groups
