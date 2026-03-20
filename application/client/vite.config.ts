import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function negaposiDictPlugin(): Plugin {
  return {
    name: "negaposi-dict-stub",
    enforce: "pre",
    resolveId(source) {
      if (source.endsWith("pn_ja.dic.json")) {
        return path.resolve(__dirname, "src/stubs/pn_ja.dic.json");
      }
      return null;
    },
  };
}

export default defineConfig(async () => {
  const plugins: Plugin[] = [
    negaposiDictPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, "node_modules/katex/dist/fonts/*"),
          dest: "styles/fonts",
        },
      ],
    }),
  ];

  if (process.env["BUNDLE_ANALYZE"] === "true") {
    const { visualizer } = await import("rollup-plugin-visualizer");
    plugins.push(
      visualizer({
        filename: path.resolve(__dirname, "../dist/bundle-report.html"),
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
    );
  }

  return {
    root: ".",
    publicDir: false,
    build: {
      target: "esnext",
      outDir: "../dist",
      emptyOutDir: true,
      rolldownOptions: {
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
    plugins,
    css: {
      postcss: "./postcss.config.js",
    },
  };
});
