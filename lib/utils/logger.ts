export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// Simple UUID generation without external dependencies
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export interface LogContext {
  requestId?: string
  userId?: string
  organisationId?: string
  userAgent?: string
  url?: string
  method?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    name?: string
    code?: string
  }
  metadata?: Record<string, any>
}

class Logger {
  private requestId: string

  constructor(requestId?: string) {
    this.requestId = requestId || generateRequestId()
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        requestId: this.requestId,
        ...context,
      },
      metadata,
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error as any).code && { code: (error as any).code },
      }
    }

    return entry
  }

  private log(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'production') {
      // In production, log as JSON for structured logging
      console.log(JSON.stringify(entry))
    } else {
      // In development, log in a more readable format
      const levelColors = {
        error: '\x1b[31m', // red
        warn: '\x1b[33m',  // yellow
        info: '\x1b[36m',  // cyan
        debug: '\x1b[90m', // gray
      }
      const reset = '\x1b[0m'
      const color = levelColors[entry.level] || ''

      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} [${entry.context?.requestId}] ${entry.message}`
      )

      if (entry.context && Object.keys(entry.context).length > 1) {
        console.log('Context:', entry.context)
      }

      if (entry.metadata) {
        console.log('Metadata:', entry.metadata)
      }

      if (entry.error) {
        console.log('Error Details:', entry.error)
      }
    }
  }

  public error(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(this.createLogEntry('error', message, error, context, metadata))
  }

  public warn(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(this.createLogEntry('warn', message, undefined, context, metadata))
  }

  public info(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(this.createLogEntry('info', message, undefined, context, metadata))
  }

  public debug(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(this.createLogEntry('debug', message, undefined, context, metadata))
  }
}

// Factory function to create logger instances
export function createLogger(requestId?: string): Logger {
  return new Logger(requestId)
}

// Default logger instance for convenience
export const logger = createLogger()

// Specific logger for book workflow operations
export function createBookWorkflowLogger(
  operation: string,
  context?: Partial<LogContext>
): Logger {
  const requestId = `bw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const logger = createLogger(requestId)

  // Log the operation start
  logger.info(`Book workflow operation started: ${operation}`, {
    operation,
    ...context,
  })

  return logger
}

// Helper function for database operation logging
export function logDatabaseOperation(
  operation: string,
  table: string,
  context?: LogContext,
  metadata?: Record<string, any>
): void {
  logger.info(`Database operation: ${operation}`, context, {
    table,
    ...metadata,
  })
}

// Helper function for error logging with automatic context detection
export function logError(
  message: string,
  error: Error,
  additionalContext?: Partial<LogContext>
): void {
  const context: LogContext = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...additionalContext,
  }

  logger.error(message, error, context)
}