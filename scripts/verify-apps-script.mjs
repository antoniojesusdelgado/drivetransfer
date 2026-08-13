import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdout } from "node:process";

const outputDirectory = resolve(import.meta.dirname, "..", "apps-script-dist");
const generatedFiles = (await readdir(outputDirectory)).sort();
const expectedFiles = ["Code.js", "Index.html", "appsscript.json"];
if (JSON.stringify(generatedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`Unexpected Apps Script files: ${generatedFiles.join(", ")}`);
}
const [code, html, manifestSource] = await Promise.all([
  readFile(resolve(outputDirectory, "Code.js"), "utf8"),
  readFile(resolve(outputDirectory, "Index.html"), "utf8"),
  readFile(resolve(outputDirectory, "appsscript.json"), "utf8"),
]);
const manifest = JSON.parse(manifestSource);

const requiredFunctions = [
  "doGet",
  "inspectDriveFolder",
  "listDriveFolderPage",
  "executeTransferBatch",
  "verifyTransferBatch",
];
for (const functionName of requiredFunctions) {
  if (!code.includes(`function ${functionName}(`)) {
    throw new Error(`Missing Apps Script entrypoint: ${functionName}`);
  }
}
if (!html.includes('<div id="root"></div>') || /src="\.\/assets\//.test(html)) {
  throw new Error("Apps Script HTML is not a self-contained client bundle");
}
if (
  !manifest.oauthScopes?.some(
    (scope) => scope === "https://www.googleapis.com/auth/drive",
  )
) {
  throw new Error("Drive OAuth scope is missing from the generated manifest");
}
const driveService = manifest.dependencies?.enabledAdvancedServices?.find(
  (service) => service.serviceId === "drive" && service.version === "v3",
);
if (!driveService)
  throw new Error("Drive API v3 advanced service is not enabled");
if (manifest.webapp?.executeAs !== "USER_ACCESSING") {
  throw new Error("The web app must execute as the accessing user");
}
if (manifest.executionApi?.access !== "ANYONE") {
  throw new Error("The Apps Script execution API must allow authorized users");
}
if (/ScriptApp\.getOAuthToken\(\)/.test(code)) {
  throw new Error("OAuth tokens must not be returned by Apps Script functions");
}

stdout.write("Apps Script artifact verified\n");
