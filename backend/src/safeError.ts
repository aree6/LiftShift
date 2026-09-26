// Public-facing error messages must never leak internals (Puppeteer paths,
// upstream HTML bodies, stack fragments) to clients. 4xx/504 messages are
// curated for UX and pass through; bare 500s become a generic message while
// the real detail stays in server logs.
const GENERIC_500 = 'Something went wrong. Please try again.';

export const publicErrorMessage = (status: number, message: unknown, fallback: string): string => {
  if (typeof message === 'string' && message.trim()) {
    if (status !== 500) return message;
    return GENERIC_500;
  }
  return fallback;
};
