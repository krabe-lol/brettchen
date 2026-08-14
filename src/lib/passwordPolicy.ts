/** Keep in sync with MIN_PASSWORD_LENGTH in cms/src/api/auth/controllers/auth.ts. */
export const MIN_PASSWORD_LENGTH = 16

/** Same rule as containsUsername() in cms/src/api/auth/controllers/auth.ts. */
export function passwordContainsUsername(password: string, username: string): boolean {
  return password.toLowerCase().includes(username.trim().toLowerCase())
}
