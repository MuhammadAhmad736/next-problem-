import type { NextConfig } from "next";

const scraperRuntimeIncludes = [
  "node_modules/boolbase/**/*",
  "node_modules/cheerio/**/*",
  "node_modules/cheerio-select/**/*",
  "node_modules/css-select/**/*",
  "node_modules/css-what/**/*",
  "node_modules/dom-serializer/**/*",
  "node_modules/domelementtype/**/*",
  "node_modules/domhandler/**/*",
  "node_modules/domutils/**/*",
  "node_modules/encoding-sniffer/**/*",
  "node_modules/entities/**/*",
  "node_modules/htmlparser2/**/*",
  "node_modules/htmlparser2/node_modules/entities/**/*",
  "node_modules/iconv-lite/**/*",
  "node_modules/nth-check/**/*",
  "node_modules/parse5/**/*",
  "node_modules/parse5-htmlparser2-tree-adapter/**/*",
  "node_modules/parse5-parser-stream/**/*",
  "node_modules/parse5/node_modules/entities/**/*",
  "node_modules/safer-buffer/**/*",
  "node_modules/undici/**/*",
  "node_modules/whatwg-encoding/**/*",
  "node_modules/whatwg-mimetype/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@choewy/yt-dlp",
    "@vreden/youtube_scraper",
    "cheerio",
    "ffmpeg-static",
  ],
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/@choewy/yt-dlp/**/*",
      "node_modules/dasu/**/*",
      "node_modules/ffmpeg-static/**/*",
    ],
    "/api/media/info": scraperRuntimeIncludes,
    "/api/user/login": scraperRuntimeIncludes,
  },
};

export default nextConfig;
