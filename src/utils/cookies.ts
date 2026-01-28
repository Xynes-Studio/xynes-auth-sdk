export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  domain: string;
  maxAge: number;
}

export const getCookieOptions = (overrides?: Partial<CookieOptions>): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In development, leave domain undefined (host-only) to support localhost
  // In production, fallback to .xynes.com if COOKIE_DOMAIN not set
  const defaultDomain = isProduction 
    ? (process.env.COOKIE_DOMAIN || '.xynes.com')
    : undefined;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    domain: defaultDomain as string, // Cast for type compatibility if strictly typed
    maxAge: 60 * 60 * 24 * 7, // 7 days
    ...overrides,
  };
};
