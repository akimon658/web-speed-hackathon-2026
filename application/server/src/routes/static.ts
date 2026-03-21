import fs from "node:fs";
import path from "node:path";

import history from "connect-history-api-fallback";
import { Router } from "express";
import serveStatic from "serve-static";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";

export const staticRouter = Router();

// ホームページ用: 初期データとLCP画像プリロードをHTMLに注入
let cachedHtmlTemplate: string | null = null;

staticRouter.get("/", async (_req, res, next) => {
  try {
    // ビルド済みHTMLテンプレートを読み込み（キャッシュ）
    if (cachedHtmlTemplate === null) {
      const htmlPath = path.join(CLIENT_DIST_PATH, "index.html");
      if (!fs.existsSync(htmlPath)) {
        return next();
      }
      cachedHtmlTemplate = fs.readFileSync(htmlPath, "utf-8");
    }

    let html = cachedHtmlTemplate;

    // 初期投稿データを取得
    const posts = await Post.findAll({ limit: 30 });
    const postsJSON = JSON.stringify(posts);

    // LCP画像のプリロードリンクを生成
    const firstPostWithImage = posts.find((p: any) => p.toJSON().images?.length > 0);
    const firstImage = firstPostWithImage ? (firstPostWithImage.toJSON() as any).images?.[0] : null;
    let preloadLinks = "";
    if (firstImage) {
      preloadLinks += `<link rel="preload" as="image" href="/images/${firstImage.id}.jpg?w=800&format=webp" type="image/webp">`;
    }

    // headにプリロードリンクを注入
    if (preloadLinks) {
      html = html.replace("</head>", `${preloadLinks}\n</head>`);
    }

    // bodyに初期データを注入（scriptタグの前に配置）
    html = html.replace("</body>", `<script>window.__INITIAL_POSTS__=${postsJSON}</script>\n</body>`);

    res.type("html").send(html);
  } catch (_e) {
    return next();
  }
});

// SPA 対応のため、ファイルが存在しないときに index.html を返す
staticRouter.use(history());

staticRouter.use(
  serveStatic(UPLOAD_PATH, {
    etag: true,
    lastModified: true,
  }),
);

staticRouter.use(
  serveStatic(PUBLIC_PATH, {
    etag: true,
    lastModified: true,
  }),
);

staticRouter.use(
  serveStatic(CLIENT_DIST_PATH, {
    etag: false,
    lastModified: false,
  }),
);
