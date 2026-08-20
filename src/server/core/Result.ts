// @/server/core/Result.ts
//
// Used at the repository boundary (LedgerAccountRepository, PartyRepository)
// so callers can distinguish "not found" from "validation failed" from "db
// error" without parsing error messages or relying on thrown-exception
// control flow for expected outcomes (a missing record is an expected
// outcome, not an exceptional one).
//
// Deliberately scoped to the repository layer for now, not applied
// everywhere. The application services in this module (LedgerAccountService,
// PartyService) unwrap Result back into thrown errors at their own outer
// boundary, so the ~15 existing consumer files (API routes, UI pages) don't
// all need their error handling rewritten in the same pass as this split.
// Worth extending outward later if it proves useful here.

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
    readonly ok: true;
    readonly value: T;
}

export interface Err<E> {
    readonly ok: false;
    readonly error: E;
}

export function ok<T>(value: T): Ok<T> {
    return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
    return { ok: false, error };
}

/** Unwraps a Result, throwing `error` (or a new Error from it) if it's an Err. */
export function unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) return result.value;
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
}

// Common repository error shapes — keep this small and closed rather than
// letting every repository invent its own ad-hoc error shape.
export type RepositoryError =
    | { type: "not_found"; message: string }
    | { type: "validation"; message: string }
    | { type: "conflict"; message: string }
    | { type: "database"; message: string; cause?: unknown };

export function notFound(message: string): RepositoryError {
    return { type: "not_found", message };
}

export function validationError(message: string): RepositoryError {
    return { type: "validation", message };
}

export function conflictError(message: string): RepositoryError {
    return { type: "conflict", message };
}

export function databaseError(message: string, cause?: unknown): RepositoryError {
    return { type: "database", message, cause };
}