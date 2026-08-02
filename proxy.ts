import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const [scheme, encodedCredentials] = authorization.split(" ");

    if (scheme === "Basic" && encodedCredentials) {
      const credentials = atob(encodedCredentials);
      const separatorIndex = credentials.indexOf(":");

      const username = credentials.slice(0, separatorIndex);
      const password = credentials.slice(separatorIndex + 1);

      const expectedUsername =
        process.env.ADMIN_USERNAME ?? "admin";
      const expectedPassword = process.env.ADMIN_PASSWORD;

      if (
        username === expectedUsername &&
        password === expectedPassword
      ) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Innlogging kreves", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Quizlix admin"',
    },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/review/:path*",
  ],
};
