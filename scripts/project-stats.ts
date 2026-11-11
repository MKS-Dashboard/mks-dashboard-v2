import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const sourceDirectories = new Set(["src", "scripts", "install", "build"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".html", ".cs", ".ps1", ".nsh"]);

export function isSourceFile(root: string, path: string): boolean {
  const parts = relative(root, path).split(sep);
  if (parts.length >= 5 && parts[0] === "src" && parts[1] === "renderer" &&
    parts[2] === "src" && parts[3] === "data" && extname(path) === ".json") return true;
  return (parts.length === 1 || sourceDirectories.has(parts[0])) && sourceExtensions.has(extname(path));
}

export function countNonEmptyLines(text: string): number {
  return text.split(/\r\n|\n|\r/).filter((line) => line.trim()).length;
}

export function countSourceLines(path: string): number {
  return countNonEmptyLines(readFileSync(path, "utf8"));
}

export function projectStats(root: string): { files: number; lines: number } {
  let files = 0;
  let lines = 0;
  function count(path: string): void {
    if (!isSourceFile(root, path)) return;
    files++;
    lines += countSourceLines(path);
  }
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) count(path);
    }
  }
  for (const directory of sourceDirectories) visit(join(root, directory));
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile()) count(join(root, entry.name));
  }
  return { files, lines };
}
