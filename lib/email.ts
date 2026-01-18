import type { ForecastResponse } from "./forecast";

const RESEND_API = "https://api.resend.com/emails";

export type EmailPayload = {
  to: string;
  forecast: ForecastResponse;
  subject?: string;
};

export async function sendForecastEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const from =
    process.env.RESEND_FROM ??
    "Dogwalk Index <dogwalk-index@updates.codex.app>";

  const html = renderEmailHtml(payload.forecast);

  const response = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject:
        payload.subject ??
        `Dogwalk suitability in ${payload.forecast.location.name}`,
      html
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend API error: ${message}`);
  }
}

function renderEmailHtml(forecast: ForecastResponse) {
  const rows = forecast.slices
    .map(
      (slice) => `
        <tr>
          <td style="padding:8px 12px;font-weight:600;">${slice.localTimeLabel}</td>
          <td style="padding:8px 12px;">${slice.suitability.score}/100 (${slice.suitability.badge})</td>
          <td style="padding:8px 12px;">${formatTemp(slice.parameters.temperatureC)}</td>
          <td style="padding:8px 12px;">${slice.parameters.precipitationProbability.toFixed(0)}%</td>
          <td style="padding:8px 12px;">${formatWind(
            slice.parameters.windSpeedKph
          )}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif;">
      <h2 style="margin-bottom:4px;">Dogwalk Index</h2>
      <p style="margin-top:0;color:#475569;">
        ${new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date(forecast.generatedAt))} — ${
          forecast.location.name
        }
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="text-align:left;background:#f1f5f9;">
            <th style="padding:8px 12px;">Time</th>
            <th style="padding:8px 12px;">Suitability</th>
            <th style="padding:8px 12px;">Temp</th>
            <th style="padding:8px 12px;">Precip</th>
            <th style="padding:8px 12px;">Wind</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function formatTemp(value: number) {
  const f = value * (9 / 5) + 32;
  return `${f.toFixed(0)}°F (${value.toFixed(0)}°C)`;
}

function formatWind(kph: number) {
  const mph = kph * 0.621371;
  return `${mph.toFixed(0)} mph`;
}
