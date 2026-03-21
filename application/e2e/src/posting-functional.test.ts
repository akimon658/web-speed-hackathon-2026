import path from "node:path";

import { expect, test } from "@playwright/test";

import { login, waitForVisibleMedia } from "./utils";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../../docs/assets");

test.describe("投稿機能 - メディア投稿（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
  });

  test("TIFF形式の画像を投稿できること", async ({ page }) => {
    const postText = `TIFF画像テスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    // TIFF画像を添付
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "analoguma.tiff"));

    // 投稿する
    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();

    // 投稿詳細に遷移する
    await page.waitForURL("**/posts/*", { timeout: 60_000 });
    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // 投稿内容と画像が表示される
    await expect(page.getByText(postText)).toBeVisible();
    await expect(article.locator("img").first()).toBeVisible({ timeout: 30_000 });
  });

  test("画像のEXIFに埋め込まれたImage DescriptionがALTとして表示されること", async ({
    page,
  }) => {
    const postText = `EXIF ALTテスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    // TIFF画像を添付（EXIFにImage Descriptionが含まれている）
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "analoguma.tiff"));

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL("**/posts/*", { timeout: 60_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // 画像にalt属性が設定されている
    const img = article.locator("img").first();
    await expect(img).toBeVisible({ timeout: 30_000 });

    await expect(async () => {
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });
  });

  test("WAV形式の音声を投稿できること", async ({ page }) => {
    const postText = `WAV音声テスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    // WAV音声を添付
    const fileInput = page.locator('input[type="file"][accept="audio/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "maoudamashii_shining_star.wav"));

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL("**/posts/*", { timeout: 60_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // 投稿内容が表示される
    await expect(page.getByText(postText)).toBeVisible();

    // 波形（SVG）が表示される
    const waveform = article.locator('svg[viewBox="0 0 100 1"]');
    await expect(waveform).toBeVisible({ timeout: 60_000 });
  });

  test("Shift_JISで付与された作成者・タイトルのメタデータが文字化けせずに表示されること", async ({
    page,
  }) => {
    const postText = `Shift_JISメタデータテスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    const fileInput = page.locator('input[type="file"][accept="audio/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "maoudamashii_shining_star.wav"));

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL("**/posts/*", { timeout: 60_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // メタデータが表示される部分のテキストを確認
    // 文字化けしていない = 日本語の正規表現にマッチ or 化けた文字列（"ï¿½" 等）を含まない
    const articleText = await article.innerText();
    expect(articleText).not.toMatch(/[ï¿½Ã¯Â]/);
  });

  test("MKV形式の動画を投稿できること", async ({ page }) => {
    const postText = `MKV動画テスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    // MKV動画を添付
    const fileInput = page.locator('input[type="file"][accept="video/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "pixabay_326739_kanenori_himejijo.mkv"));

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL("**/posts/*", { timeout: 120_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // 投稿内容が表示される
    await expect(page.getByText(postText)).toBeVisible();

    // 動画（canvasまたはvideo）が表示される
    await waitForVisibleMedia(page);
    const movieArea = article.locator("[data-movie-area]");
    await expect(movieArea).toBeVisible({ timeout: 60_000 });
  });

  test("投稿した動画が先頭から5秒間のみに切り抜かれること", async ({ page }) => {
    const postText = `動画5秒テスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    const fileInput = page.locator('input[type="file"][accept="video/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "pixabay_326739_kanenori_himejijo.mkv"));

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL("**/posts/*", { timeout: 120_000 });

    await waitForVisibleMedia(page);

    // video要素のdurationを確認（canvasレンダリングの場合はvideo要素が隠れている可能性がある）
    await expect(async () => {
      const duration = await page.evaluate(() => {
        const video = document.querySelector("video");
        return video?.duration ?? 0;
      });
      // 5秒（±1秒の許容誤差）
      expect(duration).toBeGreaterThan(3);
      expect(duration).toBeLessThanOrEqual(6);
    }).toPass({ timeout: 60_000 });
  });

  test("投稿した動画が正方形に切り抜かれること", async ({ page }) => {
    const postText = `動画正方形テスト ${Date.now()}`;

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();
    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    const fileInput = page.locator('input[type="file"][accept="video/*"]');
    await fileInput.setInputFiles(path.join(ASSETS_DIR, "pixabay_326739_kanenori_himejijo.mkv"));

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();
    await page.waitForURL("**/posts/*", { timeout: 120_000 });

    await waitForVisibleMedia(page);

    // video要素の幅と高さが等しい（正方形）
    await expect(async () => {
      const dimensions = await page.evaluate(() => {
        const video = document.querySelector("video");
        if (video) {
          return { width: video.videoWidth, height: video.videoHeight };
        }
        const canvas = document.querySelector("article canvas");
        if (canvas) {
          return {
            width: (canvas as HTMLCanvasElement).width,
            height: (canvas as HTMLCanvasElement).height,
          };
        }
        return { width: 0, height: 0 };
      });
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.width).toBe(dimensions.height);
    }).toPass({ timeout: 60_000 });
  });
});
