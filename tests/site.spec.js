import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const locales = [
  {
    language: "es",
    path: "/",
    other: "EN — English",
    returnLabel: "ES — Español",
  },
  {
    language: "en",
    path: "/en/",
    other: "ES — Español",
    returnLabel: "EN — English",
  },
];
const route = ["process", "data", "agents", "apis", "human", "observe"];

for (const locale of locales) {
  test.describe(locale.language, () => {
    for (const width of [320, 390, 768, 1440]) {
      test(`fits a ${width}px viewport and passes automated accessibility checks`, async ({
        page,
      }) => {
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(locale.path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute(
          "lang",
          locale.language,
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await page
            .locator("img")
            .evaluateAll((images) =>
              images.every((image) => image.complete && image.naturalWidth > 0),
            ),
        ).toBe(true);
        await expect(page.locator('[data-choice="agents"]')).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        expect(errors).toEqual([]);
      });
    }

    test("supports the keyboard, walkthrough, disclosures and language switch", async ({
      page,
    }) => {
      await page.goto(locale.path);
      await page.keyboard.press("Tab");
      await expect(page.locator(".skip")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();

      const walk = page.locator("[data-walk]");
      for (const [index, key] of route.entries()) {
        await walk.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator(`[data-choice="${key}"]`)).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(page.locator("[data-panel]:visible")).toHaveCount(1);
        await expect(page.locator(`#map-${key}`)).toBeVisible();
        await expect(page.locator("[data-walk-status]")).toContainText(
          `${String(index + 1).padStart(2, "0")} / 06`,
        );
      }
      await page.locator('[data-choice="data"]').focus();
      await page.keyboard.press("Space");
      await expect(page.locator("#map-data")).toBeVisible();
      await walk.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#map-process")).toBeVisible();

      for (const details of await page.locator("details").all()) {
        const wasOpen = await details.evaluate((element) => element.open);
        await details.locator("summary").focus();
        await page.keyboard.press("Enter");
        expect(await details.evaluate((element) => element.open)).toBe(
          !wasOpen,
        );
      }
      for (const details of await page.locator("details").all()) {
        if (!(await details.evaluate((element) => element.open)))
          await details.locator("summary").click();
      }
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations,
      ).toEqual([]);

      for (const anchor of [
        "about",
        "work",
        "approach",
        "learning",
        "contact",
      ]) {
        await page.locator(`.header a[href="#${anchor}"]`).click();
        await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
      }
      await page.getByRole("link", { name: locale.other, exact: true }).click();
      await expect(page.locator("html")).not.toHaveAttribute(
        "lang",
        locale.language,
      );
      await page
        .getByRole("link", { name: locale.returnLabel, exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        locale.language,
      );
      await expect(page.locator(".contact a[href^='mailto:']")).toHaveAttribute(
        "href",
        "mailto:jingguan.chong@gmail.com",
      );
    });

    test("honours reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(locale.path);
      await page.locator("[data-walk]").click();
      expect(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
      ).toBe("auto");
      expect(
        await page
          .locator(".edge")
          .evaluateAll((edges) =>
            edges.every(
              (edge) => getComputedStyle(edge).animationName === "none",
            ),
          ),
      ).toBe(true);
    });

    test("keeps content and language navigation usable without JavaScript", async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:4187${locale.path}`);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("[data-panel]:visible")).toHaveCount(6);
        await expect(page.locator("#work")).toContainText("StartMotion Auto");
        const first = page.locator("#work details").first();
        await first.locator("summary").click();
        await expect(first.locator(".context-body")).toBeVisible();
        await page
          .getByRole("link", { name: locale.other, exact: true })
          .click();
        await expect(page.locator("html")).not.toHaveAttribute(
          "lang",
          locale.language,
        );
      } finally {
        await context.close();
      }
    });
  });
}
