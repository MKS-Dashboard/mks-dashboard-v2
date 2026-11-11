import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import test from "node:test";

test("PR installers use a separate TST identity without changing Stable and Beta builds", async () => {
  const require = createRequire(import.meta.url);
  const configPath = require.resolve("../electron-builder.config.cjs");
  const oldTestNumber = process.env.TEST_BUILD_NUMBER;
  const oldChannel = process.env.UPDATE_CHANNEL;
  function config(testNumber, channel) {
    if (testNumber === undefined) delete process.env.TEST_BUILD_NUMBER;
    else process.env.TEST_BUILD_NUMBER = testNumber;
    if (channel === undefined) delete process.env.UPDATE_CHANNEL;
    else process.env.UPDATE_CHANNEL = channel;
    delete require.cache[configPath];
    return require(configPath);
  }
  try {
    const stable = config(undefined, "stable");
    const beta = config(undefined, "dev");
    const tst = config("42", undefined);
    assert.equal(stable.appId, "com.mksdashboard.desktop");
    assert.equal(beta.appId, "com.mksdashboard.desktop.beta");
    assert.equal(tst.appId, "com.mksdashboard.desktop.tst");
    assert.equal(tst.productName, "MKS Dashboard TST");
    assert.match(tst.extraMetadata.version, /^\d+\.\d+\.\d+-tst\.42$/);
    assert.equal(tst.artifactName, "MKS-Dashboard-Setup-${version}.${ext}");
    assert.throws(() => config("invalid", undefined), /positief geheel getal/);
    const workflow = await readFile(new URL("../.github/workflows/windows-installer.yml", import.meta.url), "utf8");
    assert.match(workflow, /if: github\.event_name == 'pull_request'\s+run: echo "TEST_BUILD_NUMBER=\$\{\{ github\.run_number \}\}"/);
    assert.match(workflow, /github\.event_name == 'pull_request' && 'tst-'/);
  } finally {
    if (oldTestNumber === undefined) delete process.env.TEST_BUILD_NUMBER;
    else process.env.TEST_BUILD_NUMBER = oldTestNumber;
    if (oldChannel === undefined) delete process.env.UPDATE_CHANNEL;
    else process.env.UPDATE_CHANNEL = oldChannel;
    delete require.cache[configPath];
  }
});

test("Stable workflow prepares, labels and publishes main pushes and explicit tags", async () => {
  const workflow = (await readFile(new URL("../.github/workflows/windows-installer.yml", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  const condition = "(github.event_name == 'push' && github.ref == 'refs/heads/main') || startsWith(github.ref, 'refs/tags/v')";
  for (const name of ["Prepare Stable version", "Set Stable build labels", "Publish Stable release"]) {
    const start = workflow.indexOf(`      - name: ${name}\n`);
    assert.notEqual(start, -1);
    const end = workflow.indexOf("\n      - name:", start + 1);
    const step = workflow.slice(start, end === -1 ? undefined : end);
    assert.ok(step.includes(`        if: ${condition}\n`), name);
    if (name === "Prepare Stable version") {
      assert.ok(step.includes("GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}"));
    }
  }
  assert.ok(workflow.indexOf("name: Test update channel selection") < workflow.indexOf("name: Prepare Stable version"));
  assert.ok(workflow.indexOf("name: Build Windows installer") < workflow.indexOf("name: Publish Stable release"));
  assert.ok(workflow.includes("--target \"$GITHUB_SHA\""));
});

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
      env: { ...process.env, GH_TOKEN: "test-placeholder", GITHUB_OUTPUT: output, GITHUB_REF_TYPE: tag ? "tag" : "branch", GITHUB_REF_NAME: tag ?? channel },
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
  assert.match(result.output, /^display_timestamp=2026\.10\.31\.13\.02$/m);
});

test("Stable branch pushes generate a Dutch timestamp and update both manifests", async () => {
  const result = await prepare("stable");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.package.version, "2026.1031.1302");
  assert.equal(result.lock.version, result.package.version);
  assert.equal(result.lock.packages[""].version, result.package.version);
  assert.match(result.output, /^tag=v2026\.10\.31\.13\.02$/m);
  assert.match(result.output, /^channel=stable$/m);
  assert.match(result.output, /^display_timestamp=2026\.10\.31\.13\.02$/m);
});

test("Stable branch pushes wait on tag collisions and use Dutch summer time", async () => {
  const collision = await prepare("stable", { collision: true });
  assert.equal(collision.status, 0, collision.stderr);
  assert.equal(collision.package.version, "2026.1031.1303");
  assert.match(collision.output, /^tag=v2026\.10\.31\.13\.03$/m);
  const summer = await prepare("stable", { instant: "2026-06-01T12:02:59.999Z" });
  assert.equal(summer.status, 0, summer.stderr);
  assert.equal(summer.package.version, "2026.0601.1402");
  assert.match(summer.output, /^tag=v2026\.06\.01\.14\.02$/m);
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
  const stableApi = await prepare("stable", { status: 403 });
  assert.notEqual(stableApi.status, 0);
  assert.match(stableApi.stderr, /HTTP 403/);
  assert.equal(stableApi.package.version, "0.1.0");
  const invalid = await prepare("stable", { tag: "v2026.02.31.12.02" });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.package.version, "0.1.0");
});
