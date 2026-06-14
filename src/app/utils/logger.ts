import chalk from "chalk"

const LOG_LEVEL_VALUES = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
} as const

type LogLevel = keyof typeof LOG_LEVEL_VALUES
type LogLevelValue = (typeof LOG_LEVEL_VALUES)[LogLevel]

const LOG_LEVEL_COLORS = {
  trace: "gray",
  debug: "cyan",
  info: "white",
  warn: "yellow",
  error: "red",
} as const

declare global {
  /**
   * Default log level is "debug"
   */
  // eslint-disable-next-line no-var -- global augmentation requires var
  var logLevel: LogLevelValue | undefined
  // eslint-disable-next-line no-var -- global augmentation requires var
  var originalConsole: Console
}

export function setLogLevel(level: string | undefined) {
  const normalizedLevel = level?.toLowerCase()

  globalThis.originalConsole.log(
    colorize("warn", `[setLogLevel] Setting log level to "${normalizedLevel}"`)
  )

  if (!normalizedLevel || !(normalizedLevel in LOG_LEVEL_VALUES)) {
    // Use default
    globalThis.logLevel = undefined
    return
  }

  globalThis.logLevel = LOG_LEVEL_VALUES[normalizedLevel as LogLevel]
}

function colorize(level: LogLevel, ...messages: unknown[]) {
  const color = LOG_LEVEL_COLORS[level]

  return chalk[color](...messages)
}

export const memoryLogs: string[] = []

function log(level: LogLevel, ...messages: unknown[]) {
  const currentLogLevel = globalThis.logLevel ?? LOG_LEVEL_VALUES.debug
  const date = new Date().toLocaleTimeString(undefined, { hour12: false })

  if (LOG_LEVEL_VALUES[level] >= currentLogLevel) {
    memoryLogs.push(`[${date}][${level}] ${messages.join(' ')}`)
    globalThis.originalConsole[level](colorize(level, `[${date}][${level}]`, ...messages))
  }
}

if (typeof globalThis.originalConsole === "undefined") {
  globalThis.originalConsole = console
}

export const logger = {
  log(...messages: unknown[]) {
    log("info", ...messages)
  },
  trace(...messages: unknown[]) {
    log("trace", ...messages)
  },
  debug(...messages: unknown[]) {
    log("debug", ...messages)
  },
  info(...messages: unknown[]) {
    log("info", ...messages)
  },
  warn(...messages: unknown[]) {
    log("warn", ...messages)
  },
  error(...messages: unknown[]) {
    log("error", ...messages)
  },
}

// Override console
globalThis.console = {
  ...console,
  ...logger,
}
