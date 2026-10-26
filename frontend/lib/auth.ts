"use client";

/**
 * Mostro AI Client-Side Authentication & Session Manager
 * Handles access token storage, automatic refresh token rotation synchronization,
 * cross-tab broadcast, and credentialed fetch helpers.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STORAGE_TOKEN_KEY = "mostro_access_token";
const STORAGE_EXPIRY_KEY = "mostro_token_expiry";
const STORAGE_EMAIL_KEY = "mostro_user_email";
const AUTH_EVENT_NAME = "mostro_auth_state_changed";

export interface SessionInfo {
  token: string;
  expiresAt: number;
  email?: string;
}

/** Check if code is running in a browser environment */
const isBrowser = (): boolean => typeof window !== "undefined";

/**
 * Save access token, expiration, and user email to client storage.
 * Broadcasts an auth change event across the application.
 */
export function setAuthSession(
  accessToken: string,
  expiresInSeconds: number,
  email?: string
): void {
  if (!isBrowser()) return;

  const expiresAt = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
  localStorage.setItem(STORAGE_EXPIRY_KEY, expiresAt.toString());
  if (email) {
    localStorage.setItem(STORAGE_EMAIL_KEY, email);
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT_NAME, {
      detail: { authenticated: true, email },
    })
  );
}

/**
 * Clear local session tokens and broadcast unauthenticated state.
 */
export function clearAuthSession(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_EXPIRY_KEY);
  localStorage.removeItem(STORAGE_EMAIL_KEY);

  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT_NAME, {
      detail: { authenticated: false },
    })
  );
}

/**
 * Read current session information.
 */
export function getStoredSession(): SessionInfo | null {
  if (!isBrowser()) return null;

  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const expiryStr = localStorage.getItem(STORAGE_EXPIRY_KEY);
  const email = localStorage.getItem(STORAGE_EMAIL_KEY) || undefined;

  if (!token || !expiryStr) return null;

  const expiresAt = parseInt(expiryStr, 10);
  if (isNaN(expiresAt)) return null;

  return { token, expiresAt, email };
}

/**
 * Check whether a session is currently stored and still valid.
 */
export function isAuthenticated(): boolean {
  const session = getStoredSession();
  if (!session) return false;
  // Consider expired if less than 15 seconds remain
  return session.expiresAt > Date.now() + 15 * 1000;
}

/**
 * Return current stored user email if available.
 */
export function getStoredEmail(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_EMAIL_KEY);
}

/**
 * Perform refresh token rotation via HTTP-only cookie.
 * Sends credentials (cookies) to POST /auth/refresh and updates local access token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!isBrowser()) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      clearAuthSession();
      return null;
    }

    const data = await res.json();
    if (data.status === "ok" && data.access_token) {
      setAuthSession(
        data.access_token,
        data.expires_in || 900,
        getStoredEmail() || undefined
      );
      return data.access_token;
    }

    clearAuthSession();
    return null;
  } catch (err) {
    console.warn("Failed to refresh access token:", err);
    return null;
  }
}

/**
 * Get an active, valid access token. Automatically refreshes if expired or expiring within 60s.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = getStoredSession();
  if (!session) return null;

  // If token has more than 60 seconds of validity, return it directly
  if (session.expiresAt > Date.now() + 60 * 1000) {
    return session.token;
  }

  // Token is expired or expiring soon; attempt transparent rotation
  return await refreshAccessToken();
}

/**
 * Log out user from both server (revokes refresh token family and clears cookie)
 * and client (clears local access token).
 */
export async function logout(): Promise<void> {
  if (isBrowser()) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Server logout request encountered an error:", err);
    } finally {
      clearAuthSession();
    }
  }
}

/**
 * Subscribe to authentication state changes (login, logout, token refresh).
 * Returns an unsubscribe callback for React useEffect hooks.
 */
export function subscribeToAuth(callback: () => void): () => void {
  if (!isBrowser()) return () => {};

  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_TOKEN_KEY ||
      e.key === STORAGE_EXPIRY_KEY ||
      e.key === null
    ) {
      callback();
    }
  };

  window.addEventListener(AUTH_EVENT_NAME, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

/**
 * Helper to make authenticated API requests with automatic Authorization header,
 * credentials inclusion, and automatic single-retry on 401 token expiration.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const token = await getValidAccessToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If unauthorized and we had a token, try to refresh once and retry
  if (response.status === 401 && token) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      return fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  return response;
}
