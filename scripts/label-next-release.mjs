export function closingIssues(messages, owner, repo) {
  const reference = String.raw`(?:[\w.-]+\/[\w.-]+)?#\d+`;
  const clauses = new RegExp(
    String.raw`\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(${reference}(?:\s*(?:,|and)\s*${reference})*)`,
    "gi",
  );
  const numbers = new Set();
  for (const clause of messages.matchAll(clauses)) {
    for (const match of clause[1].matchAll(/(?:([\w.-]+\/[\w.-]+))?#(\d+)/g)) {
      if (match[1] && match[1].toLowerCase() !== `${owner}/${repo}`.toLowerCase()) continue;
      const number = Number(match[2]);
      if (!Number.isSafeInteger(number) || number < 1) throw new Error("Ongeldig issuenummer in commitbericht.");
      numbers.add(number);
    }
  }
  return [...numbers];
}

export async function labelNextRelease({ github, owner, repo, messages }) {
  const numbers = closingIssues(messages, owner, repo);
  if (!numbers.length) return;
  const labels = await github.paginate(github.rest.issues.listLabelsForRepo, { owner, repo, per_page: 100 });
  if (!labels.some(({ name }) => name.toLowerCase() === "next release")) {
    await github.rest.issues.createLabel({
      owner, repo, name: "next release", color: "0E8A16",
      description: "Opgelost op dev; bedoeld voor de volgende Stable-release.",
    });
  }
  for (const issue_number of numbers) {
    const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number });
    if (issue.pull_request || issue.state !== "open") continue;
    await github.rest.issues.addLabels({ owner, repo, issue_number, labels: ["next release"] });
  }
}
