/**
 * 数据规范化引擎 (Canonicalization Engine)
 *
 * 核心问题：AI推理模型非确定性，同一图片多次调用返回不同结果
 * 解决方案：将AI自由文本输出映射到预定义的规范值，确保一致性
 *
 * 三阶段处理：
 * 1. 关键词提取 + 加权评分 → 确定主候选
 * 2. 规范值映射 + 枚举约束 → 强制对齐到数据库
 * 3. 知识库反查 → 补充完整性（HEX、严重度等）
 */

import { COLOR_CATALOG, findClosestColor, type ColorEntry } from '../knowledge/colorCatalog'
import type { TextureEntry, CompositionEntry } from './textureCompositionDb'
import { TEXTURE_ALIAS_MAP, COMPOSITION_ALIAS_MAP } from './textureCompositionDb'

// ==================== Pre-compiled patterns & lookup maps ====================

/** Pre-compiled regex for size range extraction (e.g., "2-15mm", "1mm - 15mm") */
const SIZE_RANGE_RE = /(\d+(?:\.\d+)?)(?:\s*mm?(?:\s+)?)?\s*(?:-|~|至|到|to)\s*(\d+(?:\.\d+)?)/i

/** Pre-compiled regex for hex color validation */
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/
const HEX_PREFIX_RE = /^#[0-9A-Fa-f]+$/

/** Pre-built exact-match lookup maps for O(1) canonicalization */
const COLOR_EXACT_MAP = new Map(COLOR_CATALOG.map(c => [c.name, c]))

// ==================== 颜色规范化 ====================

/** 规范颜色名称及其关键词触发器（权重越高越优先匹配） */
const COLOR_CANONICAL_MAP: { name: string; keywords: { word: string; weight: number }[] }[] = [
  {
    name: '鲜绿色',
    keywords: [
      { word: '鲜绿', weight: 10 }, { word: '亮绿', weight: 9 },
      { word: '浅绿', weight: 6 }, { word: '嫩绿', weight: 5 },
      { word: 'bright green', weight: 10 },
    ],
  },
  {
    name: '翠绿色',
    keywords: [
      { word: '翠绿', weight: 12 }, { word: '翠绿色', weight: 12 },
      { word: 'emerald', weight: 10 }, { word: 'green', weight: 2 },
      { word: '绿', weight: 2 }, // 翠绿是最常见类型，绿字权重略高
    ],
  },
  {
    name: '墨绿色',
    keywords: [
      { word: '墨绿', weight: 10 }, { word: '深绿', weight: 9 },
      { word: '暗绿', weight: 8 }, { word: 'dark green', weight: 10 },
      { word: '黑绿', weight: 8 },
    ],
  },
  {
    name: '深绿至黑绿色',
    keywords: [
      { word: '黑绿', weight: 10 }, { word: '深黑绿', weight: 10 },
      { word: '近黑', weight: 7 }, { word: 'deep green', weight: 9 },
    ],
  },
  {
    name: '黄褐色',
    keywords: [
      { word: '黄褐', weight: 10 }, { word: '黄棕色', weight: 9 },
      { word: '棕黄', weight: 8 }, { word: 'yellow-brown', weight: 10 },
      { word: 'brown', weight: 5 }, { word: '黄', weight: 1 },
      { word: '褐', weight: 1 },
    ],
  },
  {
    name: '米黄色/乳白色',
    keywords: [
      { word: '米黄', weight: 10 }, { word: '乳白', weight: 10 },
      { word: '米白', weight: 9 }, { word: '奶油色', weight: 8 },
      { word: '浅黄', weight: 6 }, { word: 'beige', weight: 10 },
      { word: 'creamy', weight: 10 },
    ],
  },
  {
    name: '棕褐色',
    keywords: [
      { word: '棕褐', weight: 10 }, { word: '深棕', weight: 9 },
      { word: '咖啡色', weight: 8 }, { word: 'dark brown', weight: 10 },
      { word: '深褐', weight: 9 },
    ],
  },
  {
    name: '暗红色/红褐色',
    keywords: [
      { word: '暗红', weight: 10 }, { word: '红褐', weight: 10 },
      { word: '血红', weight: 9 }, { word: '深红', weight: 8 },
      { word: 'dark red', weight: 10 }, { word: 'red-brown', weight: 10 },
    ],
  },
  {
    name: '白色/灰白色',
    keywords: [
      { word: '灰白', weight: 10 }, { word: '白垩', weight: 9 },
      { word: '浅灰', weight: 7 }, { word: 'white', weight: 10 },
      { word: 'grayish', weight: 8 }, { word: '灰', weight: 2 },
      { word: '白', weight: 2 },
    ],
  },
  {
    name: '黑色',
    keywords: [
      { word: '黑色', weight: 10 }, { word: '纯黑', weight: 10 },
      { word: '深黑', weight: 9 }, { word: 'black', weight: 10 },
    ],
  },
]

export interface CanonicalizedColor {
  /** 是否成功规范化 */
  valid: boolean
  /** 原始AI返回的颜色名称 */
  rawName: string
  /** 规范化的颜色名称（来自 COLOR_CATALOG） */
  canonicalName: string
  /** 知识库颜色条目 */
  catalogEntry: ColorEntry | null
  /** 规范HEX色值（从知识库取得，不信任AI） */
  canonicalHex: string
  /** 规范严重度 */
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Unknown'
  /** 匹配日志 */
  debugInfo: string
}

/**
 * 将AI返回的任意颜色名称规范化为知识库中的标准名称
 */
export function canonicalizeColor(rawName: string, rawHex?: string): CanonicalizedColor {
  const cleanName = rawName.trim()

  // Step 1: O(1) exact match via pre-built lookup map
  const exactEntry = COLOR_EXACT_MAP.get(cleanName)
  if (exactEntry) {
    return {
      valid: true, rawName: cleanName, canonicalName: exactEntry.name,
      catalogEntry: exactEntry, canonicalHex: exactEntry.hexColor,
      severity: exactEntry.severity, debugInfo: '精确匹配',
    }
  }

  // Step 2: 关键词加权评分系统
  const lower = cleanName.toLowerCase()
  const scores: { name: string; score: number; priority: number }[] = []

  for (let i = 0; i < COLOR_CANONICAL_MAP.length; i++) {
    const canon = COLOR_CANONICAL_MAP[i]
    let score = 0
    for (const kw of canon.keywords) {
      if (lower.includes(kw.word.toLowerCase())) {
        score += kw.weight
      }
    }
    if (score > 0) scores.push({ name: canon.name, score, priority: COLOR_CANONICAL_MAP.length - i })
  }

  // Step 3: 选择得分最高的规范颜色（同分按优先级）
  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score || b.priority - a.priority)
    const best = scores[0]
    const entry = COLOR_CATALOG.find(c => c.name === best.name) || null

    return {
      valid: true, rawName: cleanName, canonicalName: best.name,
      catalogEntry: entry, canonicalHex: entry?.hexColor || '#999999',
      severity: entry?.severity || 'Unknown',
      debugInfo: `关键词匹配: ${best.name}(得分${best.score}), 候选: ${scores.slice(0, 3).map(s => `${s.name}(${s.score})`).join(', ')}`,
    }
  }

  // Step 4: 退化为HEX距离匹配
  if (rawHex && rawHex.startsWith('#')) {
    const closest = findClosestColor(rawHex)
    if (closest) {
      return {
        valid: true, rawName: cleanName, canonicalName: closest.name,
        catalogEntry: closest, canonicalHex: closest.hexColor,
        severity: closest.severity,
        debugInfo: `HEX距离匹配: ${rawHex} → ${closest.name}(${closest.hexColor})`,
      }
    }
  }

  // Step 5: 完全无法匹配
  return {
    valid: false, rawName: cleanName, canonicalName: '未知',
    catalogEntry: null, canonicalHex: '#999999',
    severity: 'Unknown',
    debugInfo: `无法匹配: "${cleanName}" 不在知识库中`,
  }
}

// ==================== 形态规范化 ====================

/** 规范形态名称关键词映射 */
const SHAPE_CANONICAL_MAP: { name: string; keywords: string[] }[] = [
  { name: '圆形', keywords: ['圆形', '球形', '球状', 'round', 'spherical'] },
  { name: '桑葚菜花', keywords: ['桑葚', '菜花', '桑葚菜花', '桑葚样', '菜花样', 'cauliflower', 'mulberry', '桑椹', '桑葚状'] },
  { name: '米粒', keywords: ['米粒', '粒状', '颗粒', '米粒状', '细粒', 'granular'] },
  { name: '管状', keywords: ['管状', '条状', '管形', '管样', 'tubular', 'tube', '柱状'] },
  { name: '树枝', keywords: ['树枝', '枝状', '树杈', 'branch', '树枝样'] },
  { name: '泥沙', keywords: ['泥沙', '泥沙状', '泥沙样', '沙样', 'sludge', 'sand-like'] },
  { name: '絮状', keywords: ['絮状', '絮样', '棉絮', '絮凝', 'flocculent', 'flaky'] },
]

export interface CanonicalizedShape {
  valid: boolean
  rawType: string
  canonicalType: string
  debugInfo: string
}

/**
 * 将AI返回的任意形态名称规范化为标准形态
 * 支持混合形态（如"泥沙桑葚混合"）→ 自动拆分为独立关键词并选主导
 */
export function canonicalizeShape(rawType: string): CanonicalizedShape {
  const clean = rawType.trim()

  // 尝试精确匹配
  for (const entry of SHAPE_CANONICAL_MAP) {
    if (entry.name === clean) {
      return { valid: true, rawType: clean, canonicalType: entry.name, debugInfo: '精确匹配' }
    }
  }

  // 关键词加权评分
  const lower = clean.toLowerCase()
  const scores: { name: string; score: number; priority: number }[] = []

  for (let i = 0; i < SHAPE_CANONICAL_MAP.length; i++) {
    const entry = SHAPE_CANONICAL_MAP[i]
    let score = 0
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // 完整词匹配权重更高
        score += kw.length >= 3 ? 3 : 2
      }
    }
    if (score > 0) scores.push({ name: entry.name, score, priority: SHAPE_CANONICAL_MAP.length - i })
  }

  if (scores.length > 0) {
    // 先按分数排序，同分按优先级（在数组中越靠前越高）
    scores.sort((a, b) => b.score - a.score || b.priority - a.priority)
    const best = scores[0]
    return {
      valid: true, rawType: clean, canonicalType: best.name,
      debugInfo: `关键词匹配: ${best.name}(得分${best.score}), 候选: ${scores.slice(0, 3).map(s => `${s.name}(${s.score})`).join(', ')}`,
    }
  }

  // 无法匹配
  return {
    valid: false, rawType: clean, canonicalType: '未知',
    debugInfo: `无法匹配: "${clean}" 不在形态库中`,
  }
}

// ==================== 尺寸规范化 ====================

/** 规范尺寸分类 */
const SIZE_CATEGORIES = ['小型', '中型', '大型', '混合']

export interface CanonicalizedSize {
  valid: boolean
  rawCategory: string
  canonicalCategory: string
  rawRange: string
  extractedRangeMm: string | null
  minMm: number | null
  maxMm: number | null
  debugInfo: string
}

/**
 * 规范尺寸分类并提取数值范围
 */
export function canonicalizeSize(rawCategory: string, rawRange: string): CanonicalizedSize {
  const clean = rawCategory.trim()

  // 关键词匹配尺寸分类（带优先级）
  const lower = clean.toLowerCase()
  const categoryKeywords: { name: string; keywords: string[] }[] = [
    { name: '中型', keywords: ['中等', '中型', '中', 'medium', 'moderate'] },
    { name: '小型', keywords: ['小型', '微小', '细小', '小', 'small', 'tiny', '微型'] },
    { name: '大型', keywords: ['大型', '较大', '大', 'large', 'big', 'bigger'] },
    { name: '混合', keywords: ['混合', '不同', 'mixed', 'vary', '不等', '多样', '混合大小'] },
  ]

  let bestCat = '混合'
  let bestScore = 0
  let bestPriority = 0

  for (let i = 0; i < categoryKeywords.length; i++) {
    const { name, keywords } = categoryKeywords[i]
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.length >= 3 ? 3 : 2
    }
    const priority = categoryKeywords.length - i
    if (score > bestScore || (score === bestScore && priority > bestPriority)) {
      bestScore = score
      bestPriority = priority
      bestCat = name
    }
  }

  const canonicalCategory = bestCat

  // Extract numeric range (supports "2-15mm" "1mm - 15mm" "1-10mm" "2-12" etc.)
  const rangeMatch = rawRange.match(SIZE_RANGE_RE)
  let minMm: number | null = null
  let maxMm: number | null = null
  let extractedRangeMm: string | null = null

  if (rangeMatch) {
    minMm = parseFloat(rangeMatch[1])
    maxMm = parseFloat(rangeMatch[2])
    extractedRangeMm = `${minMm}-${maxMm}mm`
  }

  return {
    valid: true,
    rawCategory: clean,
    canonicalCategory,
    rawRange,
    extractedRangeMm,
    minMm,
    maxMm,
    debugInfo: rangeMatch
      ? `数值提取: ${extractedRangeMm}; 分类: ${canonicalCategory}`
      : `无法提取数值; 分类: ${canonicalCategory}`,
  }
}

// ==================== HEX色值规范性检查 ====================

/**
 * 校验HEX色值格式并确保与规范颜色一致
 * 算法：如果已确定规范颜色，直接使用知识库HEX（不信任AI的HEX）
 */
export function sanitizeHexColor(hexInput: string, canonicalColor?: ColorEntry | null): string {
  // 如果有规范颜色条目，直接使用其HEX
  if (canonicalColor) return canonicalColor.hexColor

  // 否则校验格式
  const clean = hexInput.trim()
  if (HEX_COLOR_RE.test(clean)) return clean.toUpperCase()

  // 尝试修复常见问题
  if (clean.length === 7 && clean.startsWith('#') && HEX_PREFIX_RE.test(clean)) {
    return clean.padEnd(7, '0').toUpperCase()
  }

  return '#999999' // 兜底灰色
}

// ==================== 质地规范化 ====================

/** 规范质地名称关键词映射（15种） */
const TEXTURE_CANONICAL_MAP: { name: string; keywords: { word: string; weight: number }[] }[] = [
  {
    name: '光滑',
    keywords: [
      { word: '光滑', weight: 10 }, { word: '平滑', weight: 9 },
      { word: '卵石样', weight: 8 }, { word: '抛光', weight: 7 },
      { word: 'smooth', weight: 10 },
    ],
  },
  {
    name: '粗糙',
    keywords: [
      { word: '粗糙', weight: 10 }, { word: '凹凸', weight: 9 },
      { word: '不光滑', weight: 7 }, { word: '砂纸', weight: 6 },
      { word: 'rough', weight: 10 },
    ],
  },
  {
    name: '桑葚样',
    keywords: [
      { word: '桑葚', weight: 10 }, { word: '桑椹', weight: 10 },
      { word: '菜花', weight: 8 }, { word: '黑莓', weight: 7 },
      { word: '簇状', weight: 6 }, { word: 'mulberry', weight: 10 },
      { word: 'cauliflower', weight: 8 },
    ],
  },
  {
    name: '蜡质',
    keywords: [
      { word: '蜡质', weight: 10 }, { word: '蜡样', weight: 9 },
      { word: '蜡状', weight: 8 }, { word: 'waxy', weight: 10 },
      { word: '软', weight: 3 }, { word: '划痕', weight: 5 },
    ],
  },
  {
    name: '泥沙状',
    keywords: [
      { word: '泥沙', weight: 10 }, { word: '沙状', weight: 8 },
      { word: '淤泥', weight: 6 }, { word: 'sludge', weight: 10 },
      { word: 'sand', weight: 8 }, { word: '松散', weight: 5 },
    ],
  },
  {
    name: '絮状',
    keywords: [
      { word: '絮状', weight: 10 }, { word: '棉絮', weight: 9 },
      { word: '絮凝', weight: 8 }, { word: '纤维状', weight: 6 },
      { word: 'flocculent', weight: 10 }, { word: 'cotton', weight: 7 },
      { word: '漂浮', weight: 4 },
    ],
  },
  {
    name: '层状',
    keywords: [
      { word: '层状', weight: 10 }, { word: '分层', weight: 9 },
      { word: '年轮', weight: 8 }, { word: '同心圆', weight: 7 },
      { word: 'laminate', weight: 10 }, { word: 'layer', weight: 9 },
      { word: '层叠', weight: 8 },
    ],
  },
  {
    name: '片状',
    keywords: [
      { word: '片状', weight: 10 }, { word: '薄片', weight: 9 },
      { word: '剥落', weight: 6 }, { word: 'flaky', weight: 10 },
      { word: 'flake', weight: 9 },
    ],
  },
  {
    name: '块状',
    keywords: [
      { word: '块状', weight: 10 }, { word: '大块', weight: 9 },
      { word: '致密', weight: 6 }, { word: 'massive', weight: 10 },
      { word: '硬块', weight: 7 },
    ],
  },
  {
    name: '颗粒状',
    keywords: [
      { word: '颗粒状', weight: 10 }, { word: '颗粒', weight: 8 },
      { word: '粒状', weight: 7 }, { word: 'granular', weight: 10 },
      { word: '均匀小粒', weight: 6 },
    ],
  },
  {
    name: '凝胶状',
    keywords: [
      { word: '凝胶', weight: 10 }, { word: '果冻', weight: 9 },
      { word: '胶状', weight: 8 }, { word: '半透明', weight: 5 },
      { word: 'gelatinous', weight: 10 }, { word: 'gel', weight: 9 },
      { word: 'jelly', weight: 8 },
    ],
  },
  {
    name: '脆质',
    keywords: [
      { word: '脆', weight: 10 }, { word: '易碎', weight: 9 },
      { word: '酥脆', weight: 7 }, { word: 'brittle', weight: 10 },
      { word: '碎裂', weight: 6 },
    ],
  },
  {
    name: '油质',
    keywords: [
      { word: '油质', weight: 10 }, { word: '油腻', weight: 9 },
      { word: '油脂', weight: 8 }, { word: '滑腻', weight: 7 },
      { word: 'oily', weight: 10 }, { word: 'greasy', weight: 10 },
    ],
  },
  {
    name: '海绵质',
    keywords: [
      { word: '海绵', weight: 10 }, { word: '多孔', weight: 9 },
      { word: '松软', weight: 6 }, { word: 'spongy', weight: 10 },
      { word: 'porous', weight: 9 }, { word: '漂浮', weight: 5 },
    ],
  },
  {
    name: '泥浆质',
    keywords: [
      { word: '泥浆', weight: 10 }, { word: '糊状', weight: 9 },
      { word: '膏状', weight: 7 }, { word: '牙膏', weight: 6 },
      { word: 'pasty', weight: 10 }, { word: 'mud', weight: 9 },
      { word: 'paste', weight: 8 },
    ],
  },
]

export interface CanonicalizedTexture {
  valid: boolean
  rawType: string
  canonicalType: string
  debugInfo: string
}

/**
 * 将AI返回的任意质地名称规范化为标准质地类型
 */
export function canonicalizeTexture(rawType: string): CanonicalizedTexture {
  const clean = rawType.trim()

  // 尝试从别名映射直接转换
  const aliasKey = clean.toLowerCase()
  if (TEXTURE_ALIAS_MAP[aliasKey]) {
    const mapped = TEXTURE_ALIAS_MAP[aliasKey]
    return { valid: true, rawType: clean, canonicalType: mapped, debugInfo: `别名映射: ${clean} → ${mapped}` }
  }

  // 尝试精确匹配规范名称
  for (const entry of TEXTURE_CANONICAL_MAP) {
    if (entry.name === clean) {
      return { valid: true, rawType: clean, canonicalType: entry.name, debugInfo: '精确匹配' }
    }
  }

  // 关键词加权评分
  const lower = clean.toLowerCase()
  const scores: { name: string; score: number; priority: number }[] = []

  for (let i = 0; i < TEXTURE_CANONICAL_MAP.length; i++) {
    const entry = TEXTURE_CANONICAL_MAP[i]
    let score = 0
    for (const kw of entry.keywords) {
      if (lower.includes(kw.word.toLowerCase())) {
        score += kw.weight
      }
    }
    if (score > 0) scores.push({ name: entry.name, score, priority: TEXTURE_CANONICAL_MAP.length - i })
  }

  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score || b.priority - a.priority)
    const best = scores[0]
    return {
      valid: true, rawType: clean, canonicalType: best.name,
      debugInfo: `关键词匹配: ${best.name}(得分${best.score}), 候选: ${scores.slice(0, 3).map(s => `${s.name}(${s.score})`).join(', ')}`,
    }
  }

  return {
    valid: false, rawType: clean, canonicalType: '未知',
    debugInfo: `无法匹配: "${clean}" 不在质地库中`,
  }
}

// ==================== 成分规范化 ====================

/** 规范成分名称关键词映射（12种） */
const COMPOSITION_CANONICAL_MAP: { name: string; keywords: { word: string; weight: number }[] }[] = [
  {
    name: '胆固醇性结石',
    keywords: [
      { word: '胆固醇', weight: 10 }, { word: 'cholesterol', weight: 10 },
      { word: '胆固醇结石', weight: 11 }, { word: '胆固醇结晶', weight: 8 },
      { word: '黄绿', weight: 4 },
    ],
  },
  {
    name: '胆红素钙结石',
    keywords: [
      { word: '胆红素钙', weight: 10 }, { word: '胆红素', weight: 8 },
      { word: 'bilirubinate', weight: 10 }, { word: 'brown pigment', weight: 10 },
      { word: '棕色色素', weight: 8 }, { word: '棕褐', weight: 4 },
      { word: '感染', weight: 3 },
    ],
  },
  {
    name: '黑色素结石',
    keywords: [
      { word: '黑色素', weight: 10 }, { word: 'black pigment', weight: 10 },
      { word: '纯黑', weight: 7 }, { word: '金属光泽', weight: 5 },
      { word: '溶血', weight: 5 },
    ],
  },
  {
    name: '混合性结石',
    keywords: [
      { word: '混合性', weight: 10 }, { word: '混合型', weight: 10 },
      { word: 'mixed', weight: 10 }, { word: 'mixed stone', weight: 11 },
      { word: '混杂', weight: 7 }, { word: '多层', weight: 5 },
      { word: '年轮', weight: 4 },
    ],
  },
  {
    name: '胆色素沉积',
    keywords: [
      { word: '胆色素', weight: 10 }, { word: '色素沉积', weight: 9 },
      { word: '色素', weight: 6 }, { word: 'pigment deposit', weight: 10 },
      { word: '沉积', weight: 4 },
    ],
  },
  {
    name: '脂肪酸钙结石',
    keywords: [
      { word: '脂肪酸钙', weight: 10 }, { word: '脂肪酸', weight: 8 },
      { word: '钙皂', weight: 9 }, { word: 'fatty acid', weight: 10 },
      { word: 'calcium fatty', weight: 10 }, { word: '奶油', weight: 5 },
    ],
  },
  {
    name: '磷酸钙结石',
    keywords: [
      { word: '磷酸钙', weight: 10 }, { word: 'phosphate', weight: 10 },
      { word: '灰白', weight: 4 },
    ],
  },
  {
    name: '碳酸钙结石',
    keywords: [
      { word: '碳酸钙', weight: 10 }, { word: 'carbonate', weight: 10 },
      { word: '白垩', weight: 8 }, { word: '粉笔', weight: 5 },
      { word: '石灰', weight: 5 },
    ],
  },
  {
    name: '蛋白质基质沉积',
    keywords: [
      { word: '蛋白质基质', weight: 10 }, { word: '蛋白基质', weight: 9 },
      { word: 'protein matrix', weight: 10 }, { word: 'mucin', weight: 9 },
      { word: '黏蛋白', weight: 9 }, { word: '粘蛋白', weight: 9 },
      { word: '骨架', weight: 4 },
    ],
  },
  {
    name: '粘液栓',
    keywords: [
      { word: '粘液栓', weight: 10 }, { word: '黏液栓', weight: 10 },
      { word: '粘液', weight: 7 }, { word: 'mucus plug', weight: 10 },
      { word: 'mucus', weight: 8 }, { word: '透明胶', weight: 5 },
    ],
  },
  {
    name: '草酸钙结石',
    keywords: [
      { word: '草酸钙', weight: 10 }, { word: 'oxalate', weight: 10 },
      { word: '刺状', weight: 6 }, { word: '针状', weight: 5 },
      { word: '菠菜', weight: 3 },
    ],
  },
  {
    name: '胆汁淤渣',
    keywords: [
      { word: '胆汁淤渣', weight: 10 }, { word: '胆泥', weight: 9 },
      { word: 'biliary sludge', weight: 10 }, { word: 'bile sludge', weight: 10 },
      { word: '淤渣', weight: 8 }, { word: 'sludge', weight: 8 },
      { word: '糊状', weight: 4 }, { word: '牙膏', weight: 3 },
    ],
  },
]

export interface CanonicalizedComposition {
  valid: boolean
  rawType: string
  canonicalType: string
  debugInfo: string
}

/**
 * 将AI返回的任意成分名称规范化为标准成分类型
 */
export function canonicalizeComposition(rawType: string): CanonicalizedComposition {
  const clean = rawType.trim()

  // 尝试从别名映射直接转换
  const aliasKey = clean.toLowerCase()
  if (COMPOSITION_ALIAS_MAP[aliasKey]) {
    const mapped = COMPOSITION_ALIAS_MAP[aliasKey]
    return { valid: true, rawType: clean, canonicalType: mapped, debugInfo: `别名映射: ${clean} → ${mapped}` }
  }

  // 尝试精确匹配规范名称
  for (const entry of COMPOSITION_CANONICAL_MAP) {
    if (entry.name === clean) {
      return { valid: true, rawType: clean, canonicalType: entry.name, debugInfo: '精确匹配' }
    }
  }

  // 关键词加权评分
  const lower = clean.toLowerCase()
  const scores: { name: string; score: number; priority: number }[] = []

  for (let i = 0; i < COMPOSITION_CANONICAL_MAP.length; i++) {
    const entry = COMPOSITION_CANONICAL_MAP[i]
    let score = 0
    for (const kw of entry.keywords) {
      if (lower.includes(kw.word.toLowerCase())) {
        score += kw.weight
      }
    }
    if (score > 0) scores.push({ name: entry.name, score, priority: COMPOSITION_CANONICAL_MAP.length - i })
  }

  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score || b.priority - a.priority)
    const best = scores[0]
    return {
      valid: true, rawType: clean, canonicalType: best.name,
      debugInfo: `关键词匹配: ${best.name}(得分${best.score}), 候选: ${scores.slice(0, 3).map(s => `${s.name}(${s.score})`).join(', ')}`,
    }
  }

  return {
    valid: false, rawType: clean, canonicalType: '未知',
    debugInfo: `无法匹配: "${clean}" 不在成分库中`,
  }
}

// ==================== 综合分析质量检查 ====================

export interface QualityCheckResult {
  passed: boolean
  checks: { name: string; passed: boolean; detail: string }[]
}

/**
 * 检查综合分析的输出质量
 */
export function checkOutputQuality(data: Record<string, unknown>): QualityCheckResult {
  const checks: QualityCheckResult['checks'] = []

  const color = data.color as Record<string, unknown> | undefined
  const shape = data.shape as Record<string, unknown> | undefined
  const size = data.size as Record<string, unknown> | undefined
  const texture = data.texture as Record<string, unknown> | undefined
  const composition = data.composition as Record<string, unknown> | undefined

  const checks_list = [
    {
      name: '颜色规范匹配',
      passed: !!color?.name && COLOR_CATALOG.some(c => c.name === color?.name),
      detail: color?.name ? `颜色 "${color.name}" 在知识库中` : '颜色缺失',
    },
    {
      name: 'HEX一致性',
      passed: !!color?.hexColor && color.hexColor !== '#999999',
      detail: `HEX: ${color?.hexColor || '缺失'}${color?.hexColor === '#999999' ? ' (兜底值)' : ''}`,
    },
    {
      name: '形态有效性',
      passed: !!shape?.type && shape.type !== '未知',
      detail: shape?.type ? `形态: ${shape.type}` : '形态缺失',
    },
    {
      name: '尺寸范围提取',
      passed: !!size?.estimatedRangeMm && /\d/.test(String(size.estimatedRangeMm)),
      detail: size?.estimatedRangeMm ? `范围: ${size.estimatedRangeMm}` : '范围缺失',
    },
    {
      name: '质地有效性',
      passed: !!texture?.type && texture.type !== '未知',
      detail: texture?.type ? `质地: ${texture.type}` : '质地缺失',
    },
    {
      name: '成分有效性',
      passed: !!composition?.type && composition.type !== '未知',
      detail: composition?.type ? `成分: ${composition.type}` : '成分缺失',
    },
    {
      name: '质地-成分关联性',
      passed: !!texture?.type && !!composition?.type &&
        texture.type !== '未知' && composition.type !== '未知',
      detail: '质地和成分均已识别',
    },
  ]

  checks.push(...checks_list)

  return {
    passed: checks.every(c => c.passed),
    checks,
  }
}
