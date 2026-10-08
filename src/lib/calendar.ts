/**
 * Calendar utilities for airing schedule broadcasts and reminders
 */

export function createGoogleCalendarUrl({
  title,
  description,
  airingAt,
  durationMinutes = 30,
}: {
  title: string;
  description: string;
  airingAt: number;
  durationMinutes?: number;
}): string {
  const startDate = new Date(airingAt * 1000);
  const endDate = new Date((airingAt + durationMinutes * 60) * 1000);

  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatUtc(startDate)}/${formatUtc(endDate)}`,
    details: description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsCalendar({
  title,
  description,
  airingAt,
  durationMinutes = 30,
}: {
  title: string;
  description: string;
  airingAt: number;
  durationMinutes?: number;
}) {
  const startDate = new Date(airingAt * 1000);
  const endDate = new Date((airingAt + durationMinutes * 60) * 1000);

  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AniWaveX//Anime Airing Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:aniwavex-airing-${airingAt}-${Math.random().toString(36).slice(2)}@aniwavex`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(startDate)}`,
    `DTEND:${formatUtc(endDate)}`,
    `SUMMARY:${title.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n").replace(/,/g, "\\,")}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${title.replace(/,/g, "\\,")} airs in 15 minutes!`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
