/**
 * Local password sign-in using the app's Better Auth database.
 *
 * Customer UI maps a normalized Bangladesh mobile number to a private,
 * deterministic internal email alias, so customers can use phone + password
 * without an SMS provider. Because there is no OTP, ownership of a number is
 * NOT verified and password recovery by phone is not available.
 */
export const emailAndPasswordEnabled = true;
