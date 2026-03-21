import { expect, test } from "@playwright/test";

import { login } from "./utils";

test.describe("Crok AIチャット - ナビゲーション（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("タイトルが「Crok - CaX」となること", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Crok" }).click();
    await page.waitForURL("**/crok", { timeout: 10_000 });
    await expect(page).toHaveTitle("Crok - CaX", { timeout: 10_000 });
  });

  test("サインイン済みの場合、サイドバーにCrokのリンクが表示されること", async ({ page }) => {
    await login(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Crok" })).toBeVisible({ timeout: 10_000 });
  });

  test("未サインインの場合、Crokのリンクが表示されないこと", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Crok" })).not.toBeVisible();
  });

  test("初回表示時にウェルカム画面「AIアシスタントに質問してみましょう」が表示されること", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("link", { name: "Crok" }).click();
    await page.waitForURL("**/crok", { timeout: 10_000 });
    await expect(page.getByText("AIアシスタントに質問してみましょう")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Crok AIチャット - サジェスト（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.getByRole("link", { name: "Crok" }).click();
    await page.waitForURL("**/crok", { timeout: 10_000 });
  });

  test("「TypeScriptの型」を入力するとサジェスト候補が10件表示されること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    await chatInput.pressSequentially("TypeScriptの型");

    const suggestions = page.getByRole("listbox", { name: "サジェスト候補" });
    await suggestions.waitFor({ timeout: 30_000 });

    const buttons = suggestions.locator("button");
    await expect(async () => {
      const count = await buttons.count();
      expect(count).toBe(10);
    }).toPass({ timeout: 10_000 });
  });

  test("サジェスト候補は入力内容に基づいてリアルタイムに絞り込まれること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    await chatInput.pressSequentially("TypeScript");

    const suggestions = page.getByRole("listbox", { name: "サジェスト候補" });
    await suggestions.waitFor({ timeout: 30_000 });

    const firstCount = await suggestions.locator("button").count();

    // さらに入力して絞り込む
    await chatInput.pressSequentially("の型システム");

    // サジェスト候補数が変化する
    await expect(async () => {
      const newCount = await suggestions.locator("button").count();
      expect(newCount).not.toBe(firstCount);
    }).toPass({ timeout: 10_000 });
  });

  test("サジェスト候補をクリックすると入力欄にテキストが反映されること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    await chatInput.pressSequentially("TypeScriptの型");

    const suggestions = page.getByRole("listbox", { name: "サジェスト候補" });
    await suggestions.waitFor({ timeout: 30_000 });

    const firstSuggestion = suggestions.locator("button").first();
    const suggestionText = await firstSuggestion.innerText();
    await firstSuggestion.click();

    // 入力欄にサジェストのテキストが反映される
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toContain(suggestionText.trim());
  });

  test("サジェスト候補にマッチした名詞がハイライトされること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    await chatInput.pressSequentially("TypeScriptの型");

    const suggestions = page.getByRole("listbox", { name: "サジェスト候補" });
    await suggestions.waitFor({ timeout: 30_000 });

    // ハイライト要素（bg-cax-highlight クラスのspan）が存在する
    const highlights = suggestions.locator("span.bg-cax-highlight");
    await expect(async () => {
      const count = await highlights.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });
  });
});

test.describe("Crok AIチャット - メッセージ送信（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.getByRole("link", { name: "Crok" }).click();
    await page.waitForURL("**/crok", { timeout: 10_000 });
  });

  test("レスポンスが返却されている間は送信ボタンが無効化されること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    const prompt = "テスト質問";
    await chatInput.fill(prompt);

    const sendButton = page.getByRole("button", { name: "送信" });
    await sendButton.click();

    // ストリーミング中は送信ボタンが無効化される
    await expect(sendButton).toBeDisabled({ timeout: 10_000 });

    // ストリーミング完了まで待つ
    await expect(page.getByText("Crok AIは間違いを起こす可能性があります。")).toBeVisible({
      timeout: 300_000,
    });

    // 完了後は送信ボタンが有効になる
    await expect(sendButton).toBeEnabled({ timeout: 10_000 });
  });

  test("Enterでメッセージを送信できること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    const prompt = "Enter送信テスト";
    await chatInput.fill(prompt);

    // Enterキーで送信
    await page.keyboard.press("Enter");

    // ユーザーメッセージが表示される
    await expect(page.getByText(prompt)).toBeVisible({ timeout: 10_000 });

    // AIが応答を開始する
    await expect(page.getByText("AIが応答を生成中...")).toBeVisible({ timeout: 10_000 });
  });

  test("Shift+Enterで改行できること", async ({ page }) => {
    const chatInput = page.getByPlaceholder("メッセージを入力...");
    await chatInput.fill("1行目");
    await page.keyboard.press("Shift+Enter");
    await chatInput.pressSequentially("2行目");

    // 入力欄に改行が含まれる
    const value = await chatInput.inputValue();
    expect(value).toContain("\n");

    // メッセージが送信されていない（ページに変化がない）
    await expect(page.getByText("AIが応答を生成中...")).not.toBeVisible();
  });
});

test.describe("Crok AIチャット - Markdownレンダリング（機能テスト）", () => {
  test("AIのレスポンスにMarkdownが正しくレンダリングされること", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.getByRole("link", { name: "Crok" }).click();
    await page.waitForURL("**/crok", { timeout: 10_000 });

    const chatInput = page.getByPlaceholder("メッセージを入力...");
    const prompt =
      '『走れメロス』って、冷笑系の"どうせ人なんか信じても無駄"に対する話なんだと思うんだけどどう？';
    await chatInput.fill(prompt);
    await page.getByRole("button", { name: "送信" }).click();

    // SSE完了を待つ
    await expect(page.getByText("Crok AIは間違いを起こす可能性があります。")).toBeVisible({
      timeout: 300_000,
    });

    // コードブロックが存在する（pre > code）
    const codeBlocks = page.locator("pre code");
    await expect(async () => {
      const count = await codeBlocks.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });

    // シンタックスハイライトされている（コードブロック内にspan要素がある）
    const highlightedSpans = codeBlocks.first().locator("span");
    await expect(async () => {
      const count = await highlightedSpans.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });

    // 数式がKaTeXでレンダリングされている
    const katexElements = page.locator(".katex");
    await expect(async () => {
      const count = await katexElements.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });
  });
});
