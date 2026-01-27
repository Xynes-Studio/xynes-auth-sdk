# Security Features

This document details the security features implemented in the `@xynes/auth-sdk`.

## Secure Cookie Configuration (SEC-FE-1.1)

The SDK provides a centralized configuration for secure cookies to ensure protection against XSS and CSRF attacks.

### Configuration Rules

| Option | Value | Reason |
|--------|-------|--------|
| `httpOnly` | `true` | Prevents JavaScript access to cookies (mitigates XSS) |
| `secure` | `true` (prod) | Ensures cookies are only sent over HTTPS |
| `sameSite` | `'lax'` | Provides CSRF protection while allowing top-level navigation |
| `domain` | `.xynes.com` | Allows cookie sharing across subdomains |
| `maxAge` | 7 days | Matches session duration |

### Usage

```typescript
import { getCookieOptions } from '@xynes/auth-sdk';

// Get default options
const cookieOptions = getCookieOptions();

// Override specific options if needed
const customOptions = getCookieOptions({
  maxAge: 3600 // 1 hour
});
```

### Environment Variables

- `COOKIE_DOMAIN`: Override the default domain (default: `.xynes.com`)
- `NODE_ENV`: Controls `secure` flag (only true in 'production')
