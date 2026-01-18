import { NextResponse } from "next/server";
import { buildForecast } from "../../../lib/forecast";
import { sendForecastEmail } from "../../../lib/email";

const RECIPIENT_ENV = "DOGWALK_CRON_EMAIL";
const LOCATION_ENV = "DOGWALK_CRON_LOCATION";
const LAT_ENV = "DOGWALK_CRON_LATITUDE";
const LNG_ENV = "DOGWALK_CRON_LONGITUDE";

export async function GET() {
  const recipient = process.env[RECIPIENT_ENV];

  if (!recipient) {
    return NextResponse.json(
      { error: `${RECIPIENT_ENV} environment variable is missing` },
      { status: 500 }
    );
  }

  try {
    const forecast = await buildForecast({
      locationQuery: process.env[LOCATION_ENV] || undefined,
      latitude: parseOptionalFloat(process.env[LAT_ENV]),
      longitude: parseOptionalFloat(process.env[LNG_ENV])
    });

    await sendForecastEmail({
      to: recipient,
      forecast
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send cron email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseOptionalFloat(value?: string) {
  if (!value?.length) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
