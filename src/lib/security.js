/**
 * Web Crypto API-based secure hashing utility (SHA-256 with Salt)
 * Standard in all modern browsers without needing external dependencies.
 * Produces cryptographic hash outputs (e.g. 64-character hex strings or salted hashes).
 */

/**
 * Hash a password using SHA-256
 * @param {string} password - The raw password
 * @param {string} salt - Optional salt string
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashPassword(password, salt = 'wsd_academy_secure_salt_v1') {
  if (!password) return '';
  const text = `${salt}:${password}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify a password against a stored hash or plain password (for backward compatibility)
 * @param {string} inputPassword - The password entered by the user
 * @param {string} storedPasswordOrHash - The hash stored in DB
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, storedPasswordOrHash) {
  if (!inputPassword || !storedPasswordOrHash) return false;
  // If stored password is an exact SHA-256 hash match:
  const computedHash = await hashPassword(inputPassword);
  if (computedHash === storedPasswordOrHash) {
    return true;
  }
  // Backward compatibility fallback for pre-existing plain text records:
  if (inputPassword === storedPasswordOrHash) {
    return true;
  }
  return false;
}
