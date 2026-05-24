export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, '')
}

export function isValidCpf(input: string): boolean {
  const digits = normalizeCpf(input)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calcCheckDigit = (slice: string, weightStart: number): number => {
    let sum = 0
    for (let i = 0; i < slice.length; i++) {
      sum += Number(slice[i]) * (weightStart - i)
    }
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  const firstCheck = calcCheckDigit(digits.slice(0, 9), 10)
  if (firstCheck !== Number(digits[9])) return false

  const secondCheck = calcCheckDigit(digits.slice(0, 10), 11)
  if (secondCheck !== Number(digits[10])) return false

  return true
}
