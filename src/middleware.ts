// This middleware is the gatekeeper for your admin panel.
// It protects routes from unauthenticated access.

export { default } from "next-auth/middleware";

export const config = {
  // The matcher specifies which routes are protected.
  // This regex protects all routes except for those starting with:
  // - /api (API routes, including /api/auth)
  // - /login (the login page)
  // - /_next/static (static files)
  // - /_next/image (image optimization files)
  // - /favicon.ico (favicon file)
  matcher: [
    '/((?!api|login|_next/static|_next/image|favicon.ico).*)',
  ],
};
