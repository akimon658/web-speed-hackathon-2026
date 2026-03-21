import { expect, test } from "@playwright/test";

import { login } from "./utils";

test.describe("サインイン・新規登録（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("サインアウトが成功するとサイドバーにサインインボタンが出現すること", async ({ page }) => {
    await login(page);

    // アカウントメニューを開く
    await page.getByRole("button", { name: "アカウントメニュー" }).click();

    // サインアウトボタンをクリック
    await page.getByRole("button", { name: "サインアウト" }).click();

    // サインインボタンが表示される
    await expect(page.getByRole("button", { name: "サインイン" })).toBeVisible({ timeout: 10_000 });
  });

  test("パスワードに記号が含まれていない場合、バリデーションエラーが表示されること", async ({
    page,
  }) => {
    await page.goto("/not-found", { waitUntil: "domcontentloaded" });
    const signinButton = page.getByRole("button", { name: "サインイン" });
    await expect(signinButton).toBeVisible({ timeout: 30_000 });
    await signinButton.click();
    await page.getByRole("heading", { name: "サインイン" }).waitFor({ timeout: 10_000 });

    // 新規登録画面へ
    await page.getByRole("button", { name: "初めての方はこちら" }).click();
    await page.getByRole("heading", { name: "新規登録" }).waitFor({ timeout: 10_000 });

    await page.getByRole("textbox", { name: "ユーザー名" }).pressSequentially("test_pwval");
    await page.getByRole("textbox", { name: "名前" }).pressSequentially("テスト");

    // 記号なしの16文字以上パスワード
    await page
      .getByRole("textbox", { name: "パスワード" })
      .pressSequentially("abcdefghijklmnop");
    await page.getByRole("textbox", { name: "パスワード" }).blur();

    // バリデーションエラーが表示される
    await expect(page.getByText("パスワードには記号を含める必要があります")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("サインインが成功するとモーダルが閉じ、サイドバーにサインアウトボタンが出現すること", async ({
    page,
  }) => {
    await page.goto("/not-found", { waitUntil: "domcontentloaded" });
    const signinButton = page.getByRole("button", { name: "サインイン" });
    await expect(signinButton).toBeVisible({ timeout: 30_000 });
    await signinButton.click();
    await page.getByRole("heading", { name: "サインイン" }).waitFor({ timeout: 10_000 });

    await page.getByRole("textbox", { name: "ユーザー名" }).pressSequentially("o6yq16leo");
    await page.getByRole("textbox", { name: "パスワード" }).pressSequentially("wsh-2026");
    await page.getByRole("button", { name: "サインイン" }).last().click();

    // モーダルが閉じる（サインインダイアログが消える）
    await expect(page.getByRole("heading", { name: "サインイン" })).not.toBeVisible({
      timeout: 30_000,
    });

    // アカウントメニューを開いてサインアウトボタンが存在する
    await page.getByRole("button", { name: "アカウントメニュー" }).click();
    await expect(page.getByRole("button", { name: "サインアウト" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
