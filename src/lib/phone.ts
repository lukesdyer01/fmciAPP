/** Format North American phone numbers without truncating international numbers or extensions. */
export function formatPhoneNumber(value: string | null | undefined): string {
  const phone = (value ?? '').trim()
  if (!/^[+\d\s().-]+$/.test(phone)) return phone
  const digits = phone.replace(/\D/g, '')
  const hasCountryCode = digits.length === 11 && digits.startsWith('1')
  if (digits.length !== 10 && !hasCountryCode) return phone
  if (phone.startsWith('+') && !hasCountryCode) return phone
  const local = hasCountryCode ? digits.slice(1) : digits
  const formatted = `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
  return hasCountryCode ? `+1 ${formatted}` : formatted
}
