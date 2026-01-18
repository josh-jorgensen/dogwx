export type SuitabilityInputs = {
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  precipitationProbability: number;
  windSpeedKph: number;
};

export type SuitabilityResult = {
  score: number;
  badge: "Prime" | "Fair" | "Poor";
  summary: string;
  factors: string[];
};

export function scoreSuitability(inputs: SuitabilityInputs): SuitabilityResult {
  let score = 100;
  const factors: string[] = [];

  const precipPenalty = Math.min(35, inputs.precipitationMm * 12);
  if (precipPenalty > 0) {
    score -= precipPenalty;
    factors.push(
      precipPenalty > 15
        ? "Steady rain expected"
        : "Light drizzle possible"
    );
  }

  if (inputs.precipitationProbability > 35) {
    const probabilityPenalty = ((inputs.precipitationProbability - 35) / 65) * 20;
    score -= probabilityPenalty;
    factors.push("Elevated chance of precipitation");
  }

  if (inputs.windSpeedKph > 24) {
    const windPenalty = Math.min(20, (inputs.windSpeedKph - 24) * 0.8);
    score -= windPenalty;
    factors.push("Breezy conditions");
  }

  const feelsLike = inputs.apparentTemperatureC;
  const comfortLowC = 10;
  const comfortHighC = 26;
  if (feelsLike < comfortLowC) {
    const coldPenalty = Math.min(40, (comfortLowC - feelsLike) * 1.7);
    score -= coldPenalty;
    if (feelsLike < 5) {
      factors.push("Bundle up");
    }
    if (feelsLike < -5) {
      factors.push("Watch for icy paws");
    }
  } else if (feelsLike > comfortHighC) {
    const heatPenalty = Math.min(35, (feelsLike - comfortHighC) * 1.5);
    score -= heatPenalty;
    factors.push("Warm and potentially uncomfortable");
    if (feelsLike > 30) {
      factors.push("Bring extra water");
    }
  }

  if (inputs.precipitationProbability > 55) {
    factors.push("Wear a rain jacket");
  }

  score = Math.max(0, Math.min(100, score));

  const badge = score >= 75 ? "Prime" : score >= 50 ? "Fair" : "Poor";
  const summary =
    badge === "Prime"
      ? "Great window for a walk"
      : badge === "Fair"
        ? "Acceptable with minor tradeoffs"
        : "Consider waiting for better conditions";

  return {
    score: Math.round(score),
    badge,
    summary,
    factors
  };
}
