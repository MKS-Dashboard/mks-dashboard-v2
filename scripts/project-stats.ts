import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

export function projectStats(root: string): { files: number; lines: number } {
  const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".html", ".cs", ".ps1", ".nsh"]);
  let files = 0;
  let lines = 0;
  function count(path: string): void {
    if (!extensions.has(extname(path))) return;
    files++;
    lines += readFileSync(path, "utf8").split(/\r\n|\n|\r/).filter((line) => line.trim()).length;
  }
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) count(path);
    }
  }
  for (const directory of ["src", "scripts", "install", "build"]) visit(join(root, directory));
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile()) count(join(root, entry.name));
  }
  return { files, lines };
}
