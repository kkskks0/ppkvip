export interface ColorInfo {
  name: string
  hexColor: string
  formationTime: string
  interpretation: string
  relatedConditions?: string[]
}

export interface ShapeInfo {
  type: string
  description: string
  significance: string
  relatedConditions?: string[]
}

export interface SizeInfo {
  category: string
  estimatedRangeMm: string
  referenceObject: string
  relatedConditions?: string[]
}

export interface TextureInfo {
  type: string
  visualCues: string
  composition?: string
  relatedConditions?: string[]
}

export interface CompositionInfo {
  type: string
  confidence: string
  reasoning: string
  relatedConditions?: string[]
}

export interface PatternInfo {
  type: string
  description: string
  significance?: string
}

export interface QuantityInfo {
  estimatedCount: number
  density: string
  significance?: string
}

export interface DiseaseRiskInfo {
  highRisk: string[]
  mediumRisk: string[]
  lowRisk: string[]
}

export interface DietAdviceItem {
  category: string
  items: string[]
  reason?: string
}

export interface LifestyleAdviceItem {
  category: string
  advice: string
  importance: string
}

export interface WarningSignalItem {
  signal: string
  indicates: string
  severity: string
  action: string
}

export interface EnrichedData {
  colorMatch: {
    name: string
    hexColor: string
    severity: string
    relatedConditions: string[]
  } | null
  matchedConditions: string[]
  riskIndicators: string[]
  dietarySuggestions: string[]
  timestamp: string
}

export interface ReportMeta {
  userName: string
  gender: string
  analysisTime: string
  hasReference: boolean
  sampleImage?: string
  validationInfo?: {
    valid: boolean
    warnings: string[]
    integrityChecks: { name: string; passed: boolean; message?: string }[]
  }
}

export interface AnalysisResult {
  reportMeta?: ReportMeta
  color: ColorInfo
  shape: ShapeInfo
  size: SizeInfo
  texture: TextureInfo
  composition: CompositionInfo
  pattern: PatternInfo
  quantity: QuantityInfo
  comprehensiveAnalysis: string
  diseaseRisk: DiseaseRiskInfo
  dietAdvice: DietAdviceItem[]
  lifestyleAdvice: LifestyleAdviceItem[]
  warningSignals: WarningSignalItem[]
  nextStepAdvice: string
  medicalDisclaimer: string
  schemaVersion?: number
  _enriched?: EnrichedData
}

export interface Report {
  id: string
  userId: string
  imageUrl: string
  imageKey: string
  analysis: AnalysisResult
  reportType: 'SINGLE_PAY' | 'ANNUAL_MEMBER'
  isDeleted: boolean
  createdAt: string
  expiresAt?: string
  analysisVersion?: number
}

// ===== 数据分析相关类型 =====

export interface TrendData {
  trend: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
  metrics: {
    severityHistory: string[]
    colorHistory: string[]
    countHistory: number[]
    sizeHistory: string[]
  }
  insights: string[]
}

export interface AggregatedStats {
  totalReports: number
  lastReportDate: string | null
  dominantColor: string
  dominantShape: string
  avgStonesPerReport: number
  trendDirection: string
  highRiskCount: number
  memberStatus: string
  nextRecommendedDate?: string
}

export interface HealthSnapshot {
  id: string
  userId: string
  reportId: string
  colorHex: string
  colorName: string
  severityLevel: string
  stoneCount: number
  stoneSizeCategory: string
  patternType?: string
  riskLevel: string
  createdAt: string
}

export interface PlatformStats {
  totalUsers: number
  totalReports: number
  colorDistribution: Record<string, number>
  shapeDistribution: Record<string, number>
  avgSeverity: string
}
