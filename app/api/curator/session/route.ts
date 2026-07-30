import {
  clearCuratorCookie,
  createCuratorSession,
  curatorCookie,
  curatorPasswordConfigured,
  curatorSessionConfigured,
  isCuratorRequest,
  passwordIsValid,
  sameOrigin,
} from "../../../lib/curator-auth";
import {
  rateLimitResponse,
  readJsonBody,
  requestErrorResponse,
} from "../../../lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json(
    {
      authenticated: await isCuratorRequest(request),
      configured:
        curatorPasswordConfigured() && curatorSessionConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!curatorPasswordConfigured()) {
    return Response.json(
      { error: "The curator password has not been configured." },
      { status: 503 },
    );
  }
  if (!curatorSessionConfigured()) {
    return Response.json(
      { error: "The curator session secret has not been configured." },
      { status: 503 },
    );
  }
  const limited = rateLimitResponse(request, "curator-login", {
    limit: 5,
    windowMs: 5 * 60_000,
  });
  if (limited) return limited;
  try {
    const body = await readJsonBody<{ password?: unknown }>(request, 4 * 1024);
    if (!(await passwordIsValid(body.password))) {
      return Response.json(
        { error: "Incorrect password." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    const session = await createCuratorSession();
    return Response.json(
      { authenticated: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": curatorCookie(session, request),
        },
      },
    );
  } catch (error) {
    const response = requestErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  return Response.json(
    { authenticated: false },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": clearCuratorCookie(request),
      },
    },
  );
}
