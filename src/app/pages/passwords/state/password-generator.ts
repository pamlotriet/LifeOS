export interface PasswordOptions { length: number; uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean; }
export function generatePassword(options: PasswordOptions): string {
  const groups = [options.uppercase ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : '', options.lowercase ? 'abcdefghijkmnopqrstuvwxyz' : '', options.numbers ? '23456789' : '', options.symbols ? '!@#$%^&*()-_=+' : ''].filter(Boolean);
  if (!groups.length) throw new Error('Choose at least one character type.');
  const random = (max: number) => { const limit = Math.floor(256 / max) * max; const buffer = new Uint8Array(1); do crypto.getRandomValues(buffer); while (buffer[0] >= limit); return buffer[0] % max; };
  const result = groups.map((group) => group[random(group.length)]); const all = groups.join('');
  while (result.length < Math.max(options.length, groups.length)) result.push(all[random(all.length)]);
  for (let index = result.length - 1; index > 0; index--) { const target = random(index + 1); [result[index], result[target]] = [result[target], result[index]]; }
  return result.join('');
}
