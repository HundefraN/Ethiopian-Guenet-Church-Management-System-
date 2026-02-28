/**
 * Formats a date into a human-readable "time ago" string.
 * Handles future dates (clock skew) gracefully.
 */
export const timeAgo = (date: string | Date | number, lang: 'en' | 'am' = 'en'): string => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date().getTime();
  const past = d.getTime();
  const seconds = Math.floor((now - past) / 1000);

  const t = {
    en: {
      now: "Just now",
      seconds: "seconds ago",
      ago: "ago",
      intervals: {
        year: "year",
        month: "month",
        week: "week",
        day: "day",
        hour: "hour",
        minute: "minute"
      }
    },
    am: {
      now: "አሁኑኑ",
      seconds: "ከጥቂት ሰከንዶች በፊት",
      ago: "በፊት",
      intervals: {
        year: "ዓመት",
        month: "ወር",
        week: "ሳምንት",
        day: "ቀን",
        hour: "ሰዓት",
        minute: "ደቂቃ"
      },
      pluralIntervals: {
        year: "ዓመታት",
        month: "ወራት",
        week: "ሳምንታት",
        day: "ቀናት",
        hour: "ሰዓታት",
        minute: "ደቂቃዎች"
      }
    }
  };

  const currentT = t[lang] || t.en;

  // If activity is in the future (clock skew) or extremely recent
  if (seconds < 10) return currentT.now;

  // Show seconds for the first minute for better accuracy
  if (seconds < 60) {
    if (lang === 'am') return currentT.seconds;
    return `${seconds} ${currentT.seconds}`;
  }

  const intervals: { key: keyof typeof t.en.intervals; seconds: number }[] = [
    { key: "year", seconds: 31536000 },
    { key: "month", seconds: 2592000 },
    { key: "week", seconds: 604800 },
    { key: "day", seconds: 86400 },
    { key: "hour", seconds: 3600 },
    { key: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      if (lang === 'am') {
        const unit = count > 1 ? t.am.pluralIntervals[interval.key] : t.am.intervals[interval.key];
        return `ከ${count} ${unit} ${currentT.ago}`;
      }
      const unit = count !== 1 ? `${interval.key}s` : interval.key;
      return `${count} ${unit} ago`;
    }
  }

  return currentT.now;
};


