import { gameLocales, type DashboardResourceResult } from "../shared/contracts";

export function referenceUrl(key: unknown): string {
  if (key === "suggestions") {
    return "https://api.github.com/repos/MKS-Dashboard/mks-dashboard.github.io/issues?state=open&per_page=100";
  }
  if (key === "missionUpdate") {
    return "https://api.github.com/repos/Piet2001/Missionfiles-All-Versions/branches/master";
  }
  if (typeof key === "string" && key.startsWith("missions:")) {
    const locale = gameLocales.find((locale) => key === `missions:${locale}`);
    if (locale) return `https://raw.githubusercontent.com/Piet2001/Missionfiles-All-Versions/master/Missions/${locale}.json`;
  }
  throw new Error("Deze openbare gegevensbron is niet toegestaan.");
}

export async function loadReference(key: unknown, request: typeof fetch = fetch): Promise<DashboardResourceResult> {
  const url = referenceUrl(key);
  try {
    const allIssues: unknown[] = [];
    for (let page = 1; ; page++) {
      const response = await request(key === "suggestions" ? `${url}&page=${page}` : url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Openbare gegevens ophalen is mislukt (HTTP ${response.status}).`);
      const data: unknown = await response.json();
      if (key !== "suggestions") return { ok: true, data };
      if (!Array.isArray(data)) throw new Error("GitHub heeft geen lijst met suggesties teruggegeven.");
      allIssues.push(...data);
      if (data.length < 100) return { ok: true, data: allIssues };
    }
  } catch (cause) {
    console.error(`Openbare gegevensbron ${String(key)} kon niet worden geladen:`, cause);
    return { ok: false, error: cause instanceof Error ? cause.message : "Openbare gegevens konden niet worden geladen." };
  }
}

export function allowedExternalUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("De link is ongeldig.");
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.username || url.password ||
    !["github.com", "meldkamerspel.com"].includes(url.hostname)
  ) {
    throw new Error("Deze externe link is niet toegestaan.");
  }
  return url.href;
}
