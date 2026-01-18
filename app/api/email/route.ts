import { NextResponse } from "next/server";
import { buildForecast } from "../../../lib/forecast";
import { sendForecastEmail } from "../../../lib/email";

const TOKEN_ENV_VAR = "DOGWALK_EMAIL_TOKEN";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload.email !== "string") {
    return NextResponse.json(
      { error: "An email address is required" },
      { status: 400 }
    );
  }

  if (!isAuthorized(request, payload?.token)) {
    return NextResponse.json(
      { error: "Missing or invalid access token" },
      { status: 401 }
    );
  }

  try {
    const forecast = await buildForecast({
      locationQuery:
        typeof payload.location === "string" ? payload.location : undefined,
      latitude:
        typeof payload.latitude === "number" ? payload.latitude : undefined,
      longitude:
        typeof payload.longitude === "number" ? payload.longitude : undefined
    });

    await sendForecastEmail({
      to: payload.email,
      forecast
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isAuthorized(request: Request, tokenFromBody?: string) {
  const requiredToken = process.env[TOKEN_ENV_VAR];
  if (!requiredToken) {
    return true;
  }

  const headerToken = request.headers.get("authorization");
  const normalizedHeader = headerToken?.replace("Bearer", "").trim();
  const normalizedBody = tokenFromBody?.trim();
  return normalizedHeader === requiredToken || normalizedBody === requiredToken;
}
