import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no refresh cookie means signed out, so skip the page and go to sign-in.
// A cookie that is there but expired is caught by the page itself (the API answers 401)
export function proxy(request: NextRequest) {
  if (request.cookies.has("refresh_token")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

// Pages that need an account; grows with the owner and booking screens
export const config = {
  matcher: ["/profile/:path*", "/business/:path*"],
};
