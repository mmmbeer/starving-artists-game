#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const MAX_LINES = 499;
const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".py",
  ".sh",
  ".ts",
  ".tsx",
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".sites-runtime",
  "dist",
  "node_modules",
]);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".") && entry.isDirectory()) return [];
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) return [];
        return sourceFiles(join(directory, entry.name));
      }
      const path = join(directory, entry.name);
      return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

const oversized = [];
for (const path of await sourceFiles(ROOT)) {
  const contents = await readFile(path, "utf8");
  const lines = contents === "" ? 0 : contents.split(/\r?\n/).length;
  if (lines > MAX_LINES) {
    oversized.push({
      path: relative(ROOT, path),
      lines,
    });
  }
}

if (oversized.length > 0) {
  console.error(`Source files must contain fewer than 500 lines:`);
  for (const file of oversized.sort((a, b) => b.lines - a.lines)) {
    console.error(`- ${file.path}: ${file.lines}`);
  }
  process.exitCode = 1;
} else {
  console.log("All source files contain fewer than 500 lines.");
}
