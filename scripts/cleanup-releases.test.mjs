import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { cleanupReleases, obsoleteReleases } from "./cleanup-releases.mjs";

test("workflow cleans up only after successful publication, not PRs or manual builds", async () => {
  const workflow = (await readFile(new URL("../.github/workflows/windows-installer.yml", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  const start = workflow.indexOf("      - name: Remove old releases\n");
  assert.ok(start > workflow.indexOf("      - name: Publish Stable release\n"));
  const step = workflow.slice(start, workflow.indexOf("\n      - name:", start + 1));
  assert.ok(step.includes("if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/dev' || startsWith(github.ref, 'refs/tags/v'))"));
  assert.ok(step.includes("run: node scripts/cleanup-releases.mjs"));
  assert.ok(!step.includes("always()"));
});

function release(id, beta = false) {
  return {
    id, draft: false, prerelease: beta,
    tag_name: `v2026.10.31.12.${String(id % 100).padStart(2, "0")}${beta ? "-beta" : ""}`,
  };
}

test("keeps exactly ten newest numeric versions per channel regardless of API ordering", () => {
  const stable = Array.from({ length: 12 }, (_, index) => release(index + 1));
  const beta = Array.from({ length: 13 }, (_, index) => release(index + 21, true));
  assert.deepEqual(obsoleteReleases([...stable, ...beta]).map(({ id }) => id), [2, 1, 23, 22, 21]);
  assert.deepEqual(obsoleteReleases(stable.slice(0, 10)), []);
  assert.deepEqual(obsoleteReleases(beta.slice(0, 3)), []);
});

test("drafts, unknown tags and mismatched channels are never deleted or counted", () => {
  const ignored = [
    { ...release(50), draft: true },
    { ...release(51), tag_name: "v0.1.0" },
    { ...release(52), prerelease: true },
  ];
  assert.deepEqual(obsoleteReleases([...ignored, ...Array.from({ length: 10 }, (_, i) => release(i + 1))]), []);
  assert.throws(() => obsoleteReleases([{ id: 1 }]), /ongeldige releasegegevens/);
});

test("legacy Beta versions share numeric ordering with current Beta tags", () => {
  const legacy = { ...release(1, true), tag_name: "v2026.1031.1200-beta.99" };
  const newer = Array.from({ length: 10 }, (_, i) => release(i + 2, true));
  assert.deepEqual(obsoleteReleases([legacy, ...newer]), [legacy]);
});

test("loads all pages before deletion and deletes each release before its tag", async () => {
  const first = Array.from({ length: 100 }, (_, i) => ({ ...release(i + 1), draft: true }));
  const second = Array.from({ length: 11 }, (_, i) => release(i + 101));
  const calls = [];
  await cleanupReleases("test-placeholder", async (url, options) => {
    calls.push([url, options.method]);
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(url.endsWith("page=1") ? first : second);
  });
  assert.equal(calls.length, 4);
  assert.ok(calls[0][0].endsWith("page=1"));
  assert.ok(calls[1][0].endsWith("page=2"));
  assert.ok(calls[2][0].endsWith("/releases/101"));
  assert.equal(calls[2][1], "DELETE");
  assert.ok(calls[3][0].endsWith("/git/refs/tags/v2026.10.31.12.01"));
  assert.equal(calls[3][1], "DELETE");
});

test("tag deletion failures are reported explicitly", async () => {
  await assert.rejects(cleanupReleases("test", async (url, options) => {
    if (url.includes("/git/refs/")) return new Response(null, { status: 403 });
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json(Array.from({ length: 11 }, (_, i) => release(i + 1)));
  }), /Tag.*HTTP 403/);
});

test("API failures are explicit and failed listing never deletes anything", async () => {
  await assert.rejects(cleanupReleases(""), /GH_TOKEN/);
  await assert.rejects(cleanupReleases("test", async () => new Response(null, { status: 403 })), /HTTP 403/);
  const deletions = [];
  await assert.rejects(cleanupReleases("test", async (url, options) => {
    if (options.method === "DELETE") {
      deletions.push(url);
      return new Response(null, { status: 500 });
    }
    return Response.json(Array.from({ length: 11 }, (_, i) => release(i + 1)));
  }), /verwijderen.*HTTP 500/);
  assert.equal(deletions.length, 1);
  assert.ok(deletions[0].endsWith("/releases/1"));
});
