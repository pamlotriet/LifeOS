import { describe, expect, it } from 'vitest';
import { generatePassword } from './password-generator';

describe('generatePassword', () => {
  it('uses every selected character group and requested length', () => {
    const value = generatePassword({ length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true });
    expect(value).toHaveLength(24); expect(value).toMatch(/[A-Z]/); expect(value).toMatch(/[a-z]/); expect(value).toMatch(/\d/); expect(value).toMatch(/[^\w]/);
  });
  it('rejects an empty character selection', () => {
    expect(() => generatePassword({ length: 20, uppercase: false, lowercase: false, numbers: false, symbols: false })).toThrow();
  });
});
