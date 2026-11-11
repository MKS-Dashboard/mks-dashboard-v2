import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateFiles } from "./generate-files.mjs";
import { projectStats } from "./project-stats.ts";

test("the file tree follows the source counter and excludes ignored files", () => {
  const root = mkdtempSync(join(tmpdir(), "mks-file-tree-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    for (const directory of ["src", "scripts", "install", "build", "other", "out"]) {
      mkdirSync(join(root, directory));
    }
    mkdirSync(join(root, "src", "renderer", "src", "data", "nested"), { recursive: true });
    for (const [path, content] of [
      [".gitignore", "out/\n"],
      ["src/example.ts", "const value = 1;\r\n\r\n// comment\r\n"],
      ["src/data.json", "{}"],
      ["src/renderer/src/data/vehicles.json", "{\n  \"id\": 1\n}\n"],
      ["src/renderer/src/data/nested/catalog.json", "[]\n"],
      ["src/renderer/src/data/readme.md", "# Data\n"],
      ["scripts/test.mjs", "test();\n"],
      ["other/excluded.ts", "excluded();\n"],
      ["other/binary.bin", Buffer.from([0, 1, 10, 2])],
      ["out/bundle.js", "ignored();\n"],
      ["root.cjs", "module.exports = {};\n"],
    ]) writeFileSync(join(root, ...path.split("/")), content);
    execFileSync("git", ["add", ".gitignore", "src/example.ts"], { cwd: root });

    generateFiles(root);
    const markdown = readFileSync(join(root, "files.md"), "utf8");
    assert.match(markdown, /\*\*8 niet-lege regels\*\* in 5 bestanden, inclusief commentaar\./);
    assert.match(markdown, /\| `\.json` \| 2 \| 4 \|/);
    assert.match(markdown, /\| `\.ts` \| 1 \| 2 \|/);
    assert.match(markdown, /\| `\.mjs` \| 1 \| 1 \|/);
    assert.match(markdown, /\| `\.cjs` \| 1 \| 1 \|/);
    assert.match(markdown, /🟢 example\.ts/);
    assert.match(markdown, /🔴 data\.json/);
    assert.match(markdown, /🟢 vehicles\.json/);
    assert.match(markdown, /🟢 catalog\.json/);
    assert.match(markdown, /🔴 readme\.md/);
    assert.match(markdown, /🟢 test\.mjs/);
    assert.match(markdown, /🔴 excluded\.ts/);
    assert.match(markdown, /🟢 root\.cjs/);
    assert.match(markdown, /🔴 files\.md/);
    assert.match(markdown, /## Niet meegetelde bestanden/);
    assert.match(markdown, /\| `\.bin` \| 1 \| 0 \| 1 \|/);
    assert.match(markdown, /\| `\.ts` \| 1 \| 1 \| 0 \|/);
    const selfLines = markdown.split(/\r\n|\n|\r/).filter((line) => line.trim()).length;
    assert.match(markdown, new RegExp(`\\| \`\\.md\` \\| 2 \\| ${selfLines + 1} \\| 0 \\|`));
    assert.match(markdown, new RegExp(`\\*\\*${selfLines + 4} niet-lege regels\\*\\* in 6 bestanden\\.`));
    assert.doesNotMatch(markdown, /bundle\.js|out\//);
    const stats = projectStats(root);
    assert.equal((markdown.match(/🟢 /g) ?? []).length - 1, stats.files);
    assert.equal(stats.lines, 8);
    generateFiles(root);
    assert.equal(readFileSync(join(root, "files.md"), "utf8"), markdown);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
