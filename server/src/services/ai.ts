import https from 'https'
import { config, AIProvider } from '../config'
import { logError } from '../utils/logger'

interface MiMoResponse {
  choices: Array<{ message: { content: string } }>
}

const SYSTEM_PROMPT_BASE = `你是肝胆排毒分析专家。所有输出必须严格使用用户指定的语言。必须返回以下JSON格式，不要添加额外字段：

{
  "color": {"name":"颜色名","hexColor":"#代码","formationTime":"时间","interpretation":"解读"},
  "shape": {"type":"形态","description":"描述","significance":"意义"},
  "size": {"category":"分类","estimatedRangeMm":"范围","referenceObject":"参照"},
  "texture": {"type":"质地","visualCues":"线索"},
  "composition": {"type":"成分","confidence":"置信度","reasoning":"依据"},
  "pattern": {"type":"模式","description":"说明"},
  "quantity": {"estimatedCount":"数量","density":"密度","significance":"意义"},
  "comprehensiveAnalysis": "500字以上综合分析，每句换行",
  "diseaseRisk": {"highRisk":[],"mediumRisk":[],"lowRisk":[]},
  "dietAdvice": [{"category":"类别","items":["项目"],"reason":"原因"}],
  "dailyDietPlan": [{"day":1,"breakfast":"早餐","lunch":"午餐","dinner":"晚餐","snack":"加餐","note":"营养提示"}],
  "lifestyleAdvice": [{"category":"类别","advice":"建议","importance":"高/中/低"}],
  "warningSignals": [{"signal":"信号","indicates":"疾病","severity":"轻度/中度/重度","action":"建议"}],
  "nextStepAdvice": "下一步建议",
  "medicalDisclaimer": "免责声明"
}

颜色映射：鲜绿=近期结晶(轻),翠绿=典型结石(中),墨绿=陈旧(中),深绿黑绿=多年(重),黄褐=高胆固醇(中),米黄乳白=纯胆固醇(中),棕褐=色素性(重),暗红=出血(重),白灰白=钙化(重),黑色=胆红素钙(重)
形态：圆形=胆囊结石(中),桑葚菜花=多结晶(中),米粒=早期(轻),管状=铸型(重),树枝=广泛(重),泥沙=早期(轻),絮状=凝集(轻)

重要规则：
- 英文回复不能有中文，不建议就医，建议益生菌/酵素/纤维
- 饮食建议以豆类、豆制品（豆腐、豆浆、腐竹、纳豆）为核心推荐蛋白质来源
- 不推荐蛋类、奶制品（牛奶、奶酪、酸奶、黄油），尽量排除此类食物
- 多推荐植物蛋白：扁豆、鹰嘴豆、黑豆、绿豆、红豆、毛豆、天贝
- dailyDietPlan必须包含30天完整饮食计划，每天细到早中晚三餐加加餐，以豆类和高纤维蔬菜为主`

const POSITIVE_TONE_PROMPT = `
额外要求（老用户多次检测）：
- 综合分析语气积极、鼓励，突出对比上次的改善和进步
- 即使指标未改善，也要用鼓舞性语言表达，强调排毒是一个渐进过程
- 多使用"已经取得进步""正在向好""坚持下去会更好"等正面表述
- 每天的具体计划要详细描述食材用量和做法`

function buildUserPrompt(userName: string, hasCap: boolean, gender: string, lang: string, isReturningUser: boolean) {
  const genderText = gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Unknown'
  const langText = lang === 'en' ? 'English' : lang === 'zhTW' ? '繁體中文' : '简体中文'
  const returningNote = isReturningUser
    ? 'This is a returning user with multiple tests. Be encouraging and positive, highlight progress.'
    : ''
  return `Name: ${userName} | Gender: ${genderText} | Language: ${langText}
${hasCap ? 'Reference: bottle cap 30mm' : 'No reference object'}
${returningNote}
${lang === 'en' ? 'ALL OUTPUT IN ENGLISH. NO CHINESE.' : ''}
Analyze discharge photo. Return ONLY the JSON structure above:`
}

function callAIProvider(provider: AIProvider, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${provider.baseUrl}/chat/completions`)
    const maskedKey = provider.apiKey.slice(0, 5) + '...' + provider.apiKey.slice(-4)
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
      headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 120000,
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          logError('AIProvider', new Error(`${provider.name} ${maskedKey}: HTTP ${res.statusCode}`))
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        try {
          const json: MiMoResponse = JSON.parse(data)
          const content = json.choices?.[0]?.message?.content || ''
          if (!content) {
            logError('AIProvider', new Error(`${provider.name} ${maskedKey}: empty response`))
            return reject(new Error('empty response'))
          }
          console.log(`[AI] ✓ ${provider.name} succeeded`)
          resolve(content)
        } catch {
          logError('AIProvider', new Error(`${provider.name} ${maskedKey}: parse error`))
          reject(new Error('parse error'))
        }
      })
    })
    req.on('error', (err) => {
      logError('AIProvider', new Error(`${provider.name} ${maskedKey}: ${err.message}`))
      reject(new Error(`connection: ${err.message}`))
    })
    req.on('timeout', () => {
      req.destroy()
      logError('AIProvider', new Error(`${provider.name} ${maskedKey}: timeout`))
      reject(new Error('timeout'))
    })
    req.write(payload)
    req.end()
  })
}

export async function analyzeImage(
  images: { buffer: Buffer; mimeType: string }[],
  userName: string = 'User',
  hasCap: boolean = false,
  gender: string = 'Unknown',
  lang: string = 'zh',
  isReturningUser: boolean = false
): Promise<string> {
  const imageContent = images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}` }
  }))

  const systemPrompt = isReturningUser
    ? SYSTEM_PROMPT_BASE + POSITIVE_TONE_PROMPT
    : SYSTEM_PROMPT_BASE

  const providers = config.mimo.providers
  if (providers.length === 0) {
    throw new Error('AI 服务未配置 API Key')
  }

  console.log(`[AI] Trying ${providers.length} provider(s): ${providers.map(p => p.name).join(', ')}`)
  const errors: string[] = []

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i]
    console.log(`[AI] Trying ${p.name} (${i + 1}/${providers.length})...`)

    // 为每个 provider 构建独立的 payload（模型名可能不同）
    const payload = JSON.stringify({
      model: p.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: buildUserPrompt(userName, hasCap, gender, lang, isReturningUser) },
          ...imageContent,
        ]},
      ],
      max_tokens: 16384,
    })

    try {
      const result = await callAIProvider(p, payload)
      return result
    } catch (err: any) {
      const errMsg = err.message || String(err)
      errors.push(`${p.name}: ${errMsg}`)
      console.log(`[AI] ✗ ${p.name} failed: ${errMsg}`)
    }
  }

  console.error(`[AI] All ${providers.length} provider(s) failed:`, errors)
  throw new Error('AI 分析服务暂时不可用，请稍后重试')
}
