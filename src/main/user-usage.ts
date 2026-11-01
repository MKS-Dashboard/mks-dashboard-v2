import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const userUsageEndpoint = "https://piet2001-mks.hf.space/users/log";

export function usageDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function createUserUsageLogger(
  file: string, appInfo: { versie: string; beta: boolean },
  request: typeof fetch = (input, init) => fetch(input, init), now = () => new Date(),
) {
  let days: Map<string, string> | null = null;
  let queue: Promise<void> = Promise.resolve();

  async function register(account: unknown): Promise<void> {
    if (!account || typeof account !== "object" || !("user_id" in account) || !("user_name" in account)) {
      throw new Error("Gebruiksregistratie: de accountgegevens bevatten geen speler-ID of spelersnaam.");
    }
    const userid = typeof account.user_id === "string" && /^\d+$/.test(account.user_id)
      ? Number(account.user_id) : account.user_id;
    const username = account.user_name;
    if (
      typeof userid !== "number" || !Number.isSafeInteger(userid) || userid <= 0 ||
      typeof username !== "string" || !username.trim() || username.length > 200
    ) {
      throw new Error("Gebruiksregistratie: de speler-ID of spelersnaam is ongeldig.");
    }
    if (!days) {
      const loaded = new Map<string, string>();
      if (existsSync(file)) {
        const saved: unknown = JSON.parse(await readFile(file, "utf8"));
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
          throw new Error("De opgeslagen daglimiet voor gebruiksregistratie is ongeldig.");
        }
        for (const [id, day] of Object.entries(saved)) {
          if (!/^\d+$/.test(id) || typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            throw new Error("De opgeslagen daglimiet voor gebruiksregistratie is ongeldig.");
          }
          loaded.set(id, day);
        }
      }
      days = loaded;
    }
    const day = usageDay(now());
    if (days.get(String(userid)) === day) return;
    const response = await request(userUsageEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ userid, username: username.trim(), versie: appInfo.versie, beta: appInfo.beta }),
      redirect: "manual",
      credentials: "omit",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Gebruiksregistratie is mislukt (HTTP ${response.status}). Je kunt het dashboard blijven gebruiken.`);
    }
    days.set(String(userid), day);
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(Object.fromEntries(days)), "utf8");
      await rename(temporary, file);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }

  return (account: unknown): Promise<void> => {
    const result = queue.then(() => register(account));
    queue = result.then(() => {}, () => {});
    return result;
  };
}
