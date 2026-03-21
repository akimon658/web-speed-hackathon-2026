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

// HTML template cache with preload hints already injected
let cachedHtmlTemplate: string | null = null;

function getHtmlTemplate(): string | null {
  if (cachedHtmlTemplate !== null) {
    return cachedHtmlTemplate;
  }
  const htmlPath = path.join(CLIENT_DIST_PATH, "index.html");
  if (!fs.existsSync(htmlPath)) {
    return null;
  }
  let html = fs.readFileSync(htmlPath, "utf-8");

  // Extract CSS and JS references and add preload hints
  const preloadHints: string[] = [];
  const cssMatch = html.match(/href="(\/styles\/[^"]+\.css)"/);
  if (cssMatch) {
    preloadHints.push(`<link rel="preload" as="style" href="${cssMatch[1]}">`);
  }
  const jsMatch = html.match(/src="(\/scripts\/[^"]+\.js)"/);
  if (jsMatch) {
    preloadHints.push(`<link rel="modulepreload" href="${jsMatch[1]}">`);
  }
  if (preloadHints.length > 0) {
    html = html.replace("</head>", `${preloadHints.join("\n")}\n</head>`);
  }

  cachedHtmlTemplate = html;
  return cachedHtmlTemplate;
}

staticRouter.get("/", async (_req, res, next) => {
  try {
    const template = getHtmlTemplate();
    if (template === null) {
      return next();
    }

    let html = template;

    // 初期投稿データを取得（TBT削減のため少数に）
    const posts = await Post.findAll({ limit: 10 });
    const postsJSON = JSON.stringify(posts);

    // LCP画像のプリロードリンクを生成
    const firstPostWithImage = posts.find((p: any) => p.toJSON().images?.length > 0);
    const firstImage = firstPostWithImage ? (firstPostWithImage.toJSON() as any).images?.[0] : null;
    let preloadLinks = "";
    if (firstImage) {
      preloadLinks += `<link rel="preload" as="image" href="/images/${firstImage.id}.webp?w=800&format=webp" type="image/webp">`;
    }

    // headにプリロードリンクを注入
    if (preloadLinks) {
      html = html.replace("</head>", `${preloadLinks}\n</head>`);
    }

    // LCP画像をReactルートの外に配置（JS実行前にLCP達成）
    // Reactがレンダリング完了するとapp:not(:empty)になり、CSSでプレースホルダーが非表示になる
    if (firstImage) {
      const imgSrc = `/images/${firstImage.id}.jpg?w=800&format=webp`;
      const placeholder = `<div id="lcp-placeholder" style="position:fixed;top:0;left:192px;right:0;padding:80px 16px 16px"><div style="aspect-ratio:16/9;max-width:600px;overflow:hidden;border-radius:8px"><img src="${imgSrc}" alt="" style="width:100%;height:100%;object-fit:cover" fetchpriority="high" width="800" height="450"></div></div><style>#app:not(:empty) ~ #lcp-placeholder{display:none}</style>`;
      html = html.replace('<div id="app"></div>', `<div id="app"></div>${placeholder}`);
    }

    // bodyに初期データを注入（scriptタグの前に配置）
    html = html.replace("</body>", `<script>window.__INITIAL_POSTS__=${postsJSON}</script>\n</body>`);

    res.type("html").send(html);
  } catch (_e) {
    return next();
  }
});

// 投稿詳細ページ用: 初期データとLCP画像プリロードをHTMLに注入
staticRouter.get("/posts/:postId", async (req, res, next) => {
  try {
    const template = getHtmlTemplate();
    if (template === null) {
      return next();
    }

    let html = template;

    const post = await Post.findByPk(req.params.postId);
    if (post !== null) {
      const postJSON = JSON.stringify(post);
      const postData = post.toJSON() as any;

      // LCP画像のプリロードリンクを生成
      let preloadLinks = "";
      const firstImage = postData.images?.[0];
      if (firstImage) {
        preloadLinks += `<link rel="preload" as="image" href="/images/${firstImage.id}.webp?w=800&format=webp" type="image/webp">`;
      }

      if (preloadLinks) {
        html = html.replace("</head>", `${preloadLinks}\n</head>`);
      }

      // LCP画像をReactルートの外に配置
      if (firstImage) {
        const imgSrc = `/images/${firstImage.id}.jpg?w=800&format=webp`;
        const placeholder = `<div id="lcp-placeholder" style="position:fixed;top:0;left:192px;right:0;padding:80px 16px 16px"><div style="aspect-ratio:16/9;max-width:600px;overflow:hidden;border-radius:8px"><img src="${imgSrc}" alt="" style="width:100%;height:100%;object-fit:cover" fetchpriority="high" width="800" height="450"></div></div><style>#app:not(:empty) ~ #lcp-placeholder{display:none}</style>`;
        html = html.replace('<div id="app"></div>', `<div id="app"></div>${placeholder}`);
      }

      html = html.replace("</body>", `<script>window.__INITIAL_POST__=${postJSON}</script>\n</body>`);
    }

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
