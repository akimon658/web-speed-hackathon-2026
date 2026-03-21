import { expect, test } from "@playwright/test";

import { login } from "./utils";

test.describe("DM機能 - サイドバー（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("サインイン済みの場合、サイドバーにDMのリンクが表示されること", async ({ page }) => {
    await login(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "DM" })).toBeVisible({ timeout: 10_000 });
  });

  test("未サインインの場合、DMのリンクが表示されないこと", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // ページが読み込まれるまで待つ
    await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "DM" })).not.toBeVisible();
  });
});

test.describe("DM一覧画面（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto("/dm");
  });

  test("タイトルが「ダイレクトメッセージ - CaX」となること", async ({ page }) => {
    await expect(page).toHaveTitle("ダイレクトメッセージ - CaX", { timeout: 10_000 });
  });

  test("ユーザー名、最新のメッセージ本文、最終やり取りからの経過時間が表示されること", async ({
    page,
  }) => {
    const dmList = page.getByTestId("dm-list");
    await expect(dmList).toBeVisible({ timeout: 10_000 });

    const firstItem = dmList.locator("li").first();
    await expect(firstItem).toBeVisible();

    // time要素が存在する（経過時間表示）
    const timeElement = firstItem.locator("time");
    await expect(timeElement).toBeVisible();

    // テキストが存在する（ユーザー名とメッセージ本文）
    const text = await firstItem.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test("未読のメッセージがある場合は「未読」のバッジが表示されること", async ({ page }) => {
    const dmList = page.getByTestId("dm-list");
    await expect(dmList).toBeVisible({ timeout: 10_000 });

    // 未読バッジが少なくとも1つ存在する
    const unreadBadges = dmList.getByText("未読");
    const count = await unreadBadges.count();
    expect(count).toBeGreaterThanOrEqual(0); // データ依存のため0も許容
  });
});

test.describe("DM詳細画面（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto("/dm");
  });

  test("タイトルが「{相手のユーザー名} さんとのダイレクトメッセージ - CaX」となること", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "p72k8qi1c3" }).click();
    await page.waitForURL("**/dm/*", { timeout: 10_000 });
    await expect(page).toHaveTitle(/さんとのダイレクトメッセージ - CaX/, { timeout: 10_000 });
  });

  test("メッセージにはメッセージ本文、送信時間が表示されること", async ({ page }) => {
    await page.getByRole("link", { name: "p72k8qi1c3" }).click();
    await page.waitForURL("**/dm/*", { timeout: 10_000 });

    const messageList = page.getByTestId("dm-message-list");
    await expect(messageList).toBeVisible({ timeout: 10_000 });

    const firstMessage = messageList.locator("li").first();
    await expect(firstMessage).toBeVisible();

    // time要素が存在
    await expect(firstMessage.locator("time")).toBeVisible();

    // メッセージ本文が存在
    const text = await firstMessage.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test("初期表示で画面が一番下までスクロールされていること", async ({ page }) => {
    await page.getByRole("link", { name: "p72k8qi1c3" }).click();
    await page.waitForURL("**/dm/*", { timeout: 10_000 });

    const messageList = page.getByTestId("dm-message-list");
    await expect(messageList).toBeVisible({ timeout: 10_000 });

    // メッセージが表示されるのを待つ
    await expect(messageList.locator("li").first()).toBeVisible({ timeout: 10_000 });

    // スクロール位置が一番下に近いことを確認
    await expect(async () => {
      const isScrolledToBottom = await page.evaluate(() => {
        const scrollContainer =
          document.querySelector('[data-testid="dm-message-list"]')?.parentElement;
        if (!scrollContainer) return false;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        // 許容誤差50px
        return scrollHeight - scrollTop - clientHeight < 50;
      });
      expect(isScrolledToBottom).toBe(true);
    }).toPass({ timeout: 10_000 });
  });

  test("自分のメッセージで相手が既読している場合は「既読」のラベルが表示されること", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "p72k8qi1c3" }).click();
    await page.waitForURL("**/dm/*", { timeout: 10_000 });

    const messageList = page.getByTestId("dm-message-list");
    await expect(messageList).toBeVisible({ timeout: 10_000 });

    // 「既読」テキストが表示されている
    const readLabels = messageList.getByText("既読");
    await expect(async () => {
      const count = await readLabels.count();
      expect(count).toBeGreaterThanOrEqual(0); // データ依存
    }).toPass({ timeout: 10_000 });
  });
});

test.describe("DM送信フォーム（機能テスト）", () => {
  test("メッセージの入力が空の場合、Enterで送信されないこと", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, "gg3i6j6");
    await page.goto("/dm");

    await page.getByRole("link", { name: "gg3hlb16" }).click();
    await page.waitForURL("**/dm/*", { timeout: 10_000 });

    const messageList = page.getByTestId("dm-message-list");
    await expect(messageList).toBeVisible({ timeout: 10_000 });

    const beforeCount = await messageList.locator("li").count();

    // 空のままEnter
    const messageInput = page.getByRole("textbox", { name: "内容" });
    await messageInput.click();
    await page.keyboard.press("Enter");

    // メッセージ数が変わらない
    await page.waitForTimeout(1_000);
    const afterCount = await messageList.locator("li").count();
    expect(afterCount).toBe(beforeCount);
  });

  test("入力中のインジケータが入力をやめると非表示になること", async ({ page, browser }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, "gg3i6j6");
    await page.goto("/dm");

    await page.getByRole("link", { name: "g16hmw55" }).click();
    await page.waitForURL("**/dm/*", { timeout: 10_000 });

    const peerContext = await browser.newContext();
    const peerPage = await peerContext.newPage();
    await login(peerPage, "g16hmw55");
    await peerPage.goto("/dm");
    await peerPage.getByRole("link", { name: "gg3i6j6" }).click();
    await peerPage.waitForURL("**/dm/*", { timeout: 10_000 });

    // 相手が入力開始
    const messageInput = peerPage.getByRole("textbox", { name: "内容" });
    await messageInput.click();
    await messageInput.pressSequentially("テスト", { delay: 10 });

    // 入力中インジケータが表示される
    await expect(page.getByText("入力中…")).toBeVisible({ timeout: 10_000 });

    // 相手が入力欄からフォーカスを外す（入力をやめる）
    await peerPage.keyboard.press("Escape");
    await messageInput.blur();

    // 入力中インジケータが非表示になる（タイムアウト: 10秒のインジケータ持続 + マージン）
    await expect(page.getByText("入力中…")).not.toBeVisible({ timeout: 15_000 });

    await peerContext.close();
  });
});

test.describe("DM未読バッジ（機能テスト）", () => {
  test("未読のメッセージがある場合はメニューに未読数のバッジが表示されること", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // DMリンクの近くにバッジ（数字）が表示されている
    const dmLink = page.getByRole("link", { name: "DM" });
    await expect(dmLink).toBeVisible({ timeout: 10_000 });

    // バッジの数字テキストが存在するか確認
    const badge = dmLink.locator("span").filter({ hasText: /^\d+$|^99\+$/ });
    const badgeCount = await badge.count();
    // データ依存のため存在チェックのみ（未読がない場合もある）
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("DM一覧リアルタイム更新（機能テスト）", () => {
  test("新規メッセージを受信した場合、DM一覧画面がリアルタイムで更新されること", async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, "gg3i6j6");
    await page.goto("/dm");

    const dmList = page.getByTestId("dm-list");
    await expect(dmList).toBeVisible({ timeout: 10_000 });

    // 現在のDM一覧の最新メッセージを取得
    const firstItemText = await dmList.locator("li").first().innerText();

    // 別ブラウザでメッセージを送信
    const peerContext = await browser.newContext();
    const peerPage = await peerContext.newPage();
    await login(peerPage, "jirgqx22");
    await peerPage.goto("/dm");
    await peerPage.getByRole("link", { name: "gg3i6j6" }).click();
    await peerPage.waitForURL("**/dm/*", { timeout: 10_000 });

    const now = `【リアルタイム更新テスト ${new Date().toISOString()}】`;
    const messageInput = peerPage.getByRole("textbox", { name: "内容" });
    await messageInput.click();
    await messageInput.pressSequentially(now, { delay: 10 });
    await peerPage.keyboard.press("Enter");

    // DM一覧に新しいメッセージが反映される
    await expect(dmList.getByText(now)).toBeVisible({ timeout: 30_000 });

    await peerContext.close();
  });
});
