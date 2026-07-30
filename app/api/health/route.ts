export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "starving-artists",
    time: new Date().toISOString(),
  });
}
