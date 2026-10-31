import { readFile, writeFile } from "node:fs/promises";

const [channel, tagArgument] = process.argv.slice(2);
const packagePath = new URL("../package.json", import.meta.url);
const lockPath = new URL("../package-lock.json", import.meta.url);

function getTimestampParts(date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return {
    versionPrefix: `${year}.${month}${day}.${hour}${minute}`,
    displayTimestamp: `${year}.${month}.${day}.${hour}.${minute}`,
  };
}

if (channel !== "stable" && channel !== "dev") {
  throw new Error("Geef als eerste argument 'stable' of 'dev' op.");
}

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const lockFile = JSON.parse(await readFile(lockPath, "utf8"));

let version;
let displayTimestamp;
let releaseTag;

if (channel === "stable") {
  const tag = tagArgument ?? process.env.GITHUB_REF_NAME ?? "";
  const match = /^v(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/.exec(tag);
  if (!match) {
    throw new Error("Gebruik voor Stable een tag in het formaat vYYYY.MM.DD.HH.MM.");
  }

  const [, year, month, day, hour, minute] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  const date = new Date(Date.UTC(Number(year), monthNumber - 1, dayNumber, hourNumber, minuteNumber));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== monthNumber - 1 ||
    date.getUTCDate() !== dayNumber ||
    date.getUTCHours() !== hourNumber ||
    date.getUTCMinutes() !== minuteNumber
  ) {
    throw new Error("De datum in de Stable-tag is ongeldig.");
  }

  ({ displayTimestamp } = getTimestampParts(date));
  version = `${year}.${month}${day}.${hour}${minute}`;
  releaseTag = tag;
} else {
  const runNumber = process.env.GITHUB_RUN_NUMBER;
  if (!runNumber || !/^\d+$/.test(runNumber)) {
    throw new Error("GITHUB_RUN_NUMBER ontbreekt; start de Dev-release vanuit GitHub Actions.");
  }

  const timestamp = getTimestampParts(new Date());
  version = `${timestamp.versionPrefix}-beta.${runNumber}`;
  displayTimestamp = timestamp.displayTimestamp;
  releaseTag = `v${version}`;
}

packageJson.version = version;
lockFile.version = version;
lockFile.packages[""].version = version;

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
await writeFile(lockPath, `${JSON.stringify(lockFile, null, 2)}\n`);

if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ndisplay_timestamp=${displayTimestamp}\nchannel=${channel}\ntag=${releaseTag}\n`,
  );
}

console.log(`Prepared ${channel} build ${version} (${displayTimestamp}).`);
