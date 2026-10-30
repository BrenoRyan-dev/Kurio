// ETH como string decimal; cálculo em BigInt com 18 casas (sem float).
const SCALE = 10n ** 18n
export const toUnits = (s: string): bigint => {
  const [i, f = ''] = s.split('.')
  return BigInt(i || '0') * SCALE + BigInt(f.padEnd(18, '0').slice(0, 18))
}
export const fromUnits = (u: bigint): string => {
  const int = u / SCALE
  let frac = (u % SCALE).toString().padStart(18, '0').replace(/0+$/, '')
  if (frac.length < 2) frac = frac.padEnd(2, '0')
  return `${int}.${frac}`
}
export const percent = (u: bigint, p: number) => (u * BigInt(p)) / 100n
