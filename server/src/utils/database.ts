import 'dotenv/config'
import initSqlJs from 'sql.js'
import { randomUUID } from 'crypto'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '../../data/quiz.db')
const dataDir = join(__dirname, '../../data')

interface DbHelper {
  prepare: (sql: string) => {
    run: (...params: any[]) => { lastInsertRowid?: any }
    get: <T = any>(...params: any[]) => T | null
    all: <T = any>(...params: any[]) => T[]
  }
  save: () => void
}

let db: any = null

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const DB_VERSION = 2

interface MigrationRecord {
  id: string
  version: number
  description: string
  executed_at: string
  success: number
  error_message?: string
}

function createMigrationTable(): void {
  if (!db) return
  
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      description TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      UNIQUE(version)
    )
  `)
}

function getExecutedMigrations(): number[] {
  if (!db) return []
  
  const result = db.exec(`SELECT version FROM schema_migrations WHERE success = 1 ORDER BY version ASC`)
  if (result.length === 0 || result[0].values.length === 0) return []
  
  return result[0].values.map((row: any[]) => row[0] as number)
}

function recordMigration(version: number, description: string, success: boolean, error?: string): void {
  if (!db) return
  
  const id = randomUUID()
  const executedAt = new Date().toISOString()
  
  db.run(
    `INSERT OR REPLACE INTO schema_migrations (id, version, description, executed_at, success, error_message) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, version, description, executedAt, success ? 1 : 0, error || null]
  )
}

const migrations: { version: number; description: string; up: () => void }[] = [
  {
    version: 1,
    description: '添加 questions_json 列到 practice_history',
    up: () => {
      try {
        db.run(`ALTER TABLE practice_history ADD COLUMN questions_json TEXT`)
      } catch (e: any) {
        if (!e.message.includes('duplicate column name')) {
          throw e
        }
      }
    }
  },
  {
    version: 2,
    description: '添加 current_question_index 列到 practice_history',
    up: () => {
      try {
        db.run(`ALTER TABLE practice_history ADD COLUMN current_question_index INTEGER DEFAULT 0`)
      } catch (e: any) {
        if (!e.message.includes('duplicate column name')) {
          throw e
        }
      }
    }
  }
]

function runMigrations(): void {
  if (!db) return
  
  try {
    createMigrationTable()
    
    const executedVersions = getExecutedMigrations()
    const currentDbVersion = executedVersions.length > 0 ? Math.max(...executedVersions) : 0
    
    console.log('========================================')
    console.log('数据库迁移检查')
    console.log('当前数据库版本:', currentDbVersion)
    console.log('目标数据库版本:', DB_VERSION)
    console.log('========================================')
    
    if (currentDbVersion >= DB_VERSION) {
      console.log('数据库已是最新版本，无需迁移')
      db.run(`PRAGMA user_version = ${DB_VERSION}`)
      return
    }
    
    const migrationsToRun = migrations.filter(m => !executedVersions.includes(m.version) && m.version <= DB_VERSION)
    
    if (migrationsToRun.length === 0) {
      console.log('没有待执行的迁移')
      db.run(`PRAGMA user_version = ${DB_VERSION}`)
      return
    }
    
    console.log('待执行迁移数量:', migrationsToRun.length)
    
    for (const migration of migrationsToRun) {
      console.log('')
      console.log('执行迁移: version', migration.version, '-', migration.description)
      console.log('----------------------------------------')
      
      try {
        migration.up()
        recordMigration(migration.version, migration.description, true)
        console.log('✓ 迁移执行成功')
      } catch (error: any) {
        const errorMsg = error.message || String(error)
        console.error('✗ 迁移执行失败:', errorMsg)
        recordMigration(migration.version, migration.description, false, errorMsg)
        throw error
      }
    }
    
    db.run(`PRAGMA user_version = ${DB_VERSION}`)
    console.log('')
    console.log('========================================')
    console.log('数据库迁移完成，当前版本:', DB_VERSION)
    console.log('========================================')
    
  } catch (error) {
    console.error('数据库迁移过程出错:', error)
    throw error
  }
}

function createTables(): void {
  if (!db) return

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      explanation TEXT,
      difficulty TEXT DEFAULT 'medium',
      category_id TEXT,
      tags TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS question_banks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      question_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS bank_questions (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_id) REFERENCES question_banks(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS practice_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_id TEXT,
      practice_type TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      start_time DATETIME,
      end_time DATETIME,
      duration INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      current_question_index INTEGER DEFAULT 0,
      questions_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (bank_id) REFERENCES question_banks(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_answers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT,
      is_correct INTEGER DEFAULT 0,
      practice_session_id TEXT,
      time_spent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (practice_session_id) REFERENCES practice_history(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      UNIQUE(user_id, question_id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS question_stats (
      id TEXT PRIMARY KEY,
      question_id TEXT UNIQUE NOT NULL,
      total_attempts INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      error_rate REAL DEFAULT 0,
      average_time REAL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_answers_question ON user_answers(question_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_answers_user_question ON user_answers(user_id, question_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_practice_history_user ON practice_history(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_practice_history_bank ON practice_history(bank_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_practice_history_user_bank ON practice_history(user_id, bank_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_favorites_question ON user_favorites(question_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_notes_question ON user_notes(question_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_bank_questions_bank ON bank_questions(bank_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_bank_questions_question ON bank_questions(question_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_question_stats_question ON question_stats(question_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_question_banks_user ON question_banks(user_id)`)
}

function insertSampleData(): void {
  console.log('示例数据插入已禁用')
}

function saveDatabase(): void {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

const dbHelper: DbHelper = {
  prepare(sql: string) {
    return {
      run: (...params: any[]) => {
        db?.run(sql, params as any[])
        const result = db?.exec('SELECT last_insert_rowid()')
        return { lastInsertRowid: result?.[0]?.values?.[0]?.[0] }
      },
      get: <T = any>(...params: any[]): T | null => {
        if (!db) return null
        const result = db.exec(sql, params as any[])
        if (result.length === 0 || result[0].values.length === 0) return null
        const columns = result[0].columns
        const values = result[0].values[0]
        const obj: Record<string, any> = {}
        columns.forEach((col: string, i: number) => { obj[col] = values[i] })
        return obj as T
      },
      all: <T = any>(...params: any[]): T[] => {
        if (!db) return []
        const result = db.exec(sql, params as any[])
        if (result.length === 0) return []
        const columns = result[0].columns
        return result[0].values.map((row: any[]) => {
          const obj: Record<string, any> = {}
          columns.forEach((col: string, i: number) => { obj[col] = row[i] })
          return obj as T
        })
      }
    }
  },
  save: () => {
    saveDatabase()
  }
}

export function getDatabase(): DbHelper {
  return dbHelper
}

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('开始初始化数据库...')

    const SQL = await initSqlJs()

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
      console.log('已加载已有数据库')
    } else {
      db = new SQL.Database()
      console.log('创建新数据库')
    }

    createTables()
    runMigrations()
    insertSampleData()
    saveDatabase()
    console.log('数据库初始化成功')
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

export default { getDatabase, initializeDatabase }
