/**
 * Pull a human-readable message out of a caught value.
 *
 * TypeScript types catch clauses as `unknown` under `strict`, which is
 * correct: `throw` accepts any value, so a caught thing is not necessarily an
 * Error. Annotating the catch variable as `any` silences that at the cost of
 * letting `err.message` blow up on a thrown string or object.
 *
 * Every call site here just wants something to show the user, so this
 * narrows safely and falls back to a caller-supplied message.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  // Supabase and fetch wrappers sometimes reject with a plain object that has
  // a message field but is not an Error instance.
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}
