import * as esbuild from "esbuild";

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
];

const watch = process.argv.includes("--watch");
for (const b of builds) {
  const ctx = await esbuild.context(b);
  if (watch) await ctx.watch();
  else { await ctx.rebuild(); await ctx.dispose(); }
}
if (watch) console.log("watching…");
