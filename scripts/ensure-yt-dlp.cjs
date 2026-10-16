/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const youtubeDl = require("youtube-dl-exec");
const { YOUTUBE_DL_FILE, YOUTUBE_DL_PATH } = youtubeDl.constants;
const packageRoot = path.dirname(
  require.resolve("youtube-dl-exec/package.json"),
);
const expectedFile = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const expectedPath = path.join(packageRoot, "bin", expectedFile);

if (
  YOUTUBE_DL_FILE !== expectedFile ||
  path.resolve(YOUTUBE_DL_PATH) !== path.resolve(expectedPath)
) {
  throw new Error(
    `youtube-dl-exec is configured to use ${YOUTUBE_DL_PATH}; expected ${expectedPath}.`,
  );
}

function isExecutable(binaryPath) {
  try {
    if (!fs.statSync(binaryPath).isFile()) return false;
    const result = spawnSync(binaryPath, ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });
    return !result.error && result.status === 0 && Boolean(result.stdout.trim());
  } catch {
    return false;
  }
}

if (!isExecutable(expectedPath)) {
  console.info(
    `yt-dlp is missing or not executable at ${expectedPath}; running youtube-dl-exec's installer.`,
  );

  const installerPath = require.resolve(
    "youtube-dl-exec/scripts/postinstall.js",
  );
  const env = { ...process.env };
  delete env.YOUTUBE_DL_SKIP_DOWNLOAD;
  if (process.platform !== "win32") env.YOUTUBE_DL_PLATFORM = "unix";

  const install = spawnSync(process.execPath, [installerPath], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });

  if (install.error) throw install.error;
  if (install.status !== 0) {
    throw new Error(
      `youtube-dl-exec's yt-dlp installer exited with status ${install.status}.`,
    );
  }
}

if (!isExecutable(expectedPath)) {
  throw new Error(
    `yt-dlp did not install as an executable at ${expectedPath}.`,
  );
}

console.info(`Verified yt-dlp executable: ${expectedPath}`);
