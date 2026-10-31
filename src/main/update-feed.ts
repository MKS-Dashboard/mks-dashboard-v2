const RELEASES_URL = "https://api.github.com/repos/MKS-Dashboard/mks-dashboard-v2/releases";
const DOWNLOAD_URL = "https://github.com/MKS-Dashboard/mks-dashboard-v2/releases/download";

export async function getUpdateFeed(
  isDevChannel: boolean,
  request: typeof fetch = fetch,
): Promise<string> {
  let newest: { tag: string; version: number[] } | undefined;

  for (let page = 1; ; page++) {
    const response = await request(`${RELEASES_URL}?per_page=100&page=${page}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`GitHub-releases ophalen is mislukt (HTTP ${response.status}).`);
    }
    const releases: unknown = await response.json();
    if (!Array.isArray(releases)) {
      throw new Error("GitHub heeft een ongeldige releaselijst teruggegeven.");
    }

    for (const release of releases) {
      if (
        !release || typeof release !== "object" ||
        typeof release.tag_name !== "string" ||
        typeof release.draft !== "boolean" ||
        typeof release.prerelease !== "boolean"
      ) {
        throw new Error("GitHub heeft ongeldige releasegegevens teruggegeven.");
      }
      if (release.draft || release.prerelease !== isDevChannel) continue;

      const match = /^v(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})(-beta)?$/.exec(release.tag_name);
      const legacyMatch = isDevChannel
        ? /^v(\d{4})\.(\d{2})(\d{2})\.(\d{2})(\d{2})-beta\.(\d+)$/.exec(release.tag_name)
        : null;
      if (match && Boolean(match[6]) !== isDevChannel) continue;
      if (!match && !legacyMatch) continue;

      let version: number[];
      if (match) {
        version = [...match.slice(1, 6).map(Number), 0];
      } else if (legacyMatch) {
        version = legacyMatch.slice(1).map(Number);
      } else {
        continue;
      }
      const previousVersion = newest?.version;
      const differentPart = previousVersion
        ? version.findIndex((part, index) => part !== previousVersion[index])
        : -1;
      if (!newest || (differentPart !== -1 && version[differentPart] > newest.version[differentPart])) {
        newest = { tag: release.tag_name, version };
      }
    }
    if (releases.length < 100) break;
  }

  if (!newest) {
    throw new Error(`Er is nog geen gepubliceerde ${isDevChannel ? "Dev" : "Stable"}-release beschikbaar.`);
  }
  return `${DOWNLOAD_URL}/${encodeURIComponent(newest.tag)}`;
}
