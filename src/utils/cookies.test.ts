import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCookieOptions } from './cookies';

describe('getCookieOptions', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it('should return secure options in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_DOMAIN', '.test.com');

    const options = getCookieOptions();

    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: '.test.com',
      maxAge: 604800, // 7 days in seconds
    });
  });

  it('should use default domain if COOKIE_DOMAIN is not set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_DOMAIN', ''); 

    const options = getCookieOptions();
    expect(options.domain).toBe('.xynes.com');
  });

  it('should not be secure and use host-only domain in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    
    const options = getCookieOptions();
    expect(options.secure).toBe(false);
    expect(options.domain).toBeUndefined();
  });

  it('should allow overriding defaults', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const options = getCookieOptions({
        maxAge: 3600
    });
    expect(options.maxAge).toBe(3600);
  });
});
