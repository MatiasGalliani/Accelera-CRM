import admin from 'firebase-admin';
import crypto from 'crypto';

// In-memory store for reset codes (replace with persistent store in production)
const resetCodes = {};
const CODE_EXPIRY_MINUTES = 10;

/**
 * Generates a 6-digit reset code and stores it with expiry for the email.
 */
export async function generateResetCode(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000;
  resetCodes[email] = { code, expiresAt };
  return code;
}

/**
 * Verifies the reset code for the email.
 */
export async function verifyResetCode(email, code) {
  const entry = resetCodes[email];
  if (!entry) return false;
  if (entry.code !== code) return false;
  if (Date.now() > entry.expiresAt) {
    delete resetCodes[email];
    return false;
  }
  return true;
}

/**
 * Updates the user's password in Firebase Auth.
 */
export async function updatePassword(email, newPassword) {
  // Find user by email
  const user = await admin.auth().getUserByEmail(email);
  if (!user) throw new Error('User not found');
  // Update password
  await admin.auth().updateUser(user.uid, { password: newPassword });
  // Optionally, clear the reset code
  delete resetCodes[email];
  return true;
} 