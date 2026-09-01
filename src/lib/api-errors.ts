import { NextResponse } from "next/server";
import { DataFileCorruptError } from "./data";

/**
 * Maps a storage failure onto an HTTP response.
 *
 * Returns `null` when the error is not a storage failure, so callers can fall
 * through to their own handling. Route handlers wrap request parsing and data
 * access in the same `try`, and their catch blocks answer with a generic
 * 400 "Invalid request". Without this, a data file that no longer parses would
 * be reported to the user as though they had sent a malformed request.
 */
export function dataErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof DataFileCorruptError) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  return null;
}
