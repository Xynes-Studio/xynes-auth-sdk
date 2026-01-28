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
| `domain` | `.xynes.com` (prod) | Allows cookie sharing across subdomains (undefined in dev for localhost) |
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

## CSRF Protection (SEC-FE-1.3)

The SDK implements a Double Submit Cookie pattern for CSRF protection.

### How it Works

1. **Server-Side (Middleware):**
   - Generates a UUID token if not present
   - Sets it in an `httpOnly`, `Secure`, `SameSite=Strict` cookie
   - Sets it in the response header `x-csrf-token`

2. **Client-Side (Layout):**
   - extracting the token from headers
   - Injects it into a `<meta name="csrf-token">` tag

3. **SDK (Interceptor):**
   - Reads the token from the meta tag
   - Attaches it to every API request in the `x-csrf-token` header

### Usage

The protection is automatic when using `AccountsClient` or `createAccountsClient`.

```typescript
// Manual token retrieval if needed
import { getCsrfToken } from '@xynes/auth-sdk';

const token = getCsrfToken();
```

### Configuration

- **Cookie Name:** `csrf_token`
- **Header Name:** `x-csrf-token`
- **Meta Tag:** `csrf-token`
