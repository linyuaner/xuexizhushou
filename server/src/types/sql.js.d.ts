declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => SqlJs.Database
  }

  export interface Database {
    run(sql: string, params?: any[]): SqlJs.Database
    exec(sql: string, params?: any[]): any[]
    prepare(sql: string): SqlJs.Statement
    close(): void
    export(): Uint8Array
  }

  export interface Statement {
    run(params?: any[]): SqlJs.Statement
    get(params?: any[]): any[]
    getAsObject(params?: any[]): Record<string, any>
    getColumnNames(): string[]
    step(): boolean
    get(params?: any[]): any[]
    getAsObject(params?: any[]): Record<string, any>
    free(): boolean
    reset(): SqlJs.Statement
  }

  type InitSqlJsStatic = (config?: {
    locateFile?: (filename: string) => string
  }) => Promise<SqlJsStatic>

  const initSqlJs: InitSqlJsStatic
  export default initSqlJs
}
