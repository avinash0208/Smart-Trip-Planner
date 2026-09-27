import type { Activity, ItineraryDay, Trip } from '@/types/database.types'

// Escapes text per RFC 5545 (commas, semicolons, backslashes, and newlines)
const escapeIcsText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

const pad = (n: number) => String(n).padStart(2, '0')

const toIcsDateTime = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(
    date.getMinutes()
  )}00`

const toIcsDate = (dateStr: string): string => dateStr.replace(/-/g, '')

// Parses times like "09:00 AM" / "9:30 PM" into 24h hour/minute, or null if unparseable
const parseTimeSlot = (timeSlot: string | null | undefined): { hour: number; minute: number } | null => {
  if (!timeSlot) return null
  const match = timeSlot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const meridiem = match[3]?.toUpperCase()

  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null

  return { hour, minute }
}

const DEFAULT_EVENT_DURATION_MINUTES = 60

export function generateTripIcs(trip: Trip, days: (ItineraryDay & { activities: Activity[] })[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartTripPlanner//Itinerary Export//EN',
    'CALSCALE:GREGORIAN',
  ]

  const stamp = toIcsDateTime(new Date())

  for (const day of days) {
    const activities = day.activities || []

    if (activities.length === 0) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:day-${day.id}@smarttripplanner`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(day.date)}`,
        `SUMMARY:${escapeIcsText(`Day ${day.day_number}: ${day.title || trip.destination_city}`)}`,
        `LOCATION:${escapeIcsText(`${trip.destination_city}, ${trip.destination_country}`)}`,
        'END:VEVENT'
      )
      continue
    }

    for (const activity of activities) {
      const parsedTime = parseTimeSlot(activity.time_slot)
      const dayDate = new Date(`${day.date}T00:00:00`)

      lines.push('BEGIN:VEVENT', `UID:activity-${activity.id}@smarttripplanner`, `DTSTAMP:${stamp}`)

      if (parsedTime) {
        const start = new Date(dayDate)
        start.setHours(parsedTime.hour, parsedTime.minute, 0, 0)
        const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000)
        lines.push(`DTSTART:${toIcsDateTime(start)}`, `DTEND:${toIcsDateTime(end)}`)
      } else {
        lines.push(`DTSTART;VALUE=DATE:${toIcsDate(day.date)}`)
      }

      lines.push(`SUMMARY:${escapeIcsText(activity.place_name)}`)

      const descriptionParts = [
        `Category: ${activity.category}`,
        activity.estimated_cost ? `Estimated cost: ${activity.estimated_cost}` : null,
        activity.notes || null,
      ].filter(Boolean)
      if (descriptionParts.length > 0) {
        lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join('\\n'))}`)
      }

      lines.push(`LOCATION:${escapeIcsText(`${trip.destination_city}, ${trip.destination_country}`)}`, 'END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcsFile(fileName: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName.endsWith('.ics') ? fileName : `${fileName}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
