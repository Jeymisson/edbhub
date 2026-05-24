import { describe, expect, it } from 'vitest'
import { isValidCpf, normalizeCpf } from './cpf'

describe('normalizeCpf', () => {
  it('strips non-digit characters', () => {
    expect(normalizeCpf('123.456.789-09')).toBe('12345678909')
  })

  it('returns digits unchanged when already canonical', () => {
    expect(normalizeCpf('12345678909')).toBe('12345678909')
  })

  it('returns empty string for non-digit input', () => {
    expect(normalizeCpf('abc')).toBe('')
  })
})

describe('isValidCpf', () => {
  it('accepts a well-formed CPF with valid check digits', () => {
    expect(isValidCpf('52998224725')).toBe(true)
  })

  it('accepts the same CPF in formatted form', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
  })

  it('rejects a CPF with wrong check digits', () => {
    expect(isValidCpf('52998224700')).toBe(false)
  })

  it('rejects strings shorter than 11 digits', () => {
    expect(isValidCpf('1234567890')).toBe(false)
  })

  it('rejects strings longer than 11 digits', () => {
    expect(isValidCpf('123456789090')).toBe(false)
  })

  it('rejects 11 identical digits', () => {
    for (const d of '0123456789') {
      expect(isValidCpf(d.repeat(11))).toBe(false)
    }
  })

  it('rejects empty input', () => {
    expect(isValidCpf('')).toBe(false)
  })
})
