// lib/status.js
export const UI_STATUS = [
  "scheduled",   // -> booked
  "confirmed",
  "checked_in",
  "completed",
  "no_show",
  "cancelled",
];

export const STATUS_LABEL = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
};

// DB enum values that match your Supabase check constraint:
export const ALLOWED_DB_STATUSES = [
  "booked",
  "confirmed",
  "checked_in",
  "completed",
  "no_show",
  "cancelled",
];

export function normalizeUiStatus(s) {
  if (!s) return "scheduled";
  const x = String(s).toLowerCase().trim().replaceAll("-", "_");
  if (x === "noshow" || x === "no show") return "no_show";
  if (x === "checked in" || x === "checkedin") return "checked_in";
  return UI_STATUS.includes(x) ? x : "scheduled";
}

export function toDbStatus(uiStatus) {
  const u = normalizeUiStatus(uiStatus);
  switch (u) {
    case "scheduled": return "booked";
    case "confirmed": return "confirmed";
    case "checked_in": return "checked_in";
    case "completed": return "completed";
    case "no_show": return "no_show";
    case "cancelled": return "cancelled";
    default: return "booked";
  }
}

export function toUiStatus(dbStatus) {
  const x = String(dbStatus || "").toLowerCase().trim().replaceAll("-", "_");
  // ensure it’s one of the allowed DB values first
  if (!ALLOWED_DB_STATUSES.includes(x)) return "scheduled";
  switch (x) {
    case "booked": return "scheduled";
    case "confirmed": return "confirmed";
    case "checked_in": return "checked_in";
    case "completed": return "completed";
    case "no_show": return "no_show";
    case "cancelled": return "cancelled";
    default: return "scheduled";
  }
}
