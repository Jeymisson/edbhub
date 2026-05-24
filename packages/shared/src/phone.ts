import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizePhone(input: string): string | null {
  if (!input) return null
  const parsed = parsePhoneNumberFromString(input, 'BR')
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null
}
