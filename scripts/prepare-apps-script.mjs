import { copyFile, rename } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(projectRoot, "apps-script-dist");

await rename(
  resolve(outputDirectory, "index.html"),
  resolve(outputDirectory, "Index.html"),
);
await copyFile(
  resolve(projectRoot, "apps-script", "appsscript.json"),
  resolve(outputDirectory, "appsscript.json"),
);
