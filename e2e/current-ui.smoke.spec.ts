import { expect, test, type Page } from "@playwright/test";

const password = "E2E-Test-Password-123";
const directorEmail = "e2e-director@example.test";
const clientEmail = "e2e-client@example.test";

const nav = (page: Page) => page.locator(".sidebar nav button");

async function signIn(page: Page, email = directorEmail) {
  await page.goto("/");
  await page.locator('.auth-form input[name="email"]').fill(email);
  await page.locator('.auth-form input[name="password"]').fill(password);
  await page.locator(".auth-form button").first().click();
  await expect(page.locator(".app-shell")).toBeVisible();
}

test("sign in opens the dashboard and loads current CRM data", async ({
  page,
}) => {
  await signIn(page);
  await expect(nav(page)).toHaveCount(12);
  await expect(page.locator(".page h1")).not.toBeEmpty();
});

test("rejected credentials stay on the login form", async ({ page }) => {
  await page.goto("/");
  await page.locator('.auth-form input[name="email"]').fill(directorEmail);
  await page
    .locator('.auth-form input[name="password"]')
    .fill("wrong-password");
  await page.locator(".auth-form button").first().click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(page.locator(".auth-form h2")).toBeVisible();
});

test("client accounts only see the sections available to their role", async ({
  page,
}) => {
  await signIn(page, clientEmail);
  await expect(nav(page)).toHaveCount(5);
});

test("logging out returns to the login screen", async ({ page }) => {
  await signIn(page);
  await page.locator(".sidebar-footer button").click();
  await expect(page.locator(".auth-form")).toBeVisible();
});

test("current navigation switches between main sections", async ({ page }) => {
  await signIn(page);
  const initialTitle = await page.locator(".page h1").innerText();
  await nav(page).nth(1).click();
  const requestsTitle = await page.locator(".page h1").innerText();
  expect(requestsTitle).not.toBe(initialTitle);
  await nav(page).nth(3).click();
  await expect(page.locator(".page h1")).not.toHaveText(requestsTitle);
  await expect(page).toHaveURL("http://127.0.0.1:4173/organizations");
  const organizationTitle = await page.locator(".page h1").innerText();
  await page.reload();
  await expect(page.locator(".page h1")).toHaveText(organizationTitle);
});

test("request filters stay in the URL after reload", async ({ page }) => {
  await signIn(page);
  await nav(page).nth(1).click();
  const search = page.locator(".request-filters input");
  await search.fill("printer");
  await expect(page).toHaveURL(/requests\?search=printer/);
  await page.reload();
  await expect(page.locator(".request-filters input")).toHaveValue("printer");
});

test("organization and staff dialogs can be restored from their URLs", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/organizations?organizationDialog=new");
  await expect(page.locator(".modal")).toBeVisible();
  await page.reload();
  await expect(page.locator(".modal")).toBeVisible();
  await page.locator(".modal-head .icon-button").click();
  await expect(page).toHaveURL(/\/organizations$/);

  await page.goto("/staff?staffDialog=new");
  await expect(page.locator(".modal")).toBeVisible();
  await page.reload();
  await expect(page.locator(".modal")).toBeVisible();
});

test("creating a component updates the template catalog without a reload", async ({
  page,
}) => {
  await signIn(page);
  await nav(page).nth(8).click();
  const componentName = `E2E Component ${Date.now()}`;
  await page.locator('input[name="componentName"]').fill(componentName);
  await page.locator(".component-add button").click();
  await expect(page.getByText(componentName)).toBeVisible();
  await expect(page).toHaveURL("http://127.0.0.1:4173/templates");
});

test("creating a request template persists it in the templates section", async ({
  page,
}) => {
  await signIn(page);
  await nav(page).nth(8).click();
  await page.locator(".section-actions button").click();
  const templateName = `E2E Template ${Date.now()}`;
  await page.locator('.modal input[name="name"]').fill(templateName);
  await page
    .locator('select[name="departmentId"]')
    .selectOption({ label: "E2E Test Department" });
  await page.locator(".modal .modal-actions button").last().click();
  await expect(page.getByText(templateName)).toBeVisible();
});

test("a user can create a personal board and a card", async ({ page }) => {
  await signIn(page);
  await nav(page).nth(5).click();
  const boardName = `E2E Board ${Date.now()}`;
  await page.locator(".board-add").click();
  await page.locator(".modal input").fill(boardName);
  await page.locator(".modal .modal-actions button").last().click();
  await expect(page.getByRole("button", { name: boardName })).toBeVisible();
  const firstColumn = page.locator(".first-column");
  if (await firstColumn.count()) {
    await firstColumn.click();
    await page.locator(".modal input").fill("E2E First Column");
    await page.locator(".modal .modal-actions button").last().click();
  }
  await page.locator(".add-card").first().click();
  const cardName = `E2E Card ${Date.now()}`;
  await page.locator('.modal input[name="title"]').fill(cardName);
  await page.locator(".modal .modal-actions button").last().click();
  await expect(page.getByText(cardName)).toBeVisible();
  await expect(page).toHaveURL(/my-boards\?boardId=\d+/);
  await page.reload();
  await expect(page.getByText(cardName)).toBeVisible();
  await nav(page).nth(6).click();
  await expect(page).toHaveURL(/team-boards/);
  await expect(page).not.toHaveURL(/boardId=/);
  await expect(page.getByText(cardName)).toHaveCount(0);
});

test("a card can be moved between board columns by drag and drop", async ({
  page,
}) => {
  await signIn(page);
  await nav(page).nth(5).click();
  const boardName = `E2E Drag Board ${Date.now()}`;
  await page.locator(".board-add").click();
  await page.locator(".modal input").fill(boardName);
  await page.locator(".modal .modal-actions button").last().click();
  const firstColumn = page.locator(".first-column");
  if (await firstColumn.count()) {
    await firstColumn.click();
    await page.locator(".modal input").fill("E2E Source Column");
    await page.locator(".modal .modal-actions button").last().click();
  }
  await page
    .locator(".board-toolbar > div:last-child > button.button.compact")
    .last()
    .click();
  await page.locator(".modal input").fill("E2E Target Column");
  await page.locator(".modal .modal-actions button").last().click();

  const columns = page.locator(".board-column");
  await columns.first().locator(".add-card").click();
  const cardName = `E2E Drag Card ${Date.now()}`;
  await page.locator('.modal input[name="title"]').fill(cardName);
  await page.locator(".modal .modal-actions button").last().click();
  const card = page.locator(".board-card").filter({ hasText: cardName });
  const sourceBox = await card.boundingBox();
  const targetBox = await columns.nth(1).boundingBox();
  if (!sourceBox || !targetBox)
    throw new Error("Board card or target column is missing.");
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 100, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(columns.nth(1).getByText(cardName)).toBeVisible();
});

test("a staff member can add a knowledge section, article, and file", async ({
  page,
}) => {
  await signIn(page);
  await nav(page).nth(11).click();
  await page.locator(".knowledge-sidebar-head button").click();
  const sectionName = `E2E Section ${Date.now()}`;
  await page.locator('.knowledge-modal input[name="name"]').fill(sectionName);
  await page.locator(".knowledge-modal .modal-actions button.primary").click();
  await expect(page.getByText(sectionName)).toBeVisible();

  await page.locator(".knowledge-toolbar button.primary").click();
  const articleName = `E2E Article ${Date.now()}`;
  await page.locator('.knowledge-modal input[name="title"]').fill(articleName);
  await page.locator('.knowledge-modal input[type="file"]').setInputFiles({
    name: "e2e-note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("E2E attachment content"),
  });
  await page.locator(".knowledge-modal .modal-actions button.primary").click();
  await expect(page.getByRole("heading", { name: articleName })).toBeVisible();
  await expect(page.getByText("e2e-note.txt")).toBeVisible();
  await expect(page).toHaveURL(/knowledge\?sectionId=\d+&articleId=\d+/);
  await page.reload();
  await expect(page.getByRole("heading", { name: articleName })).toBeVisible();
});
