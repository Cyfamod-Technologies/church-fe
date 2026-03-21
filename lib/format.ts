export function formatDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value?: string | null) {
  if (!value) {
    return "--";
  }

  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? 0);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const normalizedHour = ((hours + 11) % 12) + 1;
  const suffix = hours >= 12 ? "PM" : "AM";

  return `${normalizedHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatLabel(value?: string | null) {
  if (!value) {
    return "--";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
