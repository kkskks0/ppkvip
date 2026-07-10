/**
 * 肝胆排毒数据知识库 - 统一导出索引
 */
export {
  COLOR_CATALOG,
  COLOR_INDEX,
  COLORS_BY_SEVERITY,
  findClosestColor,
} from './colorCatalog'
export type { ColorEntry } from './colorCatalog'

export {
  SHAPE_CATALOG,
  SIZE_CATALOG,
  TEXTURE_CATALOG,
  COMPOSITION_CATALOG,
  PATTERN_CATALOG,
  GENDER_SPECIFIC_RISKS,
} from './morphologyCatalog'
export type {
  ShapeEntry, SizeEntry, TextureEntry,
  CompositionEntry, PatternEntry, GenderRiskEntry
} from './morphologyCatalog'

export {
  DIET_ADVICE_CATALOG,
  LIFESTYLE_ADVICE_CATALOG,
  WARNING_SIGNALS,
} from './dietLifestyle'
export type {
  DietAdviceEntry, LifestyleAdviceEntry, WarningSignalEntry
} from './dietLifestyle'

// ===== 风险评估引擎 =====
import { COLOR_CATALOG } from './colorCatalog'
import { SHAPE_CATALOG, PATTERN_CATALOG } from './morphologyCatalog'
import { WARNING_SIGNALS } from './dietLifestyle'
import type { ColorEntry } from './colorCatalog'
import type { ShapeEntry, PatternEntry } from './morphologyCatalog'

export interface RiskAssessmentResult {
  overallRisk: '低' | '中' | '高'
  riskFactors: { category: string; level: '低' | '中' | '高'; description: string }[]
  matchedConditions: string[]
  recommendedActions: string[]
}

export function assessRisk(
  color: Pick<ColorEntry, 'name' | 'severity'>,
  shape: Pick<ShapeEntry, 'type' | 'severity'>,
  pattern: Pick<PatternEntry, 'type' | 'riskLevel'>
): RiskAssessmentResult {
  const severityScores = { Mild: 1, Moderate: 2, Severe: 3, '低': 1, '中': 2, '高': 3 }
  const colorScore = severityScores[color.severity] || 1
  const shapeScore = severityScores[shape.severity] || 1
  const patternScore = severityScores[pattern.riskLevel] || 1
  const totalScore = colorScore + shapeScore + patternScore

  let overallRisk: '低' | '中' | '高' = '低'
  if (totalScore >= 8) overallRisk = '高'
  else if (totalScore >= 5) overallRisk = '中'

  const matchedConditions: string[] = []
  const colorMatch = COLOR_CATALOG.find(c => c.name === color.name)
  if (colorMatch) matchedConditions.push(...colorMatch.relatedConditions)

  const shapeMatch = SHAPE_CATALOG.find(s => s.type === shape.type)
  if (shapeMatch) matchedConditions.push(...shapeMatch.relatedConditions)

  return {
    overallRisk,
    riskFactors: [
      { category: '颜色风险', level: color.severity === 'Severe' ? '高' : color.severity === 'Moderate' ? '中' : '低',
        description: `${color.name}结石属于${color.severity}严重度` },
      { category: '形态风险', level: shape.severity === 'Severe' ? '高' : shape.severity === 'Moderate' ? '中' : '低',
        description: `${shape.type}形态属于${shape.severity}风险等级` },
      { category: '模式风险', level: pattern.riskLevel,
        description: `排出模式为"${pattern.type}"` },
    ],
    matchedConditions,
    recommendedActions: overallRisk === '高'
      ? ['建议就医咨询', '停止自行排石', '优先做肝脏功能检查']
      : overallRisk === '中'
        ? ['建议2-4周后再次排石', '加强日常护肝措施', '关注相关症状变化']
        : ['继续维持健康饮食', '3个月后再次评估', '保持良好生活习惯'],
  }
}

// ===== 知识库 Prompt 构建器（替代硬编码 System Prompt） =====
export function buildKnowledgePrompt(lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'en') {
    return `You are a senior hepatobiliary detoxification analysis expert, based on "The Amazing Liver & Gallbladder Flush" (Andreas Moritz) and TCM liver/gallbladder theory.

Color mapping: Bright Green=Recent crystals(Mild), Emerald Green=Typical stones(Moderate), Dark Green=Older(Moderate), Black Green=Years(Severe), Yellow-Brown=High cholesterol(Moderate), Beige=Pure cholesterol(Moderate), Dark Brown=Pigment(Severe), Dark Red=Bleeding(Severe), White=Calcified(Severe), Black=Calcium bilirubinate(Severe)

Shape mapping: Round=Gallbladder stones(Moderate), Mulberry=Multi-crystal(Moderate), Rice-grain=Early(Mild), Tubular=Cast(Severe), Branch=Extensive(Severe), Sandy=Early(Mild), Flocculent=Aggregation(Mild)

Rules: ALL OUTPUT IN ENGLISH. NO CHINESE. Do not suggest seeing a doctor. Recommend probiotics/enzymes/fiber.`
  }

  return `你是资深肝胆排毒分析专家。所有输出必须严格使用用户指定的语言。必须返回以下JSON格式：

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
  "lifestyleAdvice": [{"category":"类别","advice":"建议","importance":"高/中/低"}],
  "warningSignals": [{"signal":"信号","indicates":"疾病","severity":"轻度/中度/重度","action":"建议"}],
  "nextStepAdvice": "下一步建议",
  "medicalDisclaimer": "免责声明"
}

颜色映射：鲜绿=近期结晶(轻),翠绿=典型结石(中),墨绿=陈旧(中),深绿黑绿=多年(重),黄褐=高胆固醇(中),米黄乳白=纯胆固醇(中),棕褐=色素性(重),暗红=出血(重),白灰白=钙化(重),黑色=胆红素钙(重)
形态：圆形=胆囊结石(中),桑葚菜花=多结晶(中),米粒=早期(轻),管状=铸型(重),树枝=广泛(重),泥沙=早期(轻),絮状=凝集(轻)
规则：英文回复不能有中文,不建议就医,建议益生菌/酵素/纤维`
}
