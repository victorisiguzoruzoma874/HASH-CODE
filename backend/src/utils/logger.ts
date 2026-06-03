import winston from 'winston'

const { combine, timestamp, colorize, printf, json } = winston.format

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : ''
  return `${timestamp} [${level}] ${message}${metaStr}`
})

// Console-only logging — suitable for containerised deployments (Railway, Docker)
// File transports require a writable logs/ directory which isn't guaranteed in containers
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(timestamp(), colorize(), devFormat),
    }),
  ],
})
