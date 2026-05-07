declare module 'pg' {
  export class Client {
    constructor(config?: { connectionString?: string })
    connect(): Promise<void>
    end(): Promise<void>
    query<T = any>(text: string, values?: any[]): Promise<{ rows: T[] }>
  }
}
