// Shared budget for public chat and report generation.
const limits = new Map()
let daily = { day: '', count: 0 }
let active = 0

export function generationLimited(request) {
  const now = Date.now()
  const ip = request.headers['x-real-ip'] || request.socket.remoteAddress
  const recent = (limits.get(ip) || []).filter(time => now - time < 60_000)
  const day = new Date().toISOString().slice(0, 10)
  if (daily.day !== day) daily = { day, count: 0 }
  const configured = Number(process.env.CHAT_DAILY_LIMIT || 200)
  const dailyLimit = Number.isFinite(configured) && configured > 0 ? configured : 200
  if (recent.length >= 10 || active >= 3 || (process.env.OPENAI_API_KEY && daily.count >= dailyLimit)) return true
  recent.push(now)
  limits.delete(ip); limits.set(ip, recent)
  if (limits.size > 1000) limits.delete(limits.keys().next().value)
  return false
}
export function beginGeneration(isLlm) { active++; if (isLlm) daily.count++ }
export function endGeneration() { active-- }
