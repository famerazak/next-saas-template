export function buildRedirectUrl(request: Request, pathname: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1")) ? "http" : "https");

  if (!host) {
    return new URL(pathname, request.url);
  }

  return new URL(pathname, `${protocol}://${host}`);
}
