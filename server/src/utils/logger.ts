/**
 * 安全日志工具
 * 不在日志中暴露数据库结构、API密钥、堆栈跟踪等内部信息
 */

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]+/g,           // API keys (sk-xxx)
  /AKID[a-zA-Z0-9]+/g,           // Tencent SecretId
  /(?:password|passwd|pwd)[=:]\s*\S+/gi,
  /(?:secret|token|key)=[^\s,;]+/gi,
  /Bearer\s+\S+/gi,
  /file:\/\/\S+/g,               // 文件路径
  /\/home\/\S+/g,                 // 服务器路径
  /\/var\/www\/\S+/g,             // 服务器路径
  /at\s+\S+:\d+:\d+/g,           // 堆栈跟踪行
]

// 错误分类标签
export enum ErrorCategory {
  AI_SERVICE = 'AI_SERVICE',           // AI 服务调用失败
  PARSE = 'PARSE',                     // JSON 解析失败
  VALIDATION = 'VALIDATION',           // 数据校验失败
  DATABASE = 'DATABASE',              // 数据库操作失败
  NETWORK = 'NETWORK',                 // 网络请求失败
  AUTH = 'AUTH',                       // 认证失败
  UNKNOWN = 'UNKNOWN',                 // 未知错误
}

function sanitizeMessage(msg: string): string {
  let sanitized = msg
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '***REDACTED***')
  }
  return sanitized
}

export function categorizeError(err: unknown): ErrorCategory {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()

  if (msg.includes('prisma') || msg.includes('sqlite') || msg.includes('database')) return ErrorCategory.DATABASE
  if (msg.includes('timeout') || msg.includes('超时') || msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('dns') || msg.includes('econnreset')) return ErrorCategory.NETWORK
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('jwt') || msg.includes('token')) return ErrorCategory.AUTH
  if (msg.includes('parse') || msg.includes('json') || msg.includes('syntax')) return ErrorCategory.PARSE
  if (msg.includes('validation') || msg.includes('schema') || msg.includes('integrity')) return ErrorCategory.VALIDATION
  if (msg.includes('mimo') || msg.includes('openai') || msg.includes('api key') || msg.includes('ai 服务') || msg.includes('分析')) return ErrorCategory.AI_SERVICE

  return ErrorCategory.UNKNOWN
}

/**
 * 安全地记录错误，只记录类别和脱敏后的消息
 */
export function logError(context: string, err: unknown): void {
  const category = categorizeError(err)
  const rawMsg = err instanceof Error ? err.message : String(err)
  const sanitized = sanitizeMessage(rawMsg)
  console.error(`[${category}][${context}] ${sanitized}`)
}

/**
 * 安全地记录警告
 */
export function logWarn(context: string, msg: string): void {
  console.warn(`[WARN][${context}] ${sanitizeMessage(msg)}`)
}

/**
 * 获取用户友好错误消息
 */
export function getUserFriendlyMessage(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.AI_SERVICE:
      return '图片分析服务暂时不可用，请稍后重试'
    case ErrorCategory.PARSE:
      return '分析结果解析失败，请尝试重新上传图片'
    case ErrorCategory.VALIDATION:
      return '分析数据校验未通过，请重新上传清晰的图片'
    case ErrorCategory.DATABASE:
      return '数据存储异常，请稍后重试'
    case ErrorCategory.NETWORK:
      return '网络连接异常，请检查网络后重试'
    case ErrorCategory.AUTH:
      return '登录已过期，请重新登录'
    default:
      return '服务异常，请稍后重试'
  }
}
