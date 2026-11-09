export function formatBuildInfo(buildTime, gitHash = 'local') {
  const hash = typeof gitHash === 'string' && gitHash.trim() ? gitHash.trim() : 'local'
  const timestamp = typeof buildTime === 'string' ? Date.parse(buildTime) : NaN
  if (Number.isNaN(timestamp)) return `업데이트 시각 확인 불가 · ${hash}`

  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]))

  return `업데이트 ${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute} · ${hash}`
}
