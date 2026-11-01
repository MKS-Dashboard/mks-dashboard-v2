import { pathToFileURL } from "node:url";

export function obsoleteReleases(releases) {
  const channels = { stable: [], beta: [] };
  for (const release of releases) {
    if (
      !release || !Number.isSafeInteger(release.id) || release.id <= 0 ||
      typeof release.tag_name !== "string" ||
      typeof release.draft !== "boolean" || typeof release.prerelease !== "boolean"
    ) {
      throw new Error("GitHub heeft ongeldige releasegegevens teruggegeven.");
    }
    if (release.draft) continue;
    const match = /^v(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})(-beta)?$/.exec(release.tag_name);
    const legacy = release.prerelease
      ? /^v(\d{4})\.(\d{2})(\d{2})\.(\d{2})(\d{2})-beta\.(\d+)$/.exec(release.tag_name)
      : null;
    if (match && Boolean(match[6]) !== release.prerelease) continue;
    if (!match && !legacy) continue;
    const version = match ? [...match.slice(1, 6).map(Number), 0] : legacy.slice(1).map(Number);
    channels[release.prerelease ? "beta" : "stable"].push({ release, version });
  }
  return Object.values(channels).flatMap((channel) => {
    channel.sort((a, b) => {
      for (let index = 0; index < a.version.length; index++) {
        const difference = b.version[index] - a.version[index];
        if (difference) return difference;
      }
      return b.release.id - a.release.id;
    });
    return channel.slice(10).map(({ release }) => release);
  });
}

export async function cleanupReleases(token, request = fetch) {
  if (!token) throw new Error("GH_TOKEN ontbreekt; releases opruimen is niet mogelijk.");
  const url = "https://api.github.com/repos/MKS-Dashboard/mks-dashboard-v2/releases";
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const releases = [];
  for (let page = 1; ; page++) {
    const response = await request(`${url}?per_page=100&page=${page}`, {
      headers, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Releases ophalen is mislukt (HTTP ${response.status}).`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("GitHub heeft een ongeldige releaselijst teruggegeven.");
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  // Select before deleting so pagination cannot skip releases during cleanup.
  for (const release of obsoleteReleases(releases)) {
    const response = await request(`${url}/${release.id}`, {
      method: "DELETE", headers, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Release ${release.tag_name} verwijderen is mislukt (HTTP ${response.status}).`);
    }
    console.log(`Oude release verwijderd: ${release.tag_name}`);
    const tagResponse = await request(
      `https://api.github.com/repos/MKS-Dashboard/mks-dashboard-v2/git/refs/tags/${encodeURIComponent(release.tag_name)}`,
      { method: "DELETE", headers, signal: AbortSignal.timeout(30_000) },
    );
    if (!tagResponse.ok) {
      throw new Error(`Tag ${release.tag_name} verwijderen is mislukt (HTTP ${tagResponse.status}).`);
    }
    console.log(`Bijbehorende tag verwijderd: ${release.tag_name}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await cleanupReleases(process.env.GH_TOKEN);
}
