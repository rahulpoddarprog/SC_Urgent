/**
 * Verifies the provided password against the environment variable.
 * Works seamlessly in both local environments (reading from .env.local)
 * and Vercel deployments (reading from configured environment variables).
 */
export function verifyPassword(password: string): boolean {
  const correctPassword = process.env.APP_PASSWORD;

  // If no password is set, fallback or warning (default to false or true depending on setup)
  if (!correctPassword) {
    console.warn("APP_PASSWORD environment variable is not defined!");
    return false;
  }

  return password === correctPassword;
}
