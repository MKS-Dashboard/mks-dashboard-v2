import assert from "node:assert/strict";
import test from "node:test";
import { getUpdateFeed } from "../src/main/update-feed.ts";

const release = (tag_name, prerelease = false, draft = false) => ({
  tag_name, prerelease, draft,
});
const stable = release("v2026.10.31.16.00");
const dev = release("v2026.10.31.15.00-beta", true);
const mockRequest = (releases) => async () => Response.json(releases);

test("Dev ignores newer Stable releases and chooses the highest Dev version", async () => {
  const url = await getUpdateFeed(true, mockRequest([
    stable, dev, release("v2026.10.31.14.59-beta", true),
    release("v2026.10.31.17.00-beta", true, true),
    release("v2026.1031.1800-alpha.1", true),
  ]));
  assert.ok(url.endsWith("/v2026.10.31.15.00-beta"));
});

test("Stable ignores newer Dev releases and sorts timestamp versions numerically", async () => {
  const url = await getUpdateFeed(false, mockRequest([
    release("v2026.1101.1800-beta.20", true),
    release("v2026.10.31.09.00"), stable,
    release("v2026.11.01.12.00", false, true),
  ]));
  assert.ok(url.endsWith("/v2026.10.31.16.00"));
});

test("release discovery continues across full pages", async () => {
  const pages = [];
  const url = await getUpdateFeed(true, async (url) => {
    pages.push(new URL(url).searchParams.get("page"));
    return Response.json(pages.length === 1 ? Array(100).fill(stable) : [dev]);
  });

  assert.deepEqual(pages, ["1", "2"]);
  assert.ok(url.endsWith(dev.tag_name));
});

test("new Dev tags and legacy Dev tags share chronological ordering", async () => {
  const older = release("v2026.1031.1459-beta.99", true);
  const newer = release("v2026.1031.1501-beta.1", true);
  assert.ok((await getUpdateFeed(true, mockRequest([older, dev]))).endsWith(dev.tag_name));
  assert.ok((await getUpdateFeed(true, mockRequest([dev, newer]))).endsWith(newer.tag_name));
});

test("missing channel never falls back to the other channel", async () => {
  await assert.rejects(getUpdateFeed(true, mockRequest([stable])), /geen gepubliceerde Dev/);
  await assert.rejects(getUpdateFeed(false, mockRequest([dev])), /geen gepubliceerde Stable/);
});

test("HTTP and malformed release errors are surfaced", async () => {
  await assert.rejects(getUpdateFeed(true, async () => new Response("", { status: 403 })), /HTTP 403/);
  await assert.rejects(getUpdateFeed(true, mockRequest({})), /ongeldige releaselijst/);
  await assert.rejects(getUpdateFeed(true, mockRequest([{}])), /ongeldige releasegegevens/);
});
