import { NextResponse } from "next/server";
import { isClaudeAvailable } from "@/lib/claude-path";
import { resolveAppOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  // `baseUrl` is the origin the design agent will be told to call. Reporting it
  // here makes a port mismatch visible without having to start a chat.
  return NextResponse.json({
    available: isClaudeAvailable(),
    baseUrl: resolveAppOrigin(request),
  });
}
