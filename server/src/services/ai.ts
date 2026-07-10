import https from 'https'
import { config, AIProvider } from '../config'
import { logError } from '../utils/logger'
import { generateTextureCompositionPrompt } from '../data/textureCompositionDb'

interface MiMoResponse {
  choices: Array<{ message: { content: string } }>
}

// ==================== 轻量快速分析（免费阶段） ====================

const QUICK_SYSTEM_PROMPT = `你是肝胆排毒分析专家。对颜色、形态、尺寸三个维度做深度判定。返回严格JSON，不要额外字段：

{
  "color": {"name":"颜色名（必须从下方10种中精确选择）","hexColor":"#代码","formationTime":"形成时间推断","interpretation":"100-150字详细解读：包含颜色形成原因、对应的健康状态、可能的病症关联、以及后续建议"},
  "shape": {"type":"形态（必须从下方7种中精确选择）","description":"80-120字详细描述：包含形态特征、表面纹理、边缘轮廓、以及与其他形态的鉴别要点","significance":"健康意义与临床关联"},
  "size": {"category":"分类","estimatedRangeMm":"范围(mm)","referenceObject":"参照物"}
}

【颜色约束 - 只能从以下10种中精确选择一个】
- 鲜绿色=近期结晶(轻)：形成时间约1-3天，胆汁流动性好
- 翠绿色=典型结石(中)：形成约3-7天，胆管末端沉积
- 墨绿色=陈旧(中)：形成约1-2周，胆固醇与胆红素混合
- 深绿至黑绿色=多年(重)：形成时间可能数月
- 黄褐色=高胆固醇(中)：脂类代谢异常
- 米黄色/乳白色=纯胆固醇(中)：胆汁酸不足
- 棕褐色=色素性(重)：胆红素钙沉积
- 暗红色/红褐色=出血(重)：胆道黏膜损伤
- 白色/灰白色=钙化(重)：长期慢性炎症
- 黑色=胆红素钙(重)：胆汁淤积严重信号

CRITICAL: color.name 必须使用上述列表中的精确名称（如"翠绿色"而非"翠绿"），禁止使用"混合""黄绿混合"等自定义名称。
如果图片颜色介于两种之间，选择最接近的一种，在 interpretation 中详细说明颜色混合情况。

【形态约束 - 只能从以下7种中精确选择一个】
- 圆形=胆囊结石(中)：表面光滑、质地均匀
- 桑葚菜花=多结晶(中)：表面粗糙、多面体结构
- 米粒=早期(轻)：体积小、形态规整
- 管状=铸型(重)：胆管铸型、长度>宽度
- 树枝=广泛(重)：多分支、大面积分布
- 泥沙=早期(轻)：颗粒分散、大小不一
- 絮状=凝集(轻)：松软结构、易碎

CRITICAL: shape.type 必须使用上述列表中的精确名称，禁止使用"泥沙桑葚混合""混合形态"等自定义组合。
如果形态介于两种之间，选择主导形态，在 description 中详细说明混合情况。

【尺寸约束】
- category 从"小型""中型""大型""混合"中选择
- estimatedRangeMm 格式如"2-15mm"（数字+连字符+数字+mm）

规则：
- interpretation 必须 100-150 字，详细专业
- description 必须 80-120 字，包含鉴别要点
- 使用"排出物"一词，严禁使用"排泄物"
- 输出必须使用用户指定语言
- 英文回复保持同等详细程度
- 颜色名称和形态类型必须精确使用上面列表中的值
- CRITICAL: 禁止返回任何不在上述列表中的 color.name 或 shape.type`

// ==================== 深度分析（付费阶段） ====================

const DEEP_SYSTEM_PROMPT = `你是肝胆排毒分析专家，进行深度全面分析。
CRITICAL: 只输出纯JSON，不要用markdown代码块(\`\`\`)包裹，不要有任何解释性文字或前言后语，以{开头以}结束。

必须返回以下JSON格式，不添加额外字段：

{
  "color": {"name":"颜色名","hexColor":"#代码","formationTime":"时间","interpretation":"详细解读"},
  "shape": {"type":"形态","description":"描述","significance":"意义"},
  "size": {"category":"分类","estimatedRangeMm":"范围","referenceObject":"参照"},
  "texture": {"type":"质地","visualCues":"视觉线索"},
  "composition": {"type":"成分","confidence":"置信度","reasoning":"判定依据"},
  "pattern": {"type":"模式","description":"详细说明"},
  "quantity": {"estimatedCount":"数量","density":"密度","significance":"临床意义"},
  "comprehensiveAnalysis": "500字以上深度综合分析，涵盖肝胆功能评估、排毒进展、健康趋势、潜在风险。语言积极鼓励，避免引起恐慌",
  "diseaseRisk": {"highRisk":[],"mediumRisk":[],"lowRisk":[]},
  "dietAdvice": [{"category":"类别","items":["项目"],"reason":"原因"}],
  "dailyDietPlan": [{"day":1,"breakfast":"早餐","lunch":"午餐","dinner":"晚餐","snack":"加餐","note":"营养提示"}],
  "lifestyleAdvice": [{"category":"类别","advice":"建议","importance":"高/中/低"}],
  "warningSignals": [{"signal":"症状","indicates":"相关疾病","severity":"轻度/中度/重度","action":"建议措施"}],
  "nextStepAdvice": "详细的下一步行动建议",
  "medicalDisclaimer": "医疗免责声明"
}

颜色映射：鲜绿=近期结晶(轻),翠绿=典型结石(中),墨绿=陈旧(中),深绿黑绿=多年(重),黄褐=高胆固醇(中),米黄乳白=纯胆固醇(中),棕褐=色素性(重),暗红=出血(重),白灰白=钙化(重),黑色=胆红素钙(重)
形态：圆形=胆囊结石(中),桑葚菜花=多结晶(中),米粒=早期(轻),管状=铸型(重),树枝=广泛(重),泥沙=早期(轻),絮状=凝集(轻)

【图片质地识别详解指南】
分析图片中结石质地时，请逐一检查以下视觉特征：
1. 表面光泽度：高光泽→蜡质/油质/光滑；哑光/无光泽→粗糙/脆质/泥沙状
2. 表面纹理：有无颗粒？有无分层线？有无桑葚样多面体？
3. 透光性：半透明→凝胶状/蜡质/油质；不透明→块状/粗糙/颗粒状
4. 水分感：湿润反光→泥沙状/凝胶状；干燥→脆质/粗糙/颗粒状
5. 结构完整性：固定形状→光滑/块状/颗粒状/蜡质；松散→泥沙状/絮状/泥浆质
6. 颜色饱和度与质地质感对应：深色+哑光=粗糙/泥沙状；浅色+高光=蜡质/油质；不均匀色=层状/混合

${generateTextureCompositionPrompt()}

重要规则：
- texture.visualCues 必须列出3-5条从图片中观察到的具体视觉证据，不能泛泛而谈
- composition.reasoning 必须包含颜色依据、形态依据、表面特征依据三部分
- 颜色+形态+质地+成分 四者必须逻辑自洽，如：翠绿色+圆形+光滑+胆固醇性结石=自洽；黑色+蜡质+胆固醇性结石=矛盾
- 一律使用"排出物"一词描述分析对象，严禁出现"排泄物""粪便""大便"等字眼
- 英文回复不能有中文，不建议就医，建议益生菌/酵素/纤维
- 饮食建议以豆类豆制品（豆腐、豆浆、腐竹、纳豆）为核心蛋白质来源
- 不推荐蛋类、奶制品
- 多推荐植物蛋白：扁豆、鹰嘴豆、黑豆、绿豆、红豆、毛豆、天贝
- dailyDietPlan 返回完整7天饮食计划（day1-day7），每天详细列出早中晚三餐+加餐
- comprehensiveAnalysis 500字以上，深度专业，体现专业级分析水平
- 输出详尽完整，让用户感觉物超所值
- confidence 判定标准：颜色形态质地均明确+逻辑自洽=高；部分明确=中；仅推测=低`

// ==================== 通用调用函数 ====================

function callAIProvider(provider: AIProvider, payload: string, timeoutMs: number = 75000): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${provider.baseUrl}/chat/completions`)
    const maskedKey = provider.apiKey.slice(0, 5) + '...' + provider.apiKey.slice(-4)

    let finished = false
    const totalTimeout = setTimeout(() => {
      if (!finished) {
        finished = true
        req.destroy()
        logError('AIProvider', new Error(`${provider.name} ${maskedKey}: total timeout (${timeoutMs / 1000}s)`))
        reject(new Error('timeout'))
      }
    }, timeoutMs)

    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
      headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (finished) return
        finished = true
        clearTimeout(totalTimeout)
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
      if (finished) return
      finished = true
      clearTimeout(totalTimeout)
      logError('AIProvider', new Error(`${provider.name} ${maskedKey}: ${err.message}`))
      reject(new Error(`connection: ${err.message}`))
    })
    req.write(payload)
    req.end()
  })
}

function buildUserPrompt(
  userName: string, hasCap: boolean, gender: string, lang: string,
  extraContext?: string
) {
  const genderText = gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Unknown'
  const langText = lang === 'en' ? 'English' : lang === 'zhTW' ? '繁體中文' : '简体中文'
  let prompt = `Name: ${userName} | Gender: ${genderText} | Language: ${langText}
${hasCap ? 'Reference: bottle cap 30mm' : 'No reference object'}
${lang === 'en' ? 'ALL OUTPUT IN ENGLISH. NO CHINESE.' : ''}`

  if (extraContext) {
    prompt += `\n\n初步快速分析结果（供参考）：\n${extraContext}\n请在此基础上进行更深入详细的分析。`
  }
  prompt += '\nAnalyze discharge photo. Return ONLY the JSON structure above:'
  return prompt
}

function getFirstProvider(): AIProvider {
  const providers = config.mimo.providers
  if (providers.length === 0) throw new Error('AI 服务未配置 API Key')
  return providers[0]
}

function makeImageContent(images: { buffer: Buffer; mimeType: string }[]) {
  return images.map((img) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}` }
  }))
}

async function tryProviders(
  systemPrompt: string,
  userPrompt: string,
  imageContent: ReturnType<typeof makeImageContent>,
  maxTokens: number,
  timeoutMs: number,
  label: string
): Promise<string> {
  const providers = config.mimo.providers
  console.log(`[AI-${label}] Trying ${providers.length} provider(s): ${providers.map(p => p.name).join(', ')}`)
  const errors: string[] = []

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i]
    console.log(`[AI-${label}] Trying ${p.name} (${i + 1}/${providers.length})...`)

    const payload = JSON.stringify({
      model: p.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [{ type: 'text', text: userPrompt }, ...imageContent] },
      ],
      max_tokens: maxTokens,
    })

    try {
      const result = await callAIProvider(p, payload, timeoutMs)
      return result
    } catch (err: any) {
      errors.push(`${p.name}: ${err.message}`)
      console.log(`[AI-${label}] ✗ ${p.name} failed: ${err.message}`)
    }
  }

  console.error(`[AI-${label}] All providers failed:`, errors)
  throw new Error('AI 分析服务暂时不可用，请稍后重试')
}

// ==================== 公开API ====================

/**
 * 阶段1：免费快速分析
 * - 仅分析颜色、形态、尺寸三个维度
 * - max_tokens=100000, timeout=45s
 */
export async function quickAnalyze(
  images: { buffer: Buffer; mimeType: string }[],
  userName: string = 'User',
  hasCap: boolean = false,
  gender: string = 'Unknown',
  lang: string = 'zh'
): Promise<string> {
  const imageContent = makeImageContent(images)
  const userPrompt = buildUserPrompt(userName, hasCap, gender, lang, undefined)
  // 推理模型需要足够token给reasoning + output，100000保证内容完整
  return tryProviders(QUICK_SYSTEM_PROMPT, userPrompt, imageContent, 100000, 45000, 'QUICK')
}

/**
 * 阶段2：付费深度分析
 * - 全维度分析 + 7天饮食计划 + 风险评估
 * - max_tokens=100000, timeout=120s
 * - 可传入快速分析结果作为上下文
 */
export async function deepAnalyze(
  images: { buffer: Buffer; mimeType: string }[],
  userName: string = 'User',
  hasCap: boolean = false,
  gender: string = 'Unknown',
  lang: string = 'zh',
  quickAnalysisContext?: string
): Promise<string> {
  const imageContent = makeImageContent(images)
  const systemPrompt = DEEP_SYSTEM_PROMPT
  const userPrompt = buildUserPrompt(userName, hasCap, gender, lang, quickAnalysisContext)
  // 深度分析无token限制，让AI充分发挥
  return tryProviders(systemPrompt, userPrompt, imageContent, 100000, 120000, 'DEEP')
}

// ==================== 向后兼容 ====================

/**
 * @deprecated 使用 quickAnalyze + deepAnalyze 两阶段分析
 */
export async function analyzeImage(
  images: { buffer: Buffer; mimeType: string }[],
  userName: string = 'User',
  hasCap: boolean = false,
  gender: string = 'Unknown',
  lang: string = 'zh'
): Promise<string> {
  const imageContent = makeImageContent(images)
  const oldSystemPrompt = `你是肝胆排毒分析专家。所有输出必须严格使用用户指定的语言。必须返回以下JSON格式，不要添加额外字段：

{
  "color": {"name":"颜色名","hexColor":"#代码","formationTime":"时间","interpretation":"解读"},
  "shape": {"type":"形态","description":"描述","significance":"意义"},
  "size": {"category":"分类","estimatedRangeMm":"范围","referenceObject":"参照"},
  "texture": {"type":"质地","visualCues":"线索"},
  "composition": {"type":"成分","confidence":"置信度","reasoning":"依据"},
  "pattern": {"type":"模式","description":"说明"},
  "quantity": {"estimatedCount":"数量","density":"密度","significance":"意义"},
  "comprehensiveAnalysis": "200-300字综合分析，简洁精准",
  "diseaseRisk": {"highRisk":[],"mediumRisk":[],"lowRisk":[]},
  "dietAdvice": [{"category":"类别","items":["项目"],"reason":"原因"}],
  "dailyDietPlan": [{"day":1,"breakfast":"早餐","lunch":"午餐","dinner":"晚餐","snack":"加餐","note":"营养提示"}],
  "lifestyleAdvice": [{"category":"类别","advice":"建议","importance":"高/中/低"}],
  "warningSignals": [{"signal":"信号","indicates":"疾病","severity":"轻度/中度/重度","action":"建议"}],
  "nextStepAdvice": "下一步建议",
  "medicalDisclaimer": "免责声明"
}

颜色映射：鲜绿=近期结晶(轻),翠绿=典型结石(中),墨绿=陈旧(中),深绿黑绿=多年(重),黄褐=高胆固醇(中),棕褐=色素性(重),暗红=出血(重),白灰白=钙化(重),黑色=胆红素钙(重)
形态：圆形=胆囊结石(中),桑葚菜花=多结晶(中),米粒=早期(轻),管状=铸型(重),树枝=广泛(重),泥沙=早期(轻),絮状=凝集(轻)

重要规则：
- 饮食建议以豆类食品为核心蛋白质来源，不推荐蛋奶类
- dailyDietPlan返回7天饮食计划（day1-day7），简洁描述即可
- comprehensiveAnalysis控制在200-300字左右，简洁精准
- 整体响应务必紧凑`

  const systemPrompt = oldSystemPrompt
  const userPrompt = buildUserPrompt(userName, hasCap, gender, lang, undefined)
  return tryProviders(systemPrompt, userPrompt, imageContent, 100000, 75000, 'LEGACY')
}
