import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

async function prepare(channel, { tag, collision = false, status = 404, instant = "2026-10-31T12:02:59.999Z" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "mks-release-test-"));
  try {
    await mkdir(join(root, "scripts"));
    const script = join(root, "scripts", "prepare-release.mjs");
    await copyFile(new URL("./prepare-release.mjs", import.meta.url), script);
    await writeFile(join(root, "package.json"), '{"version":"0.1.0"}');
    await writeFile(join(root, "package-lock.json"), '{"version":"0.1.0","packages":{"":{"version":"0.1.0"}}}');
    const mock = join(root, "mock.mjs");
    await writeFile(mock, `
      const RealDate = Date;
      let calls = 0;
      globalThis.Date = class extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : [calls && ${collision} ? "2026-10-31T12:03:00Z" : ${JSON.stringify(instant)}]));
        }
        static now() { return new RealDate(${JSON.stringify(instant)}).getTime(); }
      };
      globalThis.fetch = async () => new Response(null, {
        status: ${collision} && calls++ === 0 ? 200 : ${status}
      });
    `);
    const output = join(root, "output.txt");
    const result = spawnSync(process.execPath, [
      "--import", pathToFileURL(mock).href, script, channel, ...(tag ? [tag] : []),
    ], {
      env: { ...process.env, GH_TOKEN: "test-placeholder", GITHUB_OUTPUT: output },
      encoding: "utf8",
      timeout: 10_000,
    });
    return {
      ...result,
      package: JSON.parse(await readFile(join(root, "package.json"), "utf8")),
      lock: JSON.parse(await readFile(join(root, "package-lock.json"), "utf8")),
      output: result.status === 0 ? await readFile(output, "utf8") : "",
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("Dev has a full Dutch-local timestamp tag and internal beta without a run number", async () => {
  const result = await prepare("dev");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.package.version, "2026.1031.1302-beta");
  assert.equal(result.lock.packages[""].version, result.package.version);
  assert.match(result.output, /^tag=v2026\.10\.31\.13\.02-beta$/m);
});

test("an existing Dev tag waits and uses the next minute", async () => {
  const result = await prepare("dev", { collision: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /wachten tot de volgende minuut/);
  assert.equal(result.package.version, "2026.1031.1303-beta");
  assert.match(result.output, /^tag=v2026\.10\.31\.13\.03-beta$/m);
});

test("Stable has no beta suffix", async () => {
  const result = await prepare("stable", { tag: "v2026.10.31.13.02" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.package.version, "2026.1031.1302");
  assert.match(result.output, /^tag=v2026\.10\.31\.13\.02$/m);
});

test("Dutch summer time is used and nonexistent spring clock times are rejected", async () => {
  const summer = await prepare("dev", { instant: "2026-06-01T12:02:59.999Z" });
  assert.equal(summer.package.version, "2026.0601.1402-beta");
  const nonexistent = await prepare("stable", { tag: "v2026.03.29.02.30" });
  assert.notEqual(nonexistent.status, 0);
  assert.match(nonexistent.stderr, /Nederlandse lokale tijd/);
  assert.equal(nonexistent.package.version, "0.1.0");
});

test("API failures and invalid Stable dates fail before changing versions", async () => {
  const api = await prepare("dev", { status: 403 });
  assert.notEqual(api.status, 0);
  assert.match(api.stderr, /HTTP 403/);
  assert.equal(api.package.version, "0.1.0");
  const invalid = await prepare("stable", { tag: "v2026.02.31.12.02" });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.package.version, "0.1.0");
});
