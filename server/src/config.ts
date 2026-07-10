import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

// Production safety check: JWT secret must be configured
const jwtSecret = process.env.JWT_SECRET
const isProduction = process.env.NODE_ENV === 'production'

if (!jwtSecret) {
  if (isProduction) {
    console.error('[Config] FATAL: JWT_SECRET is not set in production environment')
    process.exit(1)
  }
  console.warn('[Config] WARNING: JWT_SECRET not set, using insecure dev default')
}

// Load private key from file
let privateKey = ''
const keyPath = process.env.WECHAT_PRIVATE_KEY_PATH
if (keyPath) {
  const fullPath = path.resolve(process.cwd(), keyPath)
  if (fs.existsSync(fullPath)) {
    privateKey = fs.readFileSync(fullPath, 'utf-8')
  }
}

export interface AIProvider {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}

function buildAIProviders(): AIProvider[] {
  const providers: AIProvider[] = []

  // MiMo 服务商 - 支持多个 Key
  const mimoBaseUrl = process.env.MIMO_API_BASE_URL || 'https://api.xiaomimimo.com/v1'
  const mimoModel = process.env.MIMO_MODEL || 'mimo-v2.5'

  const mimoKey1 = process.env.MIMO_API_KEY_1 || ''
  if (mimoKey1) {
    providers.push({ name: 'MiMo-1', apiKey: mimoKey1, baseUrl: mimoBaseUrl, model: mimoModel })
  }

  const mimoKey2 = process.env.MIMO_API_KEY_2 || ''
  if (mimoKey2) {
    providers.push({ name: 'MiMo-2', apiKey: mimoKey2, baseUrl: mimoBaseUrl, model: mimoModel })
  }

  // 兼容旧的单 Key 配置
  const mimoKeyLegacy = process.env.MIMO_API_KEY || ''
  if (mimoKeyLegacy && mimoKeyLegacy !== mimoKey1 && mimoKeyLegacy !== mimoKey2) {
    providers.push({ name: 'MiMo-legacy', apiKey: mimoKeyLegacy, baseUrl: mimoBaseUrl, model: mimoModel })
  }

  // DeepSeek 服务商 - 注意：当前 DeepSeek API 不支持多模态/图片识别，暂不启用
  // 如需启用：取消注释下方代码，但需确认 DeepSeek 已支持 vision 模型
  // const deepseekKey = process.env.DEEPSEEK_API_KEY || ''
  // if (deepseekKey) {
  //   providers.push({
  //     name: 'DeepSeek',
  //     apiKey: deepseekKey,
  //     baseUrl: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1',
  //     model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  //   })
  // }

  if (providers.length === 0) {
    console.warn('[Config] WARNING: No AI provider API keys configured')
  } else {
    console.log(`[Config] Loaded ${providers.length} AI provider(s): ${providers.map(p => p.name).join(', ')}`)
  }

  return providers
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: jwtSecret || 'dev-secret-insecure',
  domain: process.env.DOMAIN || 'localhost:3001',
  icpRecord: process.env.ICP_RECORD || '',
  mimo: {
    providers: buildAIProviders(),
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || '',
    certSerialNo: process.env.WECHAT_CERT_SERIAL_NO || '',
    privateKey,
  },
}
