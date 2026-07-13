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
  /** @deprecated use HealthIndicatorInfo instead */
  highRisk: string[]
  /** @deprecated use HealthIndicatorInfo instead */
  mediumRisk: string[]
  /** @deprecated use HealthIndicatorInfo instead */
  lowRisk: string[]
}

export interface HealthIndicatorInfo {
  attentionItems: string[]
  noticeItems: string[]
  positiveItems: string[]
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
  /** @deprecated use ObservationNoteItem instead */
  signal: string
  /** @deprecated use ObservationNoteItem instead */
  indicates: string
  /** @deprecated use ObservationNoteItem instead */
  severity: string
  /** @deprecated use ObservationNoteItem instead */
  action: string
}

export interface ObservationNoteItem {
  signal: string
  description: string
  attentionLevel: string
  suggestion: string
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
  age?: number
  medicalHistory?: string
  analysisTime: string
  hasReference: boolean
  sampleImage?: string
  analysisStage?: string
  validationInfo?: {
    valid: boolean
    warnings: string[]
    integrityChecks: { name: string; passed: boolean; message?: string }[]
  }
}

// ===== 付费专属高价值模块 =====

export interface PurificationStage {
  currentPhase: string        // 1-初始清除期/2-深度净化期/3-修复调理期/4-巩固维持期
  phaseDescription: string
  progressPercentage: number
  nextPhaseExpectation: string
}

export interface BileFlowAnalysis {
  flowQuality: string          // 正常/轻度黏稠/中度黏稠/明显淤滞
  evidenceBasis: string
  stasisIndicators: string[]
  optimizationSuggestions: string[]
}

export interface SupplementRecommendation {
  name: string
  rationale: string
  foodSources: string[]
  timing: string
  priority: 'must' | 'optional'
}

export interface PersonalizedSupplementPlan {
  coreRecommendations: SupplementRecommendation[]
  precautions: string[]
}

export interface NextCleanseOptimization {
  readyForNextCleanse: string
  suggestedInterval: string
  protocolAdjustments: string[]
  preparationFocus: string[]
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
  healthIndicators?: HealthIndicatorInfo
  dietAdvice: DietAdviceItem[]
  lifestyleAdvice: LifestyleAdviceItem[]
  warningSignals: WarningSignalItem[]
  observationNotes?: ObservationNoteItem[]
  nextStepAdvice: string
  // Premium modules (付费专属)
  purificationStage?: PurificationStage
  bileFlowAnalysis?: BileFlowAnalysis
  personalizedSupplementPlan?: PersonalizedSupplementPlan
  nextCleanseOptimization?: NextCleanseOptimization
  schemaVersion?: number
  _enriched?: EnrichedData
  _textureValid?: boolean
  _compositionValid?: boolean
  _locked?: boolean
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
