import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {transform} from "lightningcss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sources = [
  "src/styles/theme.css",
  "src/styles/app.css",
  "src/styles/sidebar.css",
  "src/styles/toolbar.css",
  "src/styles/modal.css",
  "src/styles/collection.css",
];

const input = await Promise.all(
  sources.map((file) => fs.readFile(path.join(rootDir, file), "utf8"))
);

const css = input.join("\n");
const result = transform({
  code: Buffer.from(css),
  minify: true,
});

const outDir = path.join(rootDir, "cache");
await fs.mkdir(outDir, {recursive: true});
await fs.writeFile(path.join(outDir, "diva.css"), result.code);
