import type { NextConfig } from "next";

const scraperRuntimeIncludes = [
  "node_modules/@jsep-plugin/assignment/**/*",
  "node_modules/@jsep-plugin/regex/**/*",
  "node_modules/ansi-regex/**/*",
  "node_modules/async.parallellimit/**/*",
  "node_modules/async.util.eachoflimit/**/*",
  "node_modules/async.util.isarray/**/*",
  "node_modules/async.util.isarraylike/**/*",
  "node_modules/async.util.keyiterator/**/*",
  "node_modules/async.util.keys/**/*",
  "node_modules/async.util.noop/**/*",
  "node_modules/async.util.once/**/*",
  "node_modules/async.util.onlyonce/**/*",
  "node_modules/async.util.parallel/**/*",
  "node_modules/async.util.restparam/**/*",
  "node_modules/balanced-match/**/*",
  "node_modules/boolbase/**/*",
  "node_modules/boolstring/**/*",
  "node_modules/brace-expansion/**/*",
  "node_modules/cheerio/**/*",
  "node_modules/cheerio-select/**/*",
  "node_modules/concat-map/**/*",
  "node_modules/css-select/**/*",
  "node_modules/css-what/**/*",
  "node_modules/dasu/**/*",
  "node_modules/dom-serializer/**/*",
  "node_modules/domelementtype/**/*",
  "node_modules/domhandler/**/*",
  "node_modules/domutils/**/*",
  "node_modules/encoding-sniffer/**/*",
  "node_modules/entities/**/*",
  "node_modules/htmlparser2/**/*",
  "node_modules/htmlparser2/node_modules/entities/**/*",
  "node_modules/human-time/**/*",
  "node_modules/iconv-lite/**/*",
  "node_modules/is-fullwidth-code-point/**/*",
  "node_modules/jsep/**/*",
  "node_modules/jsonpath-plus/**/*",
  "node_modules/keypress/**/*",
  "node_modules/mimic-fn/**/*",
  "node_modules/minimist/**/*",
  "node_modules/node-fzf/**/*",
  "node_modules/nth-check/**/*",
  "node_modules/onetime/**/*",
  "node_modules/parse5/**/*",
  "node_modules/parse5-htmlparser2-tree-adapter/**/*",
  "node_modules/parse5-parser-stream/**/*",
  "node_modules/parse5/node_modules/entities/**/*",
  "node_modules/picocolors/**/*",
  "node_modules/redstar/**/*",
  "node_modules/redstar/node_modules/minimatch/**/*",
  "node_modules/restore-cursor/**/*",
  "node_modules/safer-buffer/**/*",
  "node_modules/signal-exit/**/*",
  "node_modules/string-width/**/*",
  "node_modules/strip-ansi/**/*",
  "node_modules/ttys/**/*",
  "node_modules/undici/**/*",
  "node_modules/whatwg-encoding/**/*",
  "node_modules/whatwg-mimetype/**/*",
  "node_modules/yt-search/**/*",
];

const youtubeDlRuntimeIncludes = [
  process.platform === "win32"
    ? "node_modules/youtube-dl-exec/bin/yt-dlp.exe"
    : "node_modules/youtube-dl-exec/bin/yt-dlp",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "youtube-dl-exec",
    "@vreden/youtube_scraper",
    "cheerio",
    "ffmpeg-static",
  ],
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/dasu/**/*",
      "node_modules/ffmpeg-static/**/*",
    ],
    "/api/media/info": [
      ...scraperRuntimeIncludes,
      ...youtubeDlRuntimeIncludes,
    ],
    "/api/media/download": [
      ...scraperRuntimeIncludes,
      ...youtubeDlRuntimeIncludes,
      "node_modules/ffmpeg-static/**/*",
    ],
    "/api/user/login": scraperRuntimeIncludes,
    "/api/visitors": scraperRuntimeIncludes,
  },
};

export default nextConfig;
