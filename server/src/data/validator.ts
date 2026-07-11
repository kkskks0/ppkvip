/**
 * 数据验证、清洗与规范化引擎
 *
 * 功能：
 * 1. JSON 解析与容错修复（替代手动补括号）
 * 2. Schema 校验（类型、必填、长度、枚举、正则）
 * 3. 知识库增强（基于结构化知识库补全缺失字段）
 * 4. 数据规范化（统一格式、降级处理）
 * 5. 版本化存储（schemaVersion 标记）
 */

import {
  ANALYSIS_FIELD_RULES,
  NESTED_SCHEMAS,
  COLOR_FIELD_RULES,
  SHAPE_FIELD_RULES,
  SIZE_FIELD_RULES,
  TEXTURE_FIELD_RULES,
  COMPOSITION_FIELD_RULES,
  PATTERN_FIELD_RULES,
  QUANTITY_FIELD_RULES,
  DISEASE_RISK_FIELD_RULES,
} from './schema'
import type { FieldRule } from './schema'
import { findClosestColor } from '../knowledge/colorCatalog'
import type { ColorEntry } from '../knowledge/colorCatalog'
import {
  isKnownTexture, isKnownComposition, findTexture, findComposition,
  crossValidateColorTexture, crossValidateTextureComposition,
  recommendByColorAndShape, TEXTURE_ALIAS_MAP, COMPOSITION_ALIAS_MAP,
} from './textureCompositionDb'
import {
  canonicalizeColor,
  canonicalizeShape,
  canonicalizeSize,
  sanitizeHexColor,
  checkOutputQuality,
  canonicalizeTexture,
  canonicalizeComposition,
} from './canonicalize'

// ==================== JSON 解析 & 容错 ====================

interface ParseResult {
  data: Record<string, unknown> | null
  errors: string[]
  warnings: string[]
  repairable: boolean
}

/**
 * 智能解析 AI 返回文本为 JSON
 * 比原版简单的 `{[\s\S]*}` 正则更健壮：
 * - 处理 markdown 代码块
 * - 支持修复不完整的 JSON（未闭合的括号、引号）
 * - 分级尝试多种解析策略
 */
export function parseAiJsonResponse(text: string): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!text || text.trim().length === 0) {
    return { data: null, errors: ['Empty AI response'], warnings: [], repairable: false }
  }

  let cleaned = text.trim()

  // Step 1: 移除 markdown 代码块
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Step 2: 直接解析
  try {
    return { data: JSON.parse(cleaned), errors: [], warnings: [], repairable: true }
  } catch {
    warnings.push('Direct JSON parse failed, attempting repair')
  }

  // Step 3: 提取 JSON 对象
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { data: null, errors: ['No JSON object found in response'], warnings, repairable: false }
  }

  let candidate = jsonMatch[0]

  // Step 4: 尝试直接解析提取的 JSON
  try {
    return { data: JSON.parse(candidate), errors, warnings, repairable: true }
  } catch {
    warnings.push('Extracted JSON parse failed, attempting structural repair')
  }

  // Step 5: 结构性修复 - 统计括号匹配
  const openBraces = (candidate.match(/\{/g) || []).length
  const closeBraces = (candidate.match(/\}/g) || []).length
  const openBrackets = (candidate.match(/\[/g) || []).length
  const closeBrackets = (candidate.match(/\]/g) || []).length

  let repaired = candidate

  // 补全未闭合的括号
  for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']'
  for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}'

  // 补全未闭合的字符串（奇数引号）
  const quoteCount = (repaired.match(/"/g) || []).length
  if (quoteCount % 2 !== 0) {
    // 找到最后一个正常结构的键或值，在其后补引号
    const lastComma = repaired.lastIndexOf(',')
    const lastColon = repaired.lastIndexOf(':')
    if (lastComma > lastColon) {
      repaired = repaired.slice(0, lastComma) + '"' + repaired.slice(lastComma)
    } else {
      repaired += '"'
    }
    warnings.push('Fixed unclosed string in JSON')
  }

  try {
    return { data: JSON.parse(repaired), errors, warnings, repairable: true }
  } catch {
    errors.push('All JSON repair strategies failed')
    return { data: null, errors, warnings, repairable: false }
  }
}

// ==================== Schema 校验 & 应用默认值 ====================

interface ValidationResult {
  valid: boolean
  value: unknown
  errors: string[]
  warnings: string[]
  wasCleaned: boolean
}

/**
 * 校验并清洗单个字段
 */
function validateField(
  value: unknown,
  rule: FieldRule,
  path: string
): ValidationResult {
  const { key, type, required, minLen, pattern, enum: enumVals, defaults } = rule
  const errors: string[] = []
  const warnings: string[] = []
  let wasCleaned = false

  // 处理 undefined/null
  if (value === undefined || value === null) {
    if (required && defaults !== undefined) {
      return { valid: true, value: defaults, errors, warnings, wasCleaned: true }
    } else if (required) {
      errors.push(`${path}.${key}: required field is missing`)
      return { valid: false, value: defaults, errors, warnings, wasCleaned }
    } else {
      return { valid: true, value: defaults !== undefined ? defaults : value, errors, warnings, wasCleaned }
    }
  }

  // 类型校验
  const actualType = Array.isArray(value) ? 'array' : typeof value
  if (actualType !== type) {
    if (type === 'number' && actualType === 'string') {
      const num = Number(value as string)
      if (!isNaN(num)) { value = num; wasCleaned = true; warnings.push(`${path}.${key}: converted string to number`) }
      else if (defaults !== undefined) { return { valid: true, value: defaults, errors, warnings, wasCleaned: true } }
      else { errors.push(`${path}.${key}: expected number, got ${actualType}`) }
    } else if (type === 'string' && actualType === 'number') {
      value = String(value); wasCleaned = true
    } else if (type === 'array' && actualType === 'string') {
      value = [value as string]; wasCleaned = true; warnings.push(`${path}.${key}: wrapped string in array`)
    } else if (defaults !== undefined) {
      return { valid: true, value: defaults, errors, warnings, wasCleaned: true }
    } else {
      errors.push(`${path}.${key}: expected ${type}, got ${actualType}`)
    }
  }

  // 字符串长度校验
  if (type === 'string' && minLen && typeof value === 'string') {
    if (value.length < minLen) {
      if (defaults !== undefined) {
        return { valid: true, value: defaults, errors, warnings: [...warnings, `${path}.${key}: string too short`], wasCleaned: true }
      } else {
        errors.push(`${path}.${key}: string too short`)
      }
    }
  }

  // 正则校验
  if (pattern && typeof value === 'string' && !pattern.test(value)) {
    if (defaults !== undefined) {
      return { valid: true, value: defaults, errors, warnings: [...warnings, `${path}.${key}: pattern mismatch for "${String(value)}"`], wasCleaned: true }
    } else {
      errors.push(`${path}.${key}: pattern mismatch`)
    }
  }

  // 枚举校验
  if (enumVals && typeof value === 'string' && !enumVals.includes(value)) {
    warnings.push(`${path}.${key}: enum mismatch "${value}", not in [${enumVals.join(', ')}]`)
  }

  // 数组最小长度校验
  if (type === 'array' && minLen && Array.isArray(value)) {
    if (value.length < minLen) {
      if (defaults !== undefined && Array.isArray(defaults)) {
        return { valid: true, value: defaults, errors, warnings: [...warnings, `${path}.${key}: array too short`], wasCleaned: true }
      }
    }
  }

  return { valid: errors.length === 0, value, errors, warnings, wasCleaned }
}

/**
 * 校验并规范化整个分析 JSON 对象
 */
export interface ValidationReport {
  valid: boolean
  normalizedData: Record<string, unknown>
  errors: string[]
  warnings: string[]
  wasCleaned: boolean
  schemaVersion: number
}

export function validateAndNormalize(rawData: Record<string, unknown>): ValidationReport {
  const errors: string[] = []
  const warnings: string[] = []
  let wasCleaned = false

  const result: Record<string, unknown> = {
    schemaVersion: 1,
  }

  // 1. 校验顶层字段
  for (const rule of ANALYSIS_FIELD_RULES) {
    const fieldResult = validateField(rawData[rule.key], rule, '')
    if (fieldResult.errors.length > 0) errors.push(...fieldResult.errors)
    if (fieldResult.warnings.length > 0) warnings.push(...fieldResult.warnings)
    if (fieldResult.wasCleaned) wasCleaned = true
    result[rule.key] = fieldResult.value
  }

  // 2. 校验嵌套对象
  for (const [objKey, objRules] of Object.entries(NESTED_SCHEMAS)) {
    const objValue = rawData[objKey] as Record<string, unknown> | undefined
    const cleanObj: Record<string, unknown> = {}

    if (!objValue || typeof objValue !== 'object') {
      for (const rule of objRules) {
        if (rule.defaults !== undefined) cleanObj[rule.key] = rule.defaults
        else if (rule.required) errors.push(`${objKey}.${rule.key}: nested object missing`)
      }
      warnings.push(`${objKey}: missing object, using defaults`)
      wasCleaned = true
    } else {
      for (const rule of objRules) {
        const fieldResult = validateField(objValue[rule.key], rule, objKey)
        if (fieldResult.errors.length > 0) errors.push(...fieldResult.errors)
        if (fieldResult.warnings.length > 0) warnings.push(...fieldResult.warnings)
        if (fieldResult.wasCleaned) wasCleaned = true
        cleanObj[rule.key] = fieldResult.value
      }
    }

    result[objKey] = cleanObj
  }

  // 3. 核心：规范化引擎 - 将AI非确定性输出映射到知识库规范值
  const canonWarnings = applyCanonicalization(result)

  // 4. 增强：知识库关联
  result._enriched = enrichWithKnowledge(result)

  return {
    valid: errors.length === 0,
    normalizedData: result,
    errors,
    warnings: [...warnings, ...canonWarnings],
    wasCleaned: wasCleaned || canonWarnings.length > 0,
    schemaVersion: 1,
  }
}

// ==================== 规范化引擎集成 ====================

/**
 * 对已验证的分析数据应用规范化引擎
 * 强制将AI的非确定性输出对齐到知识库规范值
 */
function applyCanonicalization(result: Record<string, unknown>): string[] {
  const warnings: string[] = []
  const changes: string[] = []

  const color = result.color as Record<string, unknown> | undefined
  const shape = result.shape as Record<string, unknown> | undefined
  const size = result.size as Record<string, unknown> | undefined

  // 1. 颜色规范化
  if (color) {
    const rawName = (color.name as string) || ''
    const rawHex = (color.hexColor as string) || ''
    const canon = canonicalizeColor(rawName, rawHex)

    if (canon.valid) {
      if (canon.canonicalName !== rawName) {
        changes.push(`颜色: "${rawName}" → "${canon.canonicalName}"`)
        color.name = canon.canonicalName
      }
      // 强制使用知识库HEX（不信任AI返回的HEX）
      if (canon.canonicalHex !== rawHex) {
        changes.push(`HEX: "${rawHex}" → "${canon.canonicalHex}"`)
        color.hexColor = canon.canonicalHex
      }
      // 注入规范化的严重度
      color._canonicalSeverity = canon.severity
      color._canonicalDebug = canon.debugInfo
      color._canonicalValid = true
    } else {
      warnings.push(`颜色无法规范化: ${canon.debugInfo}`)
      // 退化为HEX匹配
      if (rawHex && rawHex.startsWith('#')) {
        const closest = findClosestColor(rawHex)
        if (closest) {
          color.name = closest.name
          color.hexColor = closest.hexColor
          color._canonicalSeverity = closest.severity
          color._canonicalDebug = `退化HEX匹配: ${closest.name}`
          color._canonicalValid = true
          changes.push(`颜色退化匹配: "${rawName}" → "${closest.name}"`)
        }
      }
    }
  }

  // 2. 形态规范化
  if (shape) {
    const rawType = (shape.type as string) || ''
    const canon = canonicalizeShape(rawType)

    if (canon.valid && canon.canonicalType !== rawType) {
      changes.push(`形态: "${rawType}" → "${canon.canonicalType}"`)
      shape.type = canon.canonicalType
      shape._canonicalDebug = canon.debugInfo
      shape._canonicalValid = true
    } else if (!canon.valid) {
      warnings.push(`形态无法规范化: ${canon.debugInfo}`)
      shape._canonicalDebug = canon.debugInfo
      shape._canonicalValid = false
    }
  }

  // 3. 尺寸规范化
  if (size) {
    const rawCategory = (size.category as string) || ''
    const rawRange = (size.estimatedRangeMm as string) || ''
    const canon = canonicalizeSize(rawCategory, rawRange)

    if (canon.canonicalCategory !== rawCategory) {
      changes.push(`尺寸: "${rawCategory}" → "${canon.canonicalCategory}"`)
      size.category = canon.canonicalCategory
    }
    // 规范化数值范围格式
    if (canon.extractedRangeMm && canon.extractedRangeMm !== rawRange) {
      size.estimatedRangeMm = canon.extractedRangeMm
    }
    size._canonicalMinMm = canon.minMm
    size._canonicalMaxMm = canon.maxMm
    size._canonicalDebug = canon.debugInfo
    size._canonicalValid = true
  }

  // 4. 质地规范化
  const texture = result.texture as Record<string, unknown> | undefined
  if (texture) {
    const rawType = (texture.type as string) || ''
    const canon = canonicalizeTexture(rawType)

    if (canon.valid) {
      if (canon.canonicalType !== rawType) {
        changes.push(`质地: "${rawType}" → "${canon.canonicalType}"`)
        texture.type = canon.canonicalType
      }
      texture._canonicalDebug = canon.debugInfo
      texture._canonicalValid = true
      // 注入知识库数据增强
      const dbEntry = findTexture(canon.canonicalType)
      if (dbEntry) {
        texture._enriched = {
          description: dbEntry.description,
          visualCues: dbEntry.visualCues,
          crossSectionCues: dbEntry.crossSectionCues,
          severityLevel: dbEntry.severityLevel,
          relatedCompositions: dbEntry.relatedCompositions,
          clinicalNotes: dbEntry.clinicalNotes,
        }
        texture._canonicalSeverity = dbEntry.severityLevel
      }
    } else {
      // 尝试退化为简称/别名匹配
      const aliasMatch = TEXTURE_ALIAS_MAP[rawType.toLowerCase().trim()]
      if (aliasMatch && isKnownTexture(aliasMatch)) {
        texture.type = aliasMatch
        changes.push(`质地别名匹配: "${rawType}" → "${aliasMatch}"`)
        texture._canonicalDebug = `别名退化: ${rawType} → ${aliasMatch}`
        texture._canonicalValid = true
      } else {
        warnings.push(`质地无法规范化: ${canon.debugInfo}`)
        texture._canonicalDebug = canon.debugInfo
        texture._canonicalValid = false
      }
    }
  }

  // 5. 成分规范化
  const composition = result.composition as Record<string, unknown> | undefined
  if (composition) {
    const rawType = (composition.type as string) || ''
    const canon = canonicalizeComposition(rawType)

    if (canon.valid) {
      if (canon.canonicalType !== rawType) {
        changes.push(`成分: "${rawType}" → "${canon.canonicalType}"`)
        composition.type = canon.canonicalType
      }
      composition._canonicalDebug = canon.debugInfo
      composition._canonicalValid = true
      // 注入知识库数据增强
      const dbEntry = findComposition(canon.canonicalType)
      if (dbEntry) {
        composition._enriched = {
          description: dbEntry.description,
          typicalColor: dbEntry.typicalColor,
          hexColor: dbEntry.hexColor,
          hardness: dbEntry.hardness,
          occurrence: dbEntry.occurrence,
          relatedTextures: dbEntry.relatedTextures,
          riskFactors: dbEntry.riskFactors,
          clinicalSignificance: dbEntry.clinicalSignificance,
          imagingFeature: dbEntry.imagingFeature,
        }
      }
    } else {
      // 尝试退化为简称/别名匹配
      const aliasMatch = COMPOSITION_ALIAS_MAP[rawType.toLowerCase().trim()]
      if (aliasMatch && isKnownComposition(aliasMatch)) {
        composition.type = aliasMatch
        changes.push(`成分别名匹配: "${rawType}" → "${aliasMatch}"`)
        composition._canonicalDebug = `别名退化: ${rawType} → ${aliasMatch}`
        composition._canonicalValid = true
      } else {
        warnings.push(`成分无法规范化: ${canon.debugInfo}`)
        composition._canonicalDebug = canon.debugInfo
        composition._canonicalValid = false
      }
    }
  }

  // 6. 交叉验证：颜色-质地-成分三要素逻辑一致性检查
  if (color && texture && composition) {
    const colorName = (color.name as string) || ''
    const textureType = (texture.type as string) || ''
    const compType = (composition.type as string) || ''

    if (colorName && textureType && compType) {
      // 颜色-质地交叉验证
      const colorTexValidation = crossValidateColorTexture(colorName, textureType)
      if (!colorTexValidation.valid) {
        warnings.push(`交叉验证警告：颜色"${colorName}"与质地"${textureType}"可能存在不一致。推荐关联成分：${colorTexValidation.matchedCompositions.join('、') || '无匹配'}`)
        result._crossValidationWarning = true
      }

      // 质地-成分交叉验证
      const texCompValidation = crossValidateTextureComposition(textureType, compType)
      if (!texCompValidation.valid) {
        warnings.push(`交叉验证警告：质地"${textureType}"与成分"${compType}"关联度低，可能不一致`)
        result._crossValidationWarning = true
      }
    }

    // 若AI分析结果无效，使用基于颜色和形态的知识库推荐
    if (!(texture._canonicalValid) || !(composition._canonicalValid)) {
      const shapeType = shape ? ((shape.type as string) || '') : ''
      const recommendation = recommendByColorAndShape(colorName || '', shapeType)
      result._textureCompositionRecommendation = recommendation

      if (recommendation.recommendedTextures.length > 0) {
        warnings.push(`质地/成分判定不足，基于颜色"${colorName}"的知识库推荐：质地=${recommendation.recommendedTextures.join('、')}；成分=${recommendation.recommendedCompositions.join('、')}`)
      }
    }
  }

  // 7. 质量检查
  const quality = checkOutputQuality(result)
  result._qualityCheck = quality

  if (!quality.passed) {
    const failedChecks = quality.checks.filter(c => !c.passed).map(c => c.name)
    warnings.push(`质量检查未通过: ${failedChecks.join(', ')}`)
  }

  // 记录规范化变更日志
  if (changes.length > 0) {
    result._canonicalChanges = changes
    warnings.push(`规范化: ${changes.join('; ')}`)
  }

  return warnings
}

// ==================== 知识库增强 ====================

interface EnrichedData {
  colorMatch: ColorEntry | null
  matchedConditions: string[]
  riskIndicators: string[]
  dietarySuggestions: string[]
  timestamp: string
}

function enrichWithKnowledge(data: Record<string, unknown>): EnrichedData {
  const color = (data.color as Record<string, unknown>) || {}
  const colorName = (color.name as string) || ''
  const colorMatch = findClosestColor(colorName)

  const matchedConditions: string[] = []
  if (colorMatch) matchedConditions.push(...colorMatch.relatedConditions)

  return {
    colorMatch: colorMatch || null,
    matchedConditions,
    riskIndicators: colorMatch?.severity === 'Severe'
      ? ['高严重度颜色', '建议医疗关注']
      : ['常规监测'],
    dietarySuggestions: colorMatch?.severity === 'Severe'
      ? ['立即停止高脂饮食', '增加蔬菜水果摄入', '每日饮用柠檬温水']
      : ['保持均衡饮食', '适当增加膳食纤维'],
    timestamp: new Date().toISOString(),
  }
}

// ==================== 数据完整性校验 ====================

export interface IntegrityCheckResult {
  passed: boolean
  checks: { name: string; passed: boolean; message?: string }[]
}

/**
 * 跨字段数据完整性校验
 */
export function checkDataIntegrity(data: Record<string, unknown>): IntegrityCheckResult {
  const checks: IntegrityCheckResult['checks'] = []

  // 检查1：颜色 hexColor 是否有效
  const color = data.color as Record<string, unknown> | undefined
  const hexColor = color?.hexColor as string | undefined
  checks.push({
    name: '颜色代码有效性',
    passed: !!hexColor && /^#[0-9A-Fa-f]{6}$/.test(hexColor),
    message: hexColor && !/^#[0-9A-Fa-f]{6}$/.test(hexColor) ? `无效颜色格式: ${hexColor}` : undefined,
  })

  // 检查2：综合分析长度
  const compAnalysis = data.comprehensiveAnalysis as string | undefined
  checks.push({
    name: '综合分析完整性',
    passed: !!compAnalysis && compAnalysis.length >= 50,
    message: compAnalysis && compAnalysis.length < 50 ? `综合分析过短: ${compAnalysis.length}字` : undefined,
  })

  // 检查3：健康指标一致性（兼容新旧字段名）
  const healthIndicators = (data.healthIndicators || data.diseaseRisk) as Record<string, unknown> | undefined
  const attentionItems = ((healthIndicators?.attentionItems || healthIndicators?.highRisk) as unknown[] || [])
  const noticeItems = ((healthIndicators?.noticeItems || healthIndicators?.mediumRisk) as unknown[] || [])
  checks.push({
    name: '健康指标一致性',
    passed: attentionItems.length + noticeItems.length > 0 || !!healthIndicators,
    message: '健康指标数据为空，分析可能不完整',
  })

  // 检查4：饮食建议非空
  const dietAdvice = data.dietAdvice as unknown[]
  checks.push({
    name: '饮食建议完整性',
    passed: Array.isArray(dietAdvice) && dietAdvice.length > 0,
    message: !dietAdvice?.length ? '饮食建议为空' : undefined,
  })

  return {
    passed: checks.every(c => c.passed),
    checks,
  }
}

// ==================== 数据序列化版本控制 ====================

export const CURRENT_SCHEMA_VERSION = 1

export function serializeAnalysisData(data: Record<string, unknown>): string {
  const versioned = {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    serializedAt: new Date().toISOString(),
  }
  return JSON.stringify(versioned)
}

export function deserializeAnalysisData(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    // 兼容旧版无版本号的存储
    if (!parsed.schemaVersion) parsed.schemaVersion = 0
    return parsed
  } catch {
    return null
  }
}

// ==================== 质地/成分 知识库验证 ====================

export interface TextureCompositionValidation {
  texture: {
    valid: boolean
    data: Record<string, unknown> | null
    dbEntry: ReturnType<typeof findTexture>
  }
  composition: {
    valid: boolean
    data: Record<string, unknown> | null
    dbEntry: ReturnType<typeof findComposition>
  }
}

/**
 * 验证质地与成分数据是否在本地知识库中
 * 硬性约束：
 * - 质地 type 必须在已知数据库中，否则标记无效
 * - 成分 type 必须在已知数据库中，否则标记无效
 * - 无效数据前端将隐藏对应区域
 */
export function validateTextureComposition(
  analysisData: Record<string, unknown>
): TextureCompositionValidation {
  const texture = analysisData.texture as Record<string, unknown> | undefined
  const composition = analysisData.composition as Record<string, unknown> | undefined

  const textureType = texture?.type as string | undefined
  const compType = composition?.type as string | undefined

  const textureKnown = isKnownTexture(textureType)
  const compKnown = isKnownComposition(compType)

  // 如果类型在数据库中，使用知识库中的完整数据增强
  let textureData = texture || null
  let compositionData = composition || null
  const textureEntry = textureKnown && textureType ? findTexture(textureType) : null
  const compEntry = compKnown && compType ? findComposition(compType) : null

  // 用知识库数据增强（保留AI的visualCues/reasoning等动态分析，补充数据库中的静态信息）
  if (textureEntry && textureData) {
    textureData = {
      ...textureData,
      _enriched: {
        description: textureEntry.description,
        visualCues: textureEntry.visualCues,
        severityLevel: textureEntry.severityLevel,
        relatedCompositions: textureEntry.relatedCompositions,
        clinicalNotes: textureEntry.clinicalNotes,
      },
    }
  }
  if (compEntry && compositionData) {
    compositionData = {
      ...compositionData,
      _enriched: {
        description: compEntry.description,
        typicalColor: compEntry.typicalColor,
        hexColor: compEntry.hexColor,
        hardness: compEntry.hardness,
        occurrence: compEntry.occurrence,
        relatedTextures: compEntry.relatedTextures,
        clinicalSignificance: compEntry.clinicalSignificance,
      },
    }
  }

  return {
    texture: { valid: textureKnown, data: textureData, dbEntry: textureEntry },
    composition: { valid: compKnown, data: compositionData, dbEntry: compEntry },
  }
}
