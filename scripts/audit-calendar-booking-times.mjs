const slots = ["10:30", "12:00", "14:00", "16:30"];
const date = "2026-07-21";

function normalizeCalendarTime(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function minutesFromTime(value) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function timeFromMinutes(value) {
  const minuteOfDay = ((value % 1440) + 1440) % 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toIcsDate(value) {
  return value.replace(/-/g, "");
}

function toIcsLocalDateTime(dateKey, minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${toIcsDate(dateKey)}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

function googleDateTime(dateKey, time) {
  return new Date(`${dateKey}T${time}:00+05:30`).toISOString();
}

for (const slot of slots) {
  const databaseStart = normalizeCalendarTime(`${slot}:00`);
  const databaseEnd = timeFromMinutes(minutesFromTime(databaseStart) + 30);
  const dtstart = toIcsLocalDateTime(date, minutesFromTime(databaseStart));
  const dtend = toIcsLocalDateTime(date, minutesFromTime(databaseEnd));
  const googleStart = googleDateTime(date, databaseStart);
  const googleEnd = googleDateTime(date, databaseEnd);

  if (!dtstart.includes(databaseStart.replace(":", ""))) {
    throw new Error(`ICS DTSTART does not match selected slot ${slot}: ${dtstart}`);
  }

  console.log(
    [
      `slot=${slot}`,
      `database=${databaseStart}`,
      `DTSTART;TZID=Asia/Kolkata:${dtstart}`,
      `DTEND;TZID=Asia/Kolkata:${dtend}`,
      `google.start.dateTime=${googleStart}`,
      `google.end.dateTime=${googleEnd}`,
    ].join(" | "),
  );
}
