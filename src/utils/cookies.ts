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
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || '.xynes.com',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    ...overrides,
  };
};
