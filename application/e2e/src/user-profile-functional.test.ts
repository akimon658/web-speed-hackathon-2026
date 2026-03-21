import { expect, test } from "@playwright/test";

test.describe("ユーザー詳細（機能テスト）", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("サービス利用開始の日時が正しく表示されること", async ({ page }) => {
    await page.goto("/users/o6yq16leo");

    // time要素が存在し、datetime属性が有効な日時であること
    const timeElement = page.locator("main time").first();
    await expect(timeElement).toBeVisible({ timeout: 30_000 });

    const datetime = await timeElement.getAttribute("datetime");
    expect(datetime).toBeTruthy();
    expect(new Date(datetime!).getTime()).not.toBeNaN();
  });
});
