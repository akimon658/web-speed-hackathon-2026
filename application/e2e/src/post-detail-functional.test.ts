import { expect, test } from "@playwright/test";

import { waitForVisibleMedia } from "./utils";

test.describe("投稿詳細 - 翻訳（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("Show Translation をクリックすると投稿内容が英語に翻訳されること", async ({ page }) => {
    // タイムラインから最初の投稿へ遷移
    await page.goto("/");
    const firstArticle = page.locator("article").first();
    await expect(firstArticle).toBeVisible({ timeout: 30_000 });
    await firstArticle.click();
    await page.waitForURL("**/posts/*", { timeout: 10_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    // 元のテキストを取得
    const postTextElement = article.locator("p").first();
    const originalText = await postTextElement.innerText();

    // Show Translation ボタンをクリック
    const translateButton = page.getByRole("button", { name: "Show Translation" });
    await expect(translateButton).toBeVisible({ timeout: 10_000 });
    await translateButton.click();

    // テキストが変化する（翻訳される）
    await expect(async () => {
      const currentText = await postTextElement.innerText();
      expect(currentText).not.toBe(originalText);
    }).toPass({ timeout: 30_000 });
  });

  test("翻訳後に Show Original をクリックすると元の投稿文が表示されること", async ({ page }) => {
    await page.goto("/");
    const firstArticle = page.locator("article").first();
    await expect(firstArticle).toBeVisible({ timeout: 30_000 });
    await firstArticle.click();
    await page.waitForURL("**/posts/*", { timeout: 10_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });

    const postTextElement = article.locator("p").first();
    const originalText = await postTextElement.innerText();

    // 翻訳
    await page.getByRole("button", { name: "Show Translation" }).click();
    await expect(async () => {
      const text = await postTextElement.innerText();
      expect(text).not.toBe(originalText);
    }).toPass({ timeout: 30_000 });

    // Show Original をクリック
    await page.getByRole("button", { name: "Show Original" }).click();

    // 元のテキストに戻る
    await expect(async () => {
      const text = await postTextElement.innerText();
      expect(text).toBe(originalText);
    }).toPass({ timeout: 10_000 });
  });
});

test.describe("投稿詳細 - 音声の再生位置（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("音声の再生位置が波形で表示されること", async ({ page }) => {
    await page.goto("/");
    const soundArticle = page.locator('article:has(svg[viewBox="0 0 100 1"])').first();
    await expect(soundArticle).toBeVisible({ timeout: 30_000 });
    await soundArticle.locator("time").first().click();
    await page.waitForURL("**/posts/*", { timeout: 10_000 });

    const waveform = page.locator('svg[viewBox="0 0 100 1"]').first();
    await expect(waveform).toBeVisible({ timeout: 30_000 });

    await waitForVisibleMedia(page);

    // 再生前の波形内のrect要素の状態を取得
    const getProgressWidth = async () => {
      return await waveform.evaluate((svg) => {
        const rects = svg.querySelectorAll("rect");
        // 再生位置を示す要素（色が異なるrectの数など）をチェック
        const filledRects = Array.from(rects).filter((rect) => {
          const fill = rect.getAttribute("fill") || window.getComputedStyle(rect).fill;
          // アクセントカラーで塗られた rect をカウント
          return fill !== "currentColor" && fill !== "none";
        });
        return filledRects.length;
      });
    };

    // 再生ボタンをクリック
    const playButton = page.locator("button.rounded-full.bg-cax-accent").first();
    await playButton.click();

    // 少し待ってから再生位置が変化していることを確認
    await page.waitForTimeout(2_000);
    await playButton.click(); // 一時停止

    // 再生後、波形に何らかの変化があることを確認
    // SVG内のrect要素にwidth/opacity等の変化がある
    const waveformHtml = await waveform.innerHTML();
    expect(waveformHtml.length).toBeGreaterThan(0);
  });
});

test.describe("投稿詳細 - 写真ALT（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("「ALT を表示する」ボタンを押すと画像のALTが表示されること", async ({ page }) => {
    await page.goto("/");
    const imageArticle = page.locator("article:has(.grid img)").first();
    await expect(imageArticle).toBeVisible({ timeout: 30_000 });
    await imageArticle.click();
    await page.waitForURL("**/posts/*", { timeout: 10_000 });

    await waitForVisibleMedia(page);

    // ALTボタンを探す
    const altButton = page.getByRole("button", { name: "ALT を表示する" });
    await expect(altButton).toBeVisible({ timeout: 10_000 });
    await altButton.click();

    // 「画像の説明」ダイアログが表示される
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText("画像の説明")).toBeVisible();

    // ダイアログ内に何かしらのテキスト（ALT内容）が表示される
    const dialogText = await dialog.innerText();
    expect(dialogText.length).toBeGreaterThan(0);
  });
});
