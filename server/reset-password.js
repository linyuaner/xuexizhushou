#!/usr/bin/env node
import bcrypt from 'bcryptjs';
import { initializeDatabase, getDatabase } from './utils/database.js';

async function resetPassword() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: node reset-password.js <用户名> <新密码>');
    console.log('示例: node reset-password.js admin newpassword123');
    process.exit(1);
  }

  const [username, newPassword] = args;

  if (newPassword.length < 6) {
    console.error('❌ 错误: 新密码长度至少6位');
    process.exit(1);
  }

  try {
    await initializeDatabase();
    const db = getDatabase();

    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (!user) {
      console.error(`❌ 错误: 用户 "${username}" 不存在`);
      process.exit(1);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newPasswordHash, user.id);

    console.log(`✅ 成功: 用户 "${username}" 的密码已重置`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

resetPassword();
