export function getMonthRange(date = new Date()) {
  const indonesiaTime = new Date(date.getTime() + 7 * 60 * 60 * 1000)

  const startOfMonth = new Date(
    indonesiaTime.getUTCFullYear(),
    indonesiaTime.getUTCMonth(),
    1, 0, 0, 0
  )
  const endOfMonth = new Date(
    indonesiaTime.getUTCFullYear(),
    indonesiaTime.getUTCMonth() + 1,
    0, 23, 59, 59
  )

  return { startOfMonth, endOfMonth, indonesiaTime }
}

export function getDayRange(date = new Date()) {
  const indonesiaTime = new Date(date.getTime() + 7 * 60 * 60 * 1000)

  const startOfDay = new Date(
    indonesiaTime.getUTCFullYear(),
    indonesiaTime.getUTCMonth(),
    indonesiaTime.getUTCDate(), 0, 0, 0
  )
  const endOfDay = new Date(
    indonesiaTime.getUTCFullYear(),
    indonesiaTime.getUTCMonth(),
    indonesiaTime.getUTCDate(), 23, 59, 59
  )

  return { startOfDay, endOfDay }
}