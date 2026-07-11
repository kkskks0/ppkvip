export { parseAiJsonResponse, validateAndNormalize, checkDataIntegrity, serializeAnalysisData, deserializeAnalysisData, validateTextureComposition, CURRENT_SCHEMA_VERSION } from './validator'
export type { ValidationReport, IntegrityCheckResult, TextureCompositionValidation } from './validator'

export {
  canonicalizeColor, canonicalizeShape, canonicalizeSize,
  sanitizeHexColor, checkOutputQuality,
} from './canonicalize'
export type { CanonicalizedColor, CanonicalizedShape, CanonicalizedSize, QualityCheckResult } from './canonicalize'

export {
  ANALYSIS_FIELD_RULES, NESTED_SCHEMAS, COLOR_FIELD_RULES, SHAPE_FIELD_RULES,
  SIZE_FIELD_RULES, TEXTURE_FIELD_RULES, COMPOSITION_FIELD_RULES,
  PATTERN_FIELD_RULES, QUANTITY_FIELD_RULES, HEALTH_INDICATOR_FIELD_RULES,
  HEX_COLOR_PATTERN, CONFIDENCE_VALUES, SEVERITY_VALUES,
} from './schema'
export type { FieldRule, AnalysisJsonSchema } from './schema'

export {
  getEnrichedReports,
  getReportsByTimeRange,
  analyzeTrend,
  getAggregatedStats,
  createHealthSnapshot,
  getHealthTimeline,
  getPlatformStats,
} from './queries'
export type { EnrichedReport, TrendData, AggregatedStats } from './queries'
