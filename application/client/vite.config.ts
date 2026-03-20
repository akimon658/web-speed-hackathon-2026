import fs from "node:fs";
import path from "node:path";

import { defineConfig, type Plugin } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Map of bare specifiers to resolved file paths for ?binary imports
const BINARY_ALIASES: Record<string, string> = {
  "@ffmpeg/core": path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js"),
  "@ffmpeg/core/wasm": path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm"),
  "@imagemagick/magick-wasm/magick.wasm": path.resolve(__dirname, "node_modules/@imagemagick/magick-wasm/dist/magick.wasm"),
};

function binaryImportPlugin(): Plugin {
  return {
    name: "binary-import",
    enforce: "pre",
    resolveId(source) {
      if (!source.endsWith("?binary")) return null;
      const bare = source.replace(/\?binary$/, "");
      const resolved = BINARY_ALIASES[bare];
      if (resolved) {
        return resolved + "?binary";
      }
      return null;
    },
    load(id) {
      if (!id.endsWith("?binary")) return null;
      const filePath = id.replace(/\?binary$/, "");
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString("base64");
      return `
const base64 = "${base64}";
const binaryString = atob(base64);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
export default bytes;
`;
    },
  };
}

export default defineConfig({
  root: ".",
  publicDir: false,
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "scripts/[name].js",
        chunkFileNames: "scripts/chunk-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0]?.endsWith(".css")) {
            return "styles/[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@web-speed-hackathon-2026\/client\//,
        replacement: path.resolve(__dirname, ".") + "/",
      },
      {
        find: "bayesian-bm25",
        replacement: path.resolve(__dirname, "node_modules/bayesian-bm25/dist/index.js"),
      },
      {
        find: /^kuromoji$/,
        replacement: path.resolve(__dirname, "node_modules/kuromoji/build/kuromoji.js"),
      },
      {
        find: /^@ffmpeg\/core\/wasm$/,
        replacement: path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm"),
      },
      {
        find: /^@ffmpeg\/core$/,
        replacement: path.resolve(__dirname, "node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js"),
      },
      {
        find: /^@ffmpeg\/ffmpeg$/,
        replacement: path.resolve(__dirname, "node_modules/@ffmpeg/ffmpeg/dist/esm/index.js"),
      },
      {
        find: /^@imagemagick\/magick-wasm\/magick\.wasm$/,
        replacement: path.resolve(__dirname, "node_modules/@imagemagick/magick-wasm/dist/magick.wasm"),
      },
    ],
  },
  define: {
    "import.meta.env.VITE_BUILD_DATE": JSON.stringify(new Date().toISOString()),
    "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(process.env["SOURCE_VERSION"] || ""),
    "process.env.NODE_ENV": JSON.stringify(process.env["NODE_ENV"] || "development"),
    "global": "globalThis",
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
      },
    },
  },
  plugins: [
    binaryImportPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, "node_modules/katex/dist/fonts/*"),
          dest: "styles/fonts",
        },
      ],
    }),
    ...(process.env["BUNDLE_ANALYZE"] === "true"
      ? [
          visualizer({
            filename: path.resolve(__dirname, "../dist/bundle-report.html"),
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
        ]
      : []),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
});
