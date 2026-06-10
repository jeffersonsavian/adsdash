// Utilidades para datas no fuso do workspace.

// Offset (ms) do fuso em um instante: wallclock(tz) - UTC.
// Ex.: America/Sao_Paulo → -3h (-10800000).
function getTimezoneOffsetMs(rawDate: Date, timezone: string): number {
  // Truncar ao segundo: o formatter não expõe ms e o resto enviesaria o offset
  const date = new Date(Math.floor(rawDate.getTime() / 1000) * 1000)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const values: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value
  }

  const asUtc = Date.UTC(
    parseInt(values.year, 10),
    parseInt(values.month, 10) - 1,
    parseInt(values.day, 10),
    parseInt(values.hour, 10) % 24,
    parseInt(values.minute, 10),
    parseInt(values.second, 10)
  )

  return asUtc - date.getTime()
}

// Converte um range 'YYYY-MM-DD' interpretado no fuso dado para instantes UTC:
// 00:00:00.000 de dateStart até 23:59:59.999 de dateEnd, horário local do fuso.
// Ex.: '2026-06-10' em America/Sao_Paulo → gte = 2026-06-10T03:00:00.000Z.
export function dayRangeUtc(
  dateStartStr: string,
  dateEndStr: string,
  timezone: string
): { gte: Date; lte: Date } {
  const [sy, sm, sd] = dateStartStr.split('-').map(Number)
  const [ey, em, ed] = dateEndStr.split('-').map(Number)

  const startWallclock = Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0)
  const endWallclock = Date.UTC(ey, em - 1, ed, 23, 59, 59, 999)

  // wallclock local = UTC + offset → instante UTC = wallclock - offset.
  // Offset calculado no próprio instante aproximado para respeitar DST.
  const gte = new Date(
    startWallclock - getTimezoneOffsetMs(new Date(startWallclock), timezone)
  )
  const lte = new Date(
    endWallclock - getTimezoneOffsetMs(new Date(endWallclock), timezone)
  )

  return { gte, lte }
}

// Data de hoje como 'YYYY-MM-DD' no fuso dado.
export function todayStr(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
