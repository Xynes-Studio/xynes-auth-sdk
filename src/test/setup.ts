import '@testing-library/jest-dom/vitest';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com';
process.env.NEXT_PUBLIC_AUTH_APP_URL = 'https://auth.test.com';
