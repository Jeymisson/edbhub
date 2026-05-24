import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function formatCpf(digits: string): string {
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164)
  return parsed ? parsed.formatInternational() : e164
}
