/**
 * 数据分析结果 JSON Schema 定义
 * 用于校验和规范化 AI 返回的分析数据
 */

// ===== 字段 Schema 定义 =====
export interface ColorSchema {
  name: { type: 'string'; required: true; minLen: 1 }
  hexColor: { type: 'string'; required: true; pattern: RegExp }
  formationTime: { type: 'string'; required: true; minLen: 1 }
  interpretation: { type: 'string'; required: true; minLen: 10 }
  relatedConditions: { type: 'array'; required: false; itemType: 'string' }
}

export interface ShapeSchema {
  type: { type: 'string'; required: true; minLen: 1 }
  description: { type: 'string'; required: true; minLen: 5 }
  significance: { type: 'string'; required: true; minLen: 5 }
  relatedConditions: { type: 'array'; required: false; itemType: 'string' }
}

export interface SizeSchema {
  category: { type: 'string'; required: true; minLen: 1 }
  estimatedRangeMm: { type: 'string'; required: true; minLen: 1 }
  referenceObject: { type: 'string'; required: true }
  relatedConditions: { type: 'array'; required: false; itemType: 'string' }
}

export interface TextureSchema {
  type: { type: 'string'; required: true; minLen: 1 }
  visualCues: { type: 'string'; required: true; minLen: 1 }
  relatedConditions: { type: 'array'; required: false; itemType: 'string' }
}

export interface CompositionSchema {
  type: { type: 'string'; required: true; minLen: 1 }
  confidence: { type: 'string'; required: true; enum: string[] }
  reasoning: { type: 'string'; required: true; minLen: 1 }
  relatedConditions: { type: 'array'; required: false; itemType: 'string' }
}

export interface PatternSchema {
  type: { type: 'string'; required: true; minLen: 1 }
  description: { type: 'string'; required: true; minLen: 1 }
  significance: { type: 'string'; required: false; minLen: 1 }
}

export interface AnalysisJsonSchema {
  reportMeta: { type: 'object'; required: false }
  color: { type: 'object'; required: true }
  shape: { type: 'object'; required: true }
  size: { type: 'object'; required: true }
  texture: { type: 'object'; required: true }
  composition: { type: 'object'; required: true }
  pattern: { type: 'object'; required: true }
  quantity: { type: 'object'; required: true }
  comprehensiveAnalysis: { type: 'string'; required: true; minLen: 50 }
  healthIndicators: { type: 'object'; required: false }
  dietAdvice: { type: 'array'; required: true; minLen: 1 }
  lifestyleAdvice: { type: 'array'; required: true; minLen: 1 }
  observationNotes: { type: 'array'; required: false }
  nextStepAdvice: { type: 'string'; required: true; minLen: 10 }
}

// ===== Schema 常量 =====
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/
const CONFIDENCE_VALUES = ['高', '中', '低', 'High', 'Medium', 'Low']
const SEVERITY_VALUES = ['轻度', '中度', '重度', '严重', 'Mild', 'Moderate', 'Severe']

// ===== 字段类型校验规则 =====
export interface FieldRule {
  key: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  minLen?: number
  pattern?: RegExp
  enum?: string[]
  defaults?: unknown
}

export const ANALYSIS_FIELD_RULES: FieldRule[] = [
  // Top-level
  { key: 'comprehensiveAnalysis', type: 'string', required: true, minLen: 50, defaults: '分析数据不完整，请重新上传图片。' },
  { key: 'nextStepAdvice', type: 'string', required: true, minLen: 10, defaults: '建议重新上传清晰图片获取完整分析。' },

  // Nested objects
  { key: 'color', type: 'object', required: true },
  { key: 'shape', type: 'object', required: true },
  { key: 'size', type: 'object', required: true },
  { key: 'texture', type: 'object', required: true },
  { key: 'composition', type: 'object', required: true },
  { key: 'pattern', type: 'object', required: true },
  { key: 'quantity', type: 'object', required: true },
  { key: 'healthIndicators', type: 'object', required: false },
  { key: 'reportMeta', type: 'object', required: false },

  // Arrays
  { key: 'dietAdvice', type: 'array', required: true, minLen: 1, defaults: [] },
  { key: 'lifestyleAdvice', type: 'array', required: true, minLen: 1, defaults: [] },
  { key: 'warningSignals', type: 'array', required: false, defaults: [] },
  { key: 'observationNotes', type: 'array', required: false, defaults: [] },
]

export const COLOR_FIELD_RULES: FieldRule[] = [
  { key: 'name', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'hexColor', type: 'string', required: true, pattern: HEX_COLOR_PATTERN, defaults: '#999999' },
  { key: 'formationTime', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'interpretation', type: 'string', required: true, minLen: 10, defaults: '无法识别' },
  { key: 'relatedConditions', type: 'array', required: false, defaults: [] },
]

export const SHAPE_FIELD_RULES: FieldRule[] = [
  { key: 'type', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'description', type: 'string', required: true, minLen: 5, defaults: '无法识别' },
  { key: 'significance', type: 'string', required: true, minLen: 5, defaults: '无法判断' },
  { key: 'relatedConditions', type: 'array', required: false, defaults: [] },
]

export const SIZE_FIELD_RULES: FieldRule[] = [
  { key: 'category', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'estimatedRangeMm', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'referenceObject', type: 'string', required: false, defaults: '无' },
  { key: 'relatedConditions', type: 'array', required: false, defaults: [] },
]

export const TEXTURE_FIELD_RULES: FieldRule[] = [
  { key: 'type', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'visualCues', type: 'string', required: true, minLen: 1, defaults: '无法识别' },
  { key: 'relatedConditions', type: 'array', required: false, defaults: [] },
  { key: 'composition', type: 'string', required: false },
]

export const COMPOSITION_FIELD_RULES: FieldRule[] = [
  { key: 'type', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'confidence', type: 'string', required: true, enum: CONFIDENCE_VALUES, defaults: '低' },
  { key: 'reasoning', type: 'string', required: true, minLen: 1, defaults: '无法判断' },
  { key: 'relatedConditions', type: 'array', required: false, defaults: [] },
]

export const PATTERN_FIELD_RULES: FieldRule[] = [
  { key: 'type', type: 'string', required: true, minLen: 1, defaults: '未知' },
  { key: 'description', type: 'string', required: true, minLen: 1, defaults: '无法识别' },
  { key: 'significance', type: 'string', required: false, defaults: '无法判断' },
]

export const QUANTITY_FIELD_RULES: FieldRule[] = [
  { key: 'estimatedCount', type: 'number', required: true, defaults: 0 },
  { key: 'density', type: 'string', required: true, defaults: '未知' },
  { key: 'significance', type: 'string', required: false, defaults: '无法判断' },
]

export const HEALTH_INDICATOR_FIELD_RULES: FieldRule[] = [
  { key: 'attentionItems', type: 'array', required: false, defaults: [] },
  { key: 'noticeItems', type: 'array', required: false, defaults: [] },
  { key: 'positiveItems', type: 'array', required: false, defaults: [] },
]

export const OBSERVATION_NOTE_FIELD_RULES: FieldRule[] = [
  { key: 'signal', type: 'string', required: true, minLen: 1 },
  { key: 'description', type: 'string', required: true, minLen: 1 },
  { key: 'attentionLevel', type: 'string', required: true },
  { key: 'suggestion', type: 'string', required: true, minLen: 1 },
]

// 子对象 schema 映射
export const NESTED_SCHEMAS: Record<string, FieldRule[]> = {
  color: COLOR_FIELD_RULES,
  shape: SHAPE_FIELD_RULES,
  size: SIZE_FIELD_RULES,
  texture: TEXTURE_FIELD_RULES,
  composition: COMPOSITION_FIELD_RULES,
  pattern: PATTERN_FIELD_RULES,
  quantity: QUANTITY_FIELD_RULES,
  healthIndicators: HEALTH_INDICATOR_FIELD_RULES,
  observationNotes: OBSERVATION_NOTE_FIELD_RULES,
}

export { HEX_COLOR_PATTERN, CONFIDENCE_VALUES, SEVERITY_VALUES }
