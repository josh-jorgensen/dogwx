import { scoreSuitability, type SuitabilityInputs } from "./suitability";

export type LocationRequest = {
  locationQuery?: string | null;
  latitude?: number;
  longitude?: number;
};

export type LocationSummary = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type ForecastSlice = {
  isoTime: string;
  localTimeLabel: string;
  parameters: SuitabilityInputs;
  suitability: ReturnType<typeof scoreSuitability>;
};

export type ForecastResponse = {
  location: LocationSummary;
  generatedAt: string;
  slices: ForecastSlice[];
  source: string;
};

export const DEFAULT_LOCATION = {
  name: "Central Park, NYC",
  latitude: 40.7812,
  longitude: -73.9665
};

const GEOCODE_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

type OpenMeteoResponse = {
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
  };
};

export async function buildForecast(
  params: LocationRequest = {}
): Promise<ForecastResponse> {
  const location = await resolveLocation(params);
  const forecast = await fetchOpenMeteo(location);

  const timeline = buildTimeline(forecast);

  return {
    location: {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: forecast.timezone
    },
    generatedAt: new Date().toISOString(),
    slices: timeline,
    source: "Open-Meteo.com"
  };
}

async function resolveLocation(params: LocationRequest) {
  if (typeof params.latitude === "number" && typeof params.longitude === "number") {
    return {
      name: params.locationQuery?.trim() || DEFAULT_LOCATION.name,
      latitude: params.latitude,
      longitude: params.longitude
    };
  }

  const normalizedQuery = params.locationQuery?.trim();
  if (
    normalizedQuery &&
    normalizedQuery.localeCompare(DEFAULT_LOCATION.name, undefined, {
      sensitivity: "accent"
    }) === 0
  ) {
    return DEFAULT_LOCATION;
  }

  if (params.locationQuery && params.locationQuery.trim().length > 0) {
    const name = params.locationQuery.trim();
    const query = new URLSearchParams({
      name,
      count: "1",
      language: "en",
      format: "json"
    });
    const response = await fetch(`${GEOCODE_ENDPOINT}?${query.toString()}`);
    if (!response.ok) {
      throw new Error("Unable to resolve the requested location");
    }
    const data = await response.json();
    if (!data.results?.length) {
      throw new Error("No matching location found");
    }
    const match = data.results[0];
    return {
      name: `${match.name}${match.admin1 ? `, ${match.admin1}` : ""}`,
      latitude: match.latitude,
      longitude: match.longitude
    };
  }

  return DEFAULT_LOCATION;
}

async function fetchOpenMeteo(location: {
  latitude: number;
  longitude: number;
}) {
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    hourly:
      "temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m",
    current_weather: "true",
    timezone: "auto"
  });

  const response = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch forecast data");
  }

  return (await response.json()) as OpenMeteoResponse;
}

function buildTimeline(forecast: OpenMeteoResponse): ForecastSlice[] {
  const now = Date.now();
  const targetTimes = [0, 30, 60].map(
    (offsetMinutes) => new Date(now + offsetMinutes * 60 * 1000)
  );

  const hourlyTimes = forecast.hourly.time.map((iso) => new Date(iso));

  return targetTimes.map((target) => {
    const parameters: SuitabilityInputs = {
      temperatureC: sampleSeries(
        hourlyTimes,
        forecast.hourly.temperature_2m,
        target
      ),
      apparentTemperatureC: sampleSeries(
        hourlyTimes,
        forecast.hourly.apparent_temperature,
        target
      ),
      precipitationMm: sampleSeries(
        hourlyTimes,
        forecast.hourly.precipitation,
        target
      ),
      precipitationProbability: sampleSeries(
        hourlyTimes,
        forecast.hourly.precipitation_probability,
        target
      ),
      windSpeedKph: sampleSeries(
        hourlyTimes,
        forecast.hourly.wind_speed_10m,
        target
      )
    };

    const suitability = scoreSuitability(parameters);

    return {
      isoTime: target.toISOString(),
      localTimeLabel: formatLocalLabel(target, forecast.timezone),
      parameters,
      suitability
    };
  });
}

function sampleSeries(
  timestamps: Date[],
  values: number[],
  target: Date
): number {
  if (!timestamps.length) {
    return values[0] ?? 0;
  }

  if (target <= timestamps[0]) {
    return values[0];
  }

  for (let i = 0; i < timestamps.length - 1; i += 1) {
    const start = timestamps[i];
    const end = timestamps[i + 1];
    if (target >= start && target <= end) {
      const ratio =
        (target.getTime() - start.getTime()) /
        (end.getTime() - start.getTime());
      return interpolate(values[i], values[i + 1], ratio);
    }
  }

  return values[values.length - 1];
}

function interpolate(a: number, b: number, ratio: number) {
  return a + (b - a) * ratio;
}

function formatLocalLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(date);
}
