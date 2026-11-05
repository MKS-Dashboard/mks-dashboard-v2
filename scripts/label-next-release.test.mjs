import assert from "node:assert/strict";
import test from "node:test";
import { closingIssues, labelNextRelease } from "./label-next-release.mjs";

test("closing keywords recognize local issues, lists and qualified references without duplicates", () => {
  assert.deepEqual(closingIssues(`
    Closes #16
    FIXES #17, #18 and #19
    Resolve MKS-Dashboard/mks-dashboard-v2#20
    Resolved #16
    Close other/repo#21
    Fix #22
    References #23
  `, "MKS-Dashboard", "mks-dashboard-v2"), [16, 17, 18, 19, 20, 22]);
  assert.deepEqual(closingIssues("No issues here", "owner", "repo"), []);
  assert.throws(() => closingIssues("Fixes #999999999999999999", "owner", "repo"), /Ongeldig/);
});

function mockGithub({ labels = [], failure } = {}) {
  const calls = [];
  return {
    calls,
    paginate: async () => labels,
    rest: {
      issues: {
        listLabelsForRepo() {},
        async createLabel(input) { calls.push(["create", input]); },
        async get({ issue_number }) {
          if (failure) throw failure;
          return { data: { state: issue_number === 2 ? "closed" : "open",
            ...(issue_number === 3 ? { pull_request: {} } : {}) } };
        },
        async addLabels(input) { calls.push(["add", input]); },
      },
    },
  };
}
const input = { owner: "owner", repo: "repo", messages: "Closes #1, #2, #3" };

test("creates the label when missing and labels only open issues without closing them", async () => {
  const github = mockGithub();
  await labelNextRelease({ github, ...input });
  assert.deepEqual(github.calls.map(([kind]) => kind), ["create", "add"]);
  assert.equal(github.calls[0][1].name, "next release");
  assert.deepEqual(github.calls[1][1], {
    owner: "owner", repo: "repo", issue_number: 1, labels: ["next release"],
  });
});

test("reuses existing labels and does nothing without closing references", async () => {
  const github = mockGithub({ labels: [{ name: "next release" }] });
  await labelNextRelease({ github, ...input });
  assert.deepEqual(github.calls.map(([kind]) => kind), ["add"]);
  github.calls.length = 0;
  await labelNextRelease({ github, ...input, messages: "Update documentation" });
  assert.deepEqual(github.calls, []);
});

test("API errors fail the workflow rather than silently skipping issues", async () => {
  const github = mockGithub({ failure: new Error("API unavailable") });
  await assert.rejects(labelNextRelease({ github, ...input }), /API unavailable/);
});
