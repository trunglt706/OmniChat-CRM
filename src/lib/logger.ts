export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogDriverType = 'file' | 'slack' | 'console'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  context?: string
  message: string
  meta?: Record<string, any>
  error?: {
    name?: string
    message?: string
    stack?: string
  }
  file?: string
  line?: string
  userId?: string | number
}

export interface LoggerConfig {
  drivers: LogDriverType[]
  minLevel: LogLevel
  filePath: string
  slackWebhookUrl?: string
  slackMinLevel: LogLevel
}

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
}

const RESET_COLOR = '\x1b[0m'

class Logger {
  private config: LoggerConfig

  constructor() {
    const isServer = typeof window === 'undefined'
    const envDriver = isServer ? process.env.LOG_DRIVER : undefined
    const drivers: LogDriverType[] = envDriver
      ? (envDriver.split(',').map((d) => d.trim().toLowerCase()) as LogDriverType[])
      : isServer ? ['file', 'console'] : ['console']

    const envLevel = isServer
      ? (process.env.LOG_LEVEL?.toLowerCase() || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'))
      : 'debug'

    const filePath = isServer ? (process.env.LOG_FILE_PATH || 'logs/app.log') : 'logs/app.log'
    const slackWebhookUrl = isServer ? (process.env.SLACK_WEBHOOK_URL || '') : ''
    const slackMinLevel = isServer ? (process.env.SLACK_MIN_LEVEL?.toLowerCase() || 'warn') as LogLevel : 'warn'

    this.config = {
      drivers,
      minLevel: (envLevel in LEVEL_WEIGHTS ? envLevel : 'info') as LogLevel,
      filePath,
      slackWebhookUrl,
      slackMinLevel: (slackMinLevel in LEVEL_WEIGHTS ? slackMinLevel : 'warn') as LogLevel,
    }
  }

  /**
   * Update configuration at runtime
   */
  public configure(partial: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...partial }
  }

  public getConfiguration(): LoggerConfig {
    return { ...this.config }
  }

  private shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
    return LEVEL_WEIGHTS[level] >= LEVEL_WEIGHTS[minLevel]
  }

  private createEntry(
    level: LogLevel,
    message: string,
    contextOrMeta?: string | Record<string, any> | Error | unknown,
    meta?: Record<string, any>
  ): LogEntry {
    const timestamp = new Date().toISOString()
    let context: string | undefined = undefined
    let finalMeta: Record<string, any> | undefined = meta
    let errObj: LogEntry['error'] = undefined
    let file: string | undefined = undefined
    let line: string | undefined = undefined
    let userId: string | number | undefined = undefined

    if (typeof contextOrMeta === 'string') {
      context = contextOrMeta
    } else if (contextOrMeta instanceof Error) {
      errObj = {
        name: contextOrMeta.name,
        message: contextOrMeta.message,
        stack: contextOrMeta.stack,
      }
    } else if (typeof contextOrMeta === 'object' && contextOrMeta !== null) {
      if ('stack' in (contextOrMeta as any) || 'message' in (contextOrMeta as any)) {
        const e = contextOrMeta as any
        errObj = {
          name: e.name,
          message: e.message,
          stack: e.stack,
        }
      } else {
        finalMeta = { ...(contextOrMeta as Record<string, any>), ...meta }
      }
    }

    // Extract userId from finalMeta
    if (finalMeta && 'userId' in finalMeta) {
      userId = finalMeta.userId
      delete finalMeta.userId
    }

    // Extract file and line from stack trace
    const stack = new Error().stack
    if (stack) {
      const stackLines = stack.split('\n')
      // [0]: Error
      // [1]: at Logger.createEntry
      // [2]: at Logger.info/error/debug/warn
      // [3]: actual caller
      if (stackLines.length >= 4) {
        const callerLine = stackLines[3]
        // Match standard Node/V8 stack trace format: "at FunctionName (/path/to/file.ts:line:col)"
        // or "at /path/to/file.ts:line:col"
        const match = callerLine.match(/(?:at\s+.*?\s+\()?(.*?):(\d+):(\d+)\)?/)
        if (match) {
          file = match[1].replace(process.cwd(), '') // Make path relative
          line = match[2]
        }
      }
    }

    return {
      timestamp,
      level,
      context,
      message,
      meta: finalMeta && Object.keys(finalMeta).length > 0 ? finalMeta : undefined,
      error: errObj,
      file,
      line,
      userId,
    }
  }

  private dispatch(entry: LogEntry) {
    if (!this.shouldLog(entry.level, this.config.minLevel)) {
      return
    }

    for (const driver of this.config.drivers) {
      switch (driver) {
        case 'console':
          this.writeToConsole(entry)
          break
        case 'file':
          this.writeToFile(entry)
          break
        case 'slack':
          if (this.shouldLog(entry.level, this.config.slackMinLevel)) {
            this.writeToSlack(entry).catch(() => {})
          }
          break
      }
    }
  }

  private writeToConsole(entry: LogEntry) {
    const color = LEVEL_COLORS[entry.level] || ''
    const ctx = entry.context ? `[${entry.context}] ` : ''
    const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : ''
    const errStr = entry.error ? `\nStack: ${entry.error.stack || entry.error.message}` : ''
    const logLine = `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}]${RESET_COLOR} ${ctx}${entry.message}${metaStr}${errStr}`

    if (entry.level === 'error') {
      console.error(logLine)
    } else if (entry.level === 'warn') {
      console.warn(logLine)
    } else {
      console.log(logLine)
    }
  }

  private writeToFile(entry: LogEntry) {
    if (typeof window !== 'undefined') return
    try {
      // Dynamic require to prevent client bundlers from including fs/path
      const fs = eval('require')('fs')
      const path = eval('require')('path')

      const fullPath = path.isAbsolute(this.config.filePath)
        ? this.config.filePath
        : path.join(process.cwd(), this.config.filePath)

      const dir = path.dirname(fullPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const logObject = {
        time: entry.timestamp,
        level: entry.level,
        ...(entry.context && { context: entry.context }),
        msg: entry.message,
        ...(entry.userId && { userId: entry.userId }),
        ...(entry.file && { file: entry.file }),
        ...(entry.line && { line: entry.line }),
        ...(entry.meta && { meta: entry.meta }),
        ...(entry.error && { error: entry.error }),
      }

      const line = JSON.stringify(logObject) + '\n'
      fs.appendFile(fullPath, line, (err: any) => {
        if (err) console.error('[Logger FileDriver Error]', err)
      })
    } catch (e) {
      console.error('[Logger FileDriver Exception]', e)
    }
  }

  private async writeToSlack(entry: LogEntry) {
    if (!this.config.slackWebhookUrl) return

    const slackColorMap: Record<LogLevel, string> = {
      debug: '#6b7280',
      info: '#3b82f6',
      warn: '#f59e0b',
      error: '#ef4444',
    }

    const payload = {
      attachments: [
        {
          color: slackColorMap[entry.level],
          title: `[${entry.level.toUpperCase()}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`,
          text: entry.error?.stack
            ? `\`\`\`${entry.error.stack.slice(0, 1000)}\`\`\``
            : entry.meta
            ? `\`\`\`${JSON.stringify(entry.meta, null, 2)}\`\`\``
            : undefined,
          ts: Math.floor(new Date(entry.timestamp).getTime() / 1000),
          footer: 'OmniChat-CRM Logger',
        },
      ],
    }

    try {
      await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e) {
      console.error('[Logger SlackDriver Error]', e)
    }
  }

  public debug(message: string, contextOrMeta?: string | Record<string, any>, meta?: Record<string, any>) {
    this.dispatch(this.createEntry('debug', message, contextOrMeta, meta))
  }

  public info(message: string, contextOrMeta?: string | Record<string, any>, meta?: Record<string, any>) {
    this.dispatch(this.createEntry('info', message, contextOrMeta, meta))
  }

  public warn(message: string, contextOrMeta?: string | Record<string, any>, meta?: Record<string, any>) {
    this.dispatch(this.createEntry('warn', message, contextOrMeta, meta))
  }

  public error(
    message: string,
    contextOrMeta?: string | Record<string, any> | Error | unknown,
    meta?: Record<string, any>
  ) {
    this.dispatch(this.createEntry('error', message, contextOrMeta, meta))
  }
}

export const logger = new Logger()

export default logger
