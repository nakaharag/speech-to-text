import { describe, it, expect } from 'vitest';
import { validatePassword, hashPassword, verifyPassword } from '@/lib/password';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('abc123').valid).toBe(false);
    expect(validatePassword('abc123').error).toContain('8 characters');
  });

  it('rejects passwords without letters', () => {
    expect(validatePassword('12345678').valid).toBe(false);
    expect(validatePassword('12345678').error).toContain('letter');
  });

  it('rejects passwords without numbers', () => {
    expect(validatePassword('abcdefgh').valid).toBe(false);
    expect(validatePassword('abcdefgh').error).toContain('number');
  });

  it('accepts valid passwords', () => {
    expect(validatePassword('password1').valid).toBe(true);
    expect(validatePassword('MyP@ssw0rd').valid).toBe(true);
    expect(validatePassword('12345678a').valid).toBe(true);
  });
});

describe('hashPassword and verifyPassword', () => {
  it('correctly hashes and verifies passwords', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects incorrect passwords', async () => {
    const hash = await hashPassword('correctPassword1');
    expect(await verifyPassword('wrongPassword1', hash)).toBe(false);
  });

  it('produces different hashes for same password', async () => {
    const password = 'samePassword1';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});
