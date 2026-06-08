import { test, expect } from '@playwright/test'

test.describe('登录页面', () => {
  test('页面加载正常', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*login/)
  })

  test('显示登录表单', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('input[type="text"], input[placeholder*="用户名"], input[placeholder*="账号"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('用户名和密码为空时显示错误', async ({ page }) => {
    await page.goto('/')
    const hasLoginButton = await page.locator('button:has-text("登录"), button:has-text("Sign in"), button[type="submit"]').count() > 0
    if (hasLoginButton) {
      await page.locator('button:has-text("登录"), button:has-text("Sign in"), button[type="submit"]').first().click()
      await expect(page.locator('text=请输入')).toBeVisible({ timeout: 2000 })
    }
  })
})
