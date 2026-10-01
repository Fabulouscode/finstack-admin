/** A signed-in staff member, as stored in the sealed session cookie. */
export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * What the dashboard keeps for a signed-in staff member. Lives only inside
 * an encrypted, httpOnly cookie: browser JavaScript never sees the tokens.
 */
export interface Session {
  user: StaffUser;
  accessToken: string;
  /** Epoch milliseconds. */
  accessExpiresAt: number;
  refreshToken: string;
  /**
   * Epoch milliseconds when the session ends, whatever the activity: set at
   * sign-in and kept through refreshes.
   */
  expiresAt: number;
}

/** FinStack's token pair (login and refresh responses). */
export interface TokenPair {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

/** FinStack roles that may use the dashboard. */
export const STAFF_ROLES = ['support', 'risk', 'finance', 'admin'];
