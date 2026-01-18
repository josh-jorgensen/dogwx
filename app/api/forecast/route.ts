import { NextResponse } from "next/server";
import { buildForecast } from "../../../lib/forecast";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationQuery = searchParams.get("location");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    const result = await buildForecast({
      locationQuery,
      latitude: lat ? Number(lat) : undefined,
      longitude: lon ? Number(lon) : undefined
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to prepare forecast";
    return NextResponse.json(
      { error: message },
      {
        status: 400
      }
    );
  }
}
