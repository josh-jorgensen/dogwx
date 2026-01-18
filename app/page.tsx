"use client";

import { useEffect, useMemo, useState } from "react";
import type { ForecastResponse } from "../lib/forecast";

const DEFAULT_LOCATION = "Central Park, NYC";

export default function HomePage() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailToken, setEmailToken] = useState("");

  useEffect(() => {
    void refreshForecast();
  }, []);

  async function refreshForecast(query?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = query ? `?location=${encodeURIComponent(query)}` : "";
      const response = await fetch(`/api/forecast${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to fetch forecast");
      }
      const payload = (await response.json()) as ForecastResponse;
      setForecast(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRequest() {
    if (!forecast) {
      return;
    }
    setEmailStatus("sending");
    setEmailMessage(null);
    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          location,
          token: emailToken || undefined
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to send email");
      }
      setEmailStatus("success");
      setEmailMessage("Email sent! Check your inbox in a moment.");
    } catch (err) {
      console.error(err);
      setEmailStatus("error");
      setEmailMessage(
        err instanceof Error ? err.message : "Unable to send email"
      );
    }
  }

  const headline = useMemo(() => {
    if (!forecast) {
      return null;
    }
    const bestSlice = [...forecast.slices].sort(
      (a, b) => b.suitability.score - a.suitability.score
    )[0];
    return `Best window: ${bestSlice.localTimeLabel} (${bestSlice.suitability.summary})`;
  }, [forecast]);

  const currentSlice = forecast?.slices[0] ?? null;

  return (
    <main className="app-shell">
      <section className="card hero-card">
        <header style={{ marginBottom: "0.5rem" }}>
          <h1 style={{ fontSize: "2.2rem", marginBottom: "0.35rem" }}>
            <em>DogWx</em>
          </h1>
          <p style={{ color: "#475569", fontSize: "1rem" }}>
            A weather index for dog walking
          </p>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void refreshForecast(location);
          }}
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "flex-end"
          }}
        >
          <label style={{ flex: "1 1 260px" }}>
            <span
              style={{
                display: "block",
                marginBottom: "0.35rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#475569"
              }}
            >
              Location
            </span>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Neighborhood, city"
              style={{
                width: "100%",
                padding: "0.75rem 0.9rem",
                borderRadius: "12px",
                border: "1px solid #d3d7df",
                fontSize: "1rem",
                backgroundColor: "#f6f6f8"
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "12px",
              border: "none",
              fontWeight: 600,
              backgroundColor: "#0f274a",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            Update forecast
          </button>
        </form>
      </section>

      {loading && (
        <section className="card">
          <p>Fetching the latest weather data…</p>
        </section>
      )}

      {error && (
        <section className="card" style={{ border: "1px solid #fecdd3" }}>
          <p style={{ color: "#be123c" }}>{error}</p>
        </section>
      )}

      {forecast && !loading && (
        <>
          <section className="content-grid">
            <div className="primary-column">
              <section className="card" style={{ marginBottom: "0.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <h2 style={{ marginBottom: "0.4rem", fontSize: "1.35rem" }}>
                      {forecast.location.name}
                    </h2>
                    <p style={{ color: "#475569" }}>{headline}</p>
                  </div>
                  <small style={{ color: "#64748b" }}>
                    Updated {new Date(forecast.generatedAt).toLocaleTimeString()}
                  </small>
                </div>
              </section>
              {currentSlice && <CurrentConditions slice={currentSlice} />}
              <div className="forecast-cards">
                {forecast.slices.map((slice) => (
                  <SuitabilityCard key={slice.isoTime} slice={slice} />
                ))}
              </div>
            </div>
            <div className="secondary-column">
              <EmailCard
                email={email}
                emailToken={emailToken}
                emailStatus={emailStatus}
                emailMessage={emailMessage}
                onEmailChange={(value) => setEmail(value)}
                onTokenChange={(value) => setEmailToken(value)}
                onSend={() => void handleEmailRequest()}
                disabled={!email || !emailToken || emailStatus === "sending"}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function CurrentConditions({
  slice
}: {
  slice: ForecastResponse["slices"][number];
}) {
  const badgeColor = getBadgeColor(slice.suitability.badge);

  return (
    <section
      className="card"
      style={{
        marginBottom: "0.5rem",
        borderTop: `8px solid ${badgeColor}`,
        borderTopLeftRadius: 18
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h3 style={{ marginBottom: "0.15rem" }}>Current conditions</h3>
          <p style={{ color: "#475569", margin: 0, fontSize: "0.95rem" }}>
            As of {slice.localTimeLabel}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
            {slice.suitability.score}
          </p>
          <span style={{ color: badgeColor, fontWeight: 600 }}>
            {slice.suitability.badge} · {slice.suitability.summary}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1.25rem",
          marginTop: "0.75rem"
        }}
      >
        <span style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
          <small style={{ color: "#475569", fontSize: "0.85rem" }}>Temp</small>
          <strong style={{ fontSize: "1.05rem" }}>
            <TemperaturePair valueC={slice.parameters.temperatureC} />
          </strong>
        </span>
        <span style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
          <small style={{ color: "#475569", fontSize: "0.85rem" }}>Feels like</small>
          <strong style={{ fontSize: "1.05rem" }}>
            <TemperaturePair valueC={slice.parameters.apparentTemperatureC} />
          </strong>
        </span>
        <span style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
          <small style={{ color: "#475569", fontSize: "0.85rem" }}>Precip</small>
          <strong style={{ fontSize: "1.05rem" }}>
            {slice.parameters.precipitationProbability.toFixed(0)}%
          </strong>
        </span>
      </div>
    </section>
  );
}

function EmailCard({
  email,
  emailToken,
  emailStatus,
  emailMessage,
  onEmailChange,
  onTokenChange,
  onSend,
  disabled
}: {
  email: string;
  emailToken: string;
  emailStatus: "idle" | "sending" | "success" | "error";
  emailMessage: string | null;
  onEmailChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <article
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        borderTop: "8px solid #0f274a",
        borderTopLeftRadius: 18,
        minHeight: "100%"
      }}
    >
      <div>
        <h3 style={{ marginBottom: "0.4rem" }}>Email this mini forecast</h3>
        <p style={{ color: "#475569", fontSize: "0.95rem", margin: 0 }}>
          Send a snapshot right now or wire this endpoint to Vercel Cron for a
          daily reminder.
        </p>
      </div>
      <input
        type="email"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="you@example.com"
        style={{
          padding: "0.7rem 0.9rem",
          borderRadius: "12px",
          border: "1px solid #cbd5f5",
          backgroundColor: "#f6f6f8"
        }}
      />
      <input
        type="password"
        value={emailToken}
        onChange={(event) => onTokenChange(event.target.value)}
        placeholder="Access token"
        style={{
          padding: "0.7rem 0.9rem",
          borderRadius: "12px",
          border: "1px solid #cbd5f5",
          backgroundColor: "#f6f6f8"
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        style={{
          padding: "0.75rem 1.1rem",
          borderRadius: "12px",
          border: "none",
          backgroundColor: "#0f274a",
          color: "#fff",
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.65 : 1
        }}
      >
        {emailStatus === "sending" ? "Sending…" : "Send me email"}
      </button>
      {emailMessage && (
        <span
          style={{
            color: emailStatus === "error" ? "#b91c1c" : "#16a34a",
            fontWeight: 600
          }}
        >
          {emailMessage}
        </span>
      )}
    </article>
  );
}

function SuitabilityCard({
  slice
}: {
  slice: ForecastResponse["slices"][number];
}) {
  const badgeColor = getBadgeColor(slice.suitability.badge);

  return (
    <article
      className="card"
      style={{
        borderTop: `8px solid ${badgeColor}`,
        borderTopLeftRadius: 18,
        height: "100%"
      }}
    >
      <div style={{ marginBottom: "0.75rem" }}>
        <h3 style={{ marginBottom: "0.25rem" }}>{slice.localTimeLabel}</h3>
        <p style={{ color: "#475569" }}>{slice.suitability.summary}</p>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <span style={{ fontSize: "2.5rem", fontWeight: 700 }}>
          {slice.suitability.score}
        </span>
        <span style={{ color: badgeColor, fontWeight: 600 }}>
          {slice.suitability.badge}
        </span>
      </div>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "0.3rem",
          margin: "0.75rem 0"
        }}
      >
        <MiniStat label="Temp">
          <TempDisplay tempC={slice.parameters.temperatureC} />
        </MiniStat>
        <MiniStat label="Feels like">
          <TempDisplay tempC={slice.parameters.apparentTemperatureC} />
        </MiniStat>
        <MiniStat label="Precip chance">
          {slice.parameters.precipitationProbability.toFixed(0)}%
        </MiniStat>
        <MiniStat label="Rain rate">
          {slice.parameters.precipitationMm.toFixed(2)} mm
        </MiniStat>
        <MiniStat label="Wind">
          {formatWind(slice.parameters.windSpeedKph)}
        </MiniStat>
      </dl>
      {slice.suitability.factors.length > 0 && (
        <ul style={{ paddingLeft: "1rem", color: "#475569", margin: 0 }}>
          {slice.suitability.factors.map((factor) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function MiniStat({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt style={{ fontSize: "0.95rem", color: "#475569" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, fontSize: "1.05rem" }}>
        {children}
      </dd>
    </div>
  );
}

function TempDisplay({ tempC }: { tempC: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
        <TemperaturePair valueC={tempC} primary="imperial" />
      </span>
      <span style={{ fontSize: "0.85rem", color: "#0f172a", opacity: 0.75 }}>
        <TemperaturePair valueC={tempC} primary="metric" />
      </span>
    </div>
  );
}

function TemperaturePair({
  valueC,
  primary
}: {
  valueC: number;
  primary?: "imperial" | "metric";
}) {
  const tempF = (valueC * 9) / 5 + 32;
  const formattedF = `${tempF.toFixed(0)}\u00b0F`;
  const formattedC = `${valueC.toFixed(0)}\u00b0C`;
  if (primary === "imperial") {
    return <>{formattedF}</>;
  }
  if (primary === "metric") {
    return <>{formattedC}</>;
  }
  return (
    <>
      {formattedF} / {formattedC}
    </>
  );
}

function getBadgeColor(badge: "Prime" | "Fair" | "Poor") {
  if (badge === "Prime") {
    return "#0b8457";
  }
  if (badge === "Fair") {
    return "#c97704";
  }
  return "#b91c1c";
}

function formatWind(kph: number) {
  const mph = kph * 0.621371;
  return `${mph.toFixed(0)} mph`;
}
