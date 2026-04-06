// JWT认证中间件
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// 生产环境必须使用环境变量密钥
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ 生产环境必须设置JWT_SECRET环境变量');
  process.exit(1);
}

// 开发环境可以使用随机生成的密钥作为fallback
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');

// 输出密钥状态（仅开发环境）
if (process.env.NODE_ENV !== 'production') {
  console.log('🔐 JWT密钥使用:', process.env.JWT_SECRET ? '环境变量' : '随机生成');
}

// 验证Token中间件
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 收到认证请求:', req.path);
  console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : '无');

  if (!token) {
    console.log('❌ 无Token');
    return res.status(401).json({ 
      success: false, 
      message: '请先登录' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token验证成功, userId:', decoded.userId);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Token验证失败:', error.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Token已过期，请重新登录' 
    });
  }
}

// 可选认证中间件（不强制登录）
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token无效，忽略但不报错
    }
  }
  
  next();
}

// 生成Token
export function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export default { authenticateToken, optionalAuth, generateToken };
