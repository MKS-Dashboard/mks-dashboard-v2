import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { countNonEmptyLines, countSourceLines, isSourceFile } from "./project-stats.ts";

export function renderFileTree(root, files) {
  const tree = new Map();
  const countedFiles = new Set();
  const extensions = new Map();
  const excludedExtensions = new Map();
  let excludedFiles = 0;
  let excludedLines = 0;
  let nonTextFiles = 0;
  let totalLines = 0;
  for (const file of files) {
    const path = join(root, ...file.split("/"));
    if (isSourceFile(root, path) && lstatSync(path).isFile()) {
      countedFiles.add(file);
      const count = countSourceLines(path);
      const extension = extname(path);
      const previous = extensions.get(extension) ?? { files: 0, lines: 0 };
      extensions.set(extension, { files: previous.files + 1, lines: previous.lines + count });
      totalLines += count;
    } else {
      const extension = extname(file) || "(zonder extensie)";
      const previous = excludedExtensions.get(extension) ?? { files: 0, lines: 0, nonText: 0 };
      previous.files++;
      excludedFiles++;
      if (file !== "files.md") {
        let text;
        if (lstatSync(path).isFile()) {
          const bytes = readFileSync(path);
          if (!bytes.includes(0)) {
            try {
              text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
            } catch (error) {
              if (!(error instanceof TypeError)) throw error;
            }
          }
        }
        if (text === undefined) {
          previous.nonText++;
          nonTextFiles++;
        } else {
          const count = countNonEmptyLines(text);
          previous.lines += count;
          excludedLines += count;
        }
      }
      excludedExtensions.set(extension, previous);
    }
    const parts = file.split("/");
    let node = tree;
    for (const part of parts.slice(0, -1)) {
      if (!node.has(part)) node.set(part, new Map());
      node = node.get(part);
    }
    node.set(parts.at(-1), file);
  }

  const lines = [
    "# Bestanden",
    "",
    "Automatisch gegenereerd uit de repositorybestanden op dev.",
    "🟢 Telt mee in de broncodetelling · 🔴 Telt niet mee.",
    "Genegeerde en lokale buildbestanden staan niet in dit overzicht.",
    "",
    "## Broncodetelling",
    "",
    `**${totalLines.toLocaleString("nl-NL")} niet-lege regels** in ${countedFiles.size.toLocaleString("nl-NL")} bestanden, inclusief commentaar.`,
    "",
    "| Extensie | Bestanden | Niet-lege regels |",
    "| --- | ---: | ---: |",
    ...[...extensions.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([extension, counts]) => `| \`${extension}\` | ${counts.files.toLocaleString("nl-NL")} | ${counts.lines.toLocaleString("nl-NL")} |`),
    "",
    "## Bestandsboom",
    "",
    "```text",
    ".",
  ];
  function visit(node, prefix) {
    const entries = [...node.entries()].sort(([a, aValue], [b, bValue]) => {
      if ((aValue instanceof Map) !== (bValue instanceof Map)) return aValue instanceof Map ? -1 : 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    entries.forEach(([name, value], index) => {
      const last = index === entries.length - 1;
      const branch = last ? "└── " : "├── ";
      if (value instanceof Map) {
        lines.push(`${prefix}${branch}${name}/`);
        visit(value, `${prefix}${last ? "    " : "│   "}`);
      } else {
        lines.push(`${prefix}${branch}${countedFiles.has(value) ? "🟢" : "🔴"} ${name}`);
      }
    });
  }
  visit(tree, "");
  lines.push("```", "", "## Niet meegetelde bestanden", "");

  function renderExcluded(selfLines) {
    const markdown = excludedExtensions.get(".md");
    const rows = [...excludedExtensions.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([extension, counts]) => {
        const count = counts.lines + (extension === ".md" && files.has("files.md") ? selfLines : 0);
        return `| \`${extension}\` | ${counts.files.toLocaleString("nl-NL")} | ${count.toLocaleString("nl-NL")} | ${counts.nonText.toLocaleString("nl-NL")} |`;
      });
    const total = excludedLines + (markdown && files.has("files.md") ? selfLines : 0);
    return [...lines,
      `**${total.toLocaleString("nl-NL")} niet-lege regels** in ${excludedFiles.toLocaleString("nl-NL")} bestanden.`,
      `${nonTextFiles.toLocaleString("nl-NL")} binaire of niet-tekstbestanden tellen mee als bestand, maar niet voor de regels. Symbolische koppelingen worden ook als niet-tekst behandeld.`,
      "De tekstregels omvatten ook dit overzicht en tellen niet mee in de broncodetelling.",
      "",
      "| Extensie | Bestanden | Niet-lege regels | Niet-tekstbestanden |",
      "| --- | ---: | ---: | ---: |",
      ...rows,
      "",
    ].join("\n");
  }

  let selfLines = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const output = renderExcluded(selfLines);
    const actualLines = countNonEmptyLines(output);
    if (!files.has("files.md") || actualLines === selfLines) return output;
    selfLines = actualLines;
  }
  throw new Error("De regeltelling van files.md kon niet worden bepaald.");
}

export function generateFiles(root) {
  const output = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root });
  const files = new Set(output.toString("utf8").split("\0").filter(Boolean));
  files.add("files.md");
  const destination = join(root, "files.md");
  writeFileSync(destination, renderFileTree(root, files));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  generateFiles(fileURLToPath(new URL("..", import.meta.url)));
}
