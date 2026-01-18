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
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(forecast.generatedAt));

  const cards = forecast.slices
    .map(
      (slice, index) => `
        <section style="border-radius:16px;border-top:6px solid ${badgeColor(
          slice.suitability.badge
        )};background:#f7f7f9;padding:16px;margin-bottom:16px;">
          <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-family:Inter,Segoe UI,sans-serif;">
            <div>
              <p style="margin:0;font-size:0.9rem;color:#475569;">${
                slice.localTimeLabel
              }${index === 0 ? " · now" : ""}</p>
              <strong style="font-size:1rem;color:#0f172a;">${
                slice.suitability.summary
              }</strong>
            </div>
            <div style="text-align:right;">
              <span style="display:block;font-size:1.75rem;font-weight:600;color:#0f172a;">${
                slice.suitability.score
              }</span>
              <span style="color:${badgeColor(
                slice.suitability.badge
              )};font-weight:600;">${slice.suitability.badge}</span>
            </div>
          </header>
          <table style="width:100%;border-collapse:collapse;font-size:0.95rem;color:#0f172a;">
            <tbody>
              <tr>
                <td style="padding:6px 0;color:#475569;">Temp</td>
                <td style="padding:6px 0;font-weight:600;">${formatTemp(
                  slice.parameters.temperatureC
                )}</td>
                <td style="padding:6px 0;color:#475569;">Feels like</td>
                <td style="padding:6px 0;font-weight:600;">${formatTemp(
                  slice.parameters.apparentTemperatureC
                )}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#475569;">Precip chance</td>
                <td style="padding:6px 0;font-weight:600;">${slice.parameters.precipitationProbability.toFixed(
                  0
                )}%</td>
                <td style="padding:6px 0;color:#475569;">Rain rate</td>
                <td style="padding:6px 0;font-weight:600;">${slice.parameters.precipitationMm.toFixed(
                  2
                )} mm</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#475569;">Wind</td>
                <td style="padding:6px 0;font-weight:600;">${formatWind(
                  slice.parameters.windSpeedKph
                )}</td>
                <td style="padding:6px 0;color:#475569;">Factors</td>
                <td style="padding:6px 0;font-weight:600;">${
                  slice.suitability.factors.length
                    ? slice.suitability.factors.join(" · ")
                    : "Nothing notable"
                }</td>
              </tr>
            </tbody>
          </table>
        </section>
      `
    )
    .join("");

  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;background:#ecd0c2;padding:28px;">
      <main style="max-width:640px;margin:0 auto;background:#fdfdfd;border-radius:20px;padding:32px;box-shadow:0 20px 55px rgba(15,23,42,0.18);">
        <header style="margin-bottom:20px;">
          <p style="margin:0;color:#475569;font-size:0.9rem;">${generatedAt}</p>
          <h1 style="margin:4px 0;font-size:2rem;color:#0f172a;font-weight:700;">DogWx</h1>
          <p style="margin:0;color:#475569;font-size:1rem;">${
            forecast.location.name
          } · A weather index for dog walking</p>
          <p style="margin:12px 0 0;color:#0f172a;font-weight:600;">
            Best window: ${forecast.slices
              .slice()
              .sort(
                (a, b) => b.suitability.score - a.suitability.score
              )[0].localTimeLabel} (${forecast.slices
    .slice()
    .sort((a, b) => b.suitability.score - a.suitability.score)[0]
    .suitability.summary})
          </p>
        </header>
        ${cards}
        <footer style="margin-top:24px;font-size:0.85rem;color:#6b7280;text-align:center;">
          Remember to adjust timing if sidewalks are icy or scorching. Reply to tweak your default location.
        </footer>
      </main>
    </div>
  `;
}

function badgeColor(badge: ForecastResponse["slices"][number]["suitability"]["badge"]) {
  if (badge === "Prime") return "#0b8457";
  if (badge === "Fair") return "#c97704";
  return "#b91c1c";
}

function formatTemp(value: number) {
  const f = value * (9 / 5) + 32;
  return `${f.toFixed(0)}°F (${value.toFixed(0)}°C)`;
}

function formatWind(kph: number) {
  const mph = kph * 0.621371;
  return `${mph.toFixed(0)} mph`;
}
