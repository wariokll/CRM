/** Federal fixed-date holidays in Russia. Dates are expressed in local server time. */
const holidayKeys = new Set([
  '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08',
  '02-23', '03-08', '05-01', '05-09', '06-12', '11-04',
])

function dateKey(value: Date) {
  return `${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function isBusinessDay(value: Date) {
  const day = value.getDay()
  return day !== 0 && day !== 6 && !holidayKeys.has(dateKey(value))
}

/** Keeps the original time and moves a weekend or public holiday backwards to a working day. */
export function moveToPreviousBusinessDay(value: Date) {
  const result = new Date(value)
  while (!isBusinessDay(result)) result.setDate(result.getDate() - 1)
  return result
}

export function nextRecurringBusinessDate(value: Date, intervalDays: number) {
  const result = new Date(value)
  result.setDate(result.getDate() + intervalDays)
  return moveToPreviousBusinessDay(result)
}

/** Advances the calendar cadence without applying business-day adjustment. */
export function nextRecurringDate(value: Date, intervalDays: number) {
  const result = new Date(value)
  result.setDate(result.getDate() + intervalDays)
  return result
}
