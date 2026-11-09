export function shiftMonth(month, offset) {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7)
}

export function calendarDays(month) {
  const [year, number] = month.split('-').map(Number)
  const offset = new Date(Date.UTC(year, number - 1, 1)).getUTCDay()
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate()
  const days = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= length; day++) days.push(`${month}-${String(day).padStart(2, '0')}`)
  while (days.length % 7) days.push(null)
  return days
}

export function eventsOnDay(events, date, category = '전체') {
  return events.filter((event) => event.start <= date && event.end >= date && (category === '전체' || event.type === category))
}

export function monthCounts(events, month, category = '전체') {
  return calendarDays(month).filter(Boolean).map((date) => ({ date, count: eventsOnDay(events, date, category).length }))
}
