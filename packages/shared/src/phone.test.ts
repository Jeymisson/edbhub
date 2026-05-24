import { describe, expect, it } from 'vitest'
import { normalizePhone, isValidPhone } from './phone'

describe('normalizePhone', () => {
  it('normalizes a formatted Brazilian mobile to E.164', () => {
    expect(normalizePhone('(11) 98765-4321')).toBe('+5511987654321')
  })

  it('normalizes a digits-only Brazilian mobile to E.164', () => {
    expect(normalizePhone('11987654321')).toBe('+5511987654321')
  })

  it('preserves an already-canonical E.164 number', () => {
    expect(normalizePhone('+5511987654321')).toBe('+5511987654321')
  })

  it('returns null for unparseable input', () => {
    expect(normalizePhone('not a phone')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(normalizePhone('')).toBeNull()
  })
})

describe('isValidPhone', () => {
  it('accepts a valid Brazilian mobile in any common format', () => {
    expect(isValidPhone('(11) 98765-4321')).toBe(true)
    expect(isValidPhone('11987654321')).toBe(true)
    expect(isValidPhone('+5511987654321')).toBe(true)
  })

  it('rejects clearly invalid numbers', () => {
    expect(isValidPhone('123')).toBe(false)
    expect(isValidPhone('not a phone')).toBe(false)
  })
})
