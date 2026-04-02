/**
 * Security utilities for the Ethiopian Guenet Church Management System.
 * Provides browser fingerprinting, login rate limiting, session integrity,
 * HTTPS enforcement, and secure cleanup.
 */

// ============================================================
// Constants
// ============================================================
export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  SESSION_FINGERPRINT_KEY: 'guenet_session_fp',
  LOGIN_ATTEMPTS_KEY: 'guenet_login_attempts',
} as const;

// ============================================================
// 1. Browser Fingerprint — Detect session hijacking
// ============================================================

/**
 * Generates a lightweight browser fingerprint from device characteristics.
 * Used to detect if a session token is being replayed from a different device.
 */
export const generateBrowserFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || 'unknown',
    navigator.platform || 'unknown',
  ];

  // djb2 hash
  const str = components.join('|');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
};

/** Store the browser fingerprint in sessionStorage. */
export const storeSessionFingerprint = (): string => {
  const fp = generateBrowserFingerprint();
  sessionStorage.setItem(SECURITY_CONFIG.SESSION_FINGERPRINT_KEY, fp);
  return fp;
};

/** Validate current fingerprint matches the stored one. */
export const validateSessionFingerprint = (): boolean => {
  const storedFp = sessionStorage.getItem(SECURITY_CONFIG.SESSION_FINGERPRINT_KEY);
  if (!storedFp) return true; // first time — nothing stored yet
  return storedFp === generateBrowserFingerprint();
};

// ============================================================
// 2. Login Rate Limiter — Brute-force protection
// ============================================================

interface LoginAttempts {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

export interface RateLimitResult {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
}

const getLoginAttemptData = (): LoginAttempts => {
  try {
    const stored = localStorage.getItem(SECURITY_CONFIG.LOGIN_ATTEMPTS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        localStorage.removeItem(SECURITY_CONFIG.LOGIN_ATTEMPTS_KEY);
        return { count: 0, firstAttemptAt: 0, lockedUntil: null };
      }
      return data;
    }
  } catch { /* ignore */ }
  return { count: 0, firstAttemptAt: 0, lockedUntil: null };
};

/** Check whether login is currently rate-limited. */
export const isLoginLocked = (): RateLimitResult => {
  const data = getLoginAttemptData();
  const now = Date.now();
  if (data.lockedUntil && now < data.lockedUntil) {
    return { isLocked: true, remainingSeconds: Math.ceil((data.lockedUntil - now) / 1000), attemptsLeft: 0 };
  }
  return { isLocked: false, remainingSeconds: 0, attemptsLeft: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - data.count) };
};

/** Record a login attempt and return the updated rate-limit state. */
export const recordLoginAttempt = (success: boolean): RateLimitResult => {
  if (success) {
    localStorage.removeItem(SECURITY_CONFIG.LOGIN_ATTEMPTS_KEY);
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
  }

  const data = getLoginAttemptData();
  const now = Date.now();

  if (data.lockedUntil && now < data.lockedUntil) {
    return { isLocked: true, remainingSeconds: Math.ceil((data.lockedUntil - now) / 1000), attemptsLeft: 0 };
  }

  const newData: LoginAttempts = {
    count: data.count + 1,
    firstAttemptAt: data.count === 0 ? now : data.firstAttemptAt,
    lockedUntil: null,
  };

  if (newData.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    newData.lockedUntil = now + SECURITY_CONFIG.LOCKOUT_DURATION_MS;
  }

  localStorage.setItem(SECURITY_CONFIG.LOGIN_ATTEMPTS_KEY, JSON.stringify(newData));

  return {
    isLocked: newData.lockedUntil !== null,
    remainingSeconds: newData.lockedUntil ? Math.ceil(SECURITY_CONFIG.LOCKOUT_DURATION_MS / 1000) : 0,
    attemptsLeft: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - newData.count),
  };
};

// ============================================================
// 3. HTTPS Enforcement
// ============================================================

/** Redirect to HTTPS in production environments. */
export const enforceHTTPS = (): void => {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol !== 'https:' &&
    !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
  ) {
    window.location.href = window.location.href.replace('http:', 'https:');
  }
};

// ============================================================
// 4. Secure Session Cleanup
// ============================================================

/** Clear all sensitive auth data from sessionStorage. */
export const clearAllSessionData = (): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('auth') || key.includes('supabase') || key.includes('guenet'))) {
        keys.push(key);
      }
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
};

// ============================================================
// 5. Lockout time formatter
// ============================================================

/** Format remaining lockout seconds as "Mm Ss". */
export const formatLockoutTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
};
