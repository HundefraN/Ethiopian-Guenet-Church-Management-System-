/**
 * Formats a date into a human-readable "time ago" string.
 * Handles future dates (clock skew) gracefully.
 */
export const timeAgo = (date: string | Date | number): string => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date().getTime();
  const past = d.getTime();
  const seconds = Math.floor((now - past) / 1000);

  // If activity is in the future (clock skew) or extremely recent
  if (seconds < 10) return "Just now";

  // Show seconds for the first minute for better accuracy
  if (seconds < 60) return `${seconds} seconds ago`;

  const intervals: { label: string; seconds: number }[] = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
};


