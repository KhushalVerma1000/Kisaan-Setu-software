// Next.js middleware entry point — must be named middleware.ts in src/ or
// the project root. proxy.ts holds the actual auth logic and matcher config;
// we re-export from here so the file can be kept in a logical location.
export { proxy as middleware, config } from './proxy';
