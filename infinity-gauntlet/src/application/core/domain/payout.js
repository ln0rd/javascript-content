/** Formats the account number with the correct format when the verification digit
 * is X (or x).
 *
 * This is necessary because Neon Bank rejects accounts in a different format
 * when making a payout (TED)
 *
 * @param account
 * @param digit
 * @returns {string}
 */
export function formatAccountNumber(account, digit) {
  return digit.toLowerCase() === 'x' ? `${account}0` : `${account}-${digit}`
}
