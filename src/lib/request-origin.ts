/**
 * The origin the running application is reachable at, taken from the request
 * that is being handled.
 *
 * The design agent is told to call this app's own API with curl, so the origin
 * it is given has to be the instance that spawned the request. Hardcoding a
 * port sends those writes to whatever happens to be listening there, or to
 * nothing at all. `/start [port]`, `PORT` and `/stop [port]` all support running
 * somewhere other than 3000.
 *
 * The `host` header is the authority the client actually reached, so it carries
 * the real port. The protocol comes from the request URL.
 */
export function resolveAppOrigin(request: Request): string {
  const host = request.headers.get("host");

  try {
    const url = new URL(request.url);
    return host ? `${url.protocol}//${host}` : url.origin;
  } catch {
    // request.url is malformed or relative; the host header is still usable.
    return host ? `http://${host}` : "http://localhost:3000";
  }
}
