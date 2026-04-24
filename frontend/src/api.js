// src/api.js — All backend calls in one place

const BASE = 'https://backtesting-software-us30-backend.onrender.com/api'

export const api = {

  async status() {
    const r = await fetch(`${BASE}/status`)
    return r.json()
  },

  async upload(file) {
    const form = new FormData()
    form.append('file', file)
    const r = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
    if (!r.ok) {
      const err = await r.json()
      throw new Error(err.detail || 'Upload failed')
    }
    return r.json()
  },

  async run(pipsDistance = 20, tpPips = 30) {
    const r = await fetch(
      `${BASE}/run?pips_distance=${pipsDistance}&tp_pips=${tpPips}`,
      { method: 'POST' }
    )
    if (!r.ok) {
      const err = await r.json()
      throw new Error(err.detail || 'Backtest failed')
    }
    return r.json()
  },

  async summary() {
    const r = await fetch(`${BASE}/summary`)
    if (!r.ok) throw new Error('No results available')
    return r.json()
  },

  async trades({ direction, exitType, limit = 500, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset })
    if (direction) params.append('direction', direction)
    if (exitType)  params.append('exit_type', exitType)
    const r = await fetch(`${BASE}/trades?${params}`)
    if (!r.ok) throw new Error('Could not fetch trades')
    return r.json()
  },
}
