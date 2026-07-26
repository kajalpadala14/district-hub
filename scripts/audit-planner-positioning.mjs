const slots = [
  "10:00 - 10:30",
  "10:30 - 11:00",
  "11:00 - 11:30",
  "11:30 - 12:00",
  "12:00 - 12:30",
  "12:30 - 13:00",
  "14:00 - 14:30",
  "16:30 - 17:00",
];

const events = [
  { id: "event-1000", start_time: "10:00:00", expectedSlot: "10:00 - 10:30" },
  { id: "event-1230", start_time: "12:30:00", expectedSlot: "12:30 - 13:00" },
  { id: "event-1400", start_time: "14:00:00", expectedSlot: "14:00 - 14:30" },
  { id: "event-1630", start_time: "16:30:00", expectedSlot: "16:30 - 17:00" },
];

function parseTimeInput(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
    return null;
  }
  const displayMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!displayMatch) return null;
  const [, hourText, minuteText, period] = displayMatch;
  let hour = Number(hourText);
  if (period.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${minuteText}`;
}

function minutesFromTime(value) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function normalizeTaskTimeMinutes(value) {
  const normalized = parseTimeInput(value);
  return normalized ? minutesFromTime(normalized) : null;
}

function slotForEvent(event) {
  const taskTime = normalizeTaskTimeMinutes(event.start_time);
  return slots.find((slot) => {
    const [slotStartText, slotEndText] = slot.split(" - ");
    const slotStart = minutesFromTime(slotStartText);
    const slotEnd = minutesFromTime(slotEndText);
    return taskTime !== null && taskTime >= slotStart && taskTime < slotEnd;
  });
}

for (const event of events) {
  const actualSlot = slotForEvent(event);
  if (actualSlot !== event.expectedSlot) {
    throw new Error(`${event.id} expected ${event.expectedSlot}, got ${actualSlot ?? "no slot"}`);
  }
  console.log(`${event.id} start_time=${event.start_time} renders in ${actualSlot}`);
}
