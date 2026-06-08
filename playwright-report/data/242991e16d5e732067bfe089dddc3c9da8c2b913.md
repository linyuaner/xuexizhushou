# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> 登录页面 >> 用户名和密码为空时显示错误
- Location: tests\e2e\login.spec.ts:15:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=请输入')
Expected: visible
Timeout: 2000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 2000ms
  - waiting for locator('text=请输入')

```

```yaml
- banner:
  - img
  - text: 刷题助手
  - button "登录"
- main:
  - heading "登录" [level=1]
  - text: "*用户名"
  - img
  - textbox "*用户名":
    - /placeholder: 请输入用户名
  - text: "*密码"
  - img
  - textbox "*密码":
    - /placeholder: 请输入密码
  - button "登录"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('登录页面', () => {
  4  |   test('页面加载正常', async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await expect(page).toHaveURL(/.*login/)
  7  |   })
  8  | 
  9  |   test('显示登录表单', async ({ page }) => {
  10 |     await page.goto('/')
  11 |     await expect(page.locator('input[type="text"], input[placeholder*="用户名"], input[placeholder*="账号"]')).toBeVisible()
  12 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  13 |   })
  14 | 
  15 |   test('用户名和密码为空时显示错误', async ({ page }) => {
  16 |     await page.goto('/')
  17 |     const hasLoginButton = await page.locator('button:has-text("登录"), button:has-text("Sign in"), button[type="submit"]').count() > 0
  18 |     if (hasLoginButton) {
  19 |       await page.locator('button:has-text("登录"), button:has-text("Sign in"), button[type="submit"]').first().click()
> 20 |       await expect(page.locator('text=请输入')).toBeVisible({ timeout: 2000 })
     |                                              ^ Error: expect(locator).toBeVisible() failed
  21 |     }
  22 |   })
  23 | })
  24 | 
```