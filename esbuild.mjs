import * as esbuild from "esbuild";
import { copyFile } from "node:fs/promises";

// Keep the Safari "Share to Kindle" extension's bundled copy of share.js in sync.
const shareCopyPlugin = {
  name: "copy-share-to-safari",
  setup(build) {
    build.onEnd(async () => {
      try {
        await copyFile(
          "extension/dist/share.js",
          "safari/Article to Kindle/Share to Kindle/share.js"
        );
      } catch {}
    });
  },
};

const common = {
  bundle: true,
  format: "esm",
  target: "chrome110",
  logLevel: "info",
  legalComments: "none",
};

const builds = [
  { entryPoints: ["extension/src/background.js"], outfile: "extension/dist/background.js", ...common, format: "iife" },
  // content script is injected via chrome.scripting; IIFE so it runs standalone.
  { entryPoints: ["extension/src/content.js"], outfile: "extension/dist/content.js", ...common, format: "iife" },
  { entryPoints: ["extension/src/share.js"], outfile: "extension/dist/share.js", ...common, format: "iife", plugins: [shareCopyPlugin] },
];

const watch = process.argv.includes("--watch");
for (const b of builds) {
  const ctx = await esbuild.context(b);
  if (watch) await ctx.watch();
  else { await ctx.rebuild(); await ctx.dispose(); }
}
if (watch) console.log("watching…");
