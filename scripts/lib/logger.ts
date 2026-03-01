// ── Logger utility for chart fetching scripts ────────────────────────
// Provides structured, timestamped logging with level support.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  info: '[INFO] ',
  warn: '[WARN] ',
  error: '[ERROR]',
};

const minLevel: LogLevel =
  (process.env['LOG_LEVEL'] as LogLevel | undefined) ?? 'info';

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function formatMessage(level: LogLevel, message: string, context?: string): string {
  const ctx = context ? ` [${context}]` : '';
  return `${timestamp()} ${LEVEL_PREFIX[level]}${ctx} ${message}`;
}

export const logger = {
  debug(message: string, context?: string): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: string): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: string): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, context?: string): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, context));
    }
  },

  /** Log a section divider for visual clarity. */
  section(title: string): void {
    if (shouldLog('info')) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  ${title}`);
      console.log(`${'='.repeat(60)}`);
    }
  },

  /** Log progress like "  [3/50] Artist - Track" */
  progress(current: number, total: number, message: string, context?: string): void {
    if (shouldLog('info')) {
      const padded = String(current).padStart(String(total).length, ' ');
      const ctx = context ? ` [${context}]` : '';
      console.log(`${timestamp()} [INFO]${ctx}   [${padded}/${total}] ${message}`);
    }
  },
};
