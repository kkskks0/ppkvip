/**
 * 肝胆排毒 - 颜色分类知识库
 * 基于《神奇的肝胆排石法》(Andreas Moritz) 及中医肝胆理论
 */

export interface ColorEntry {
  name: string
  nameEn: string
  hexColor: string
  r: number
  g: number
  b: number
  formationTime: string
  formationTimeEn: string
  interpretation: string
  interpretationEn: string
  severity: 'Mild' | 'Moderate' | 'Severe'
  composition: string
  relatedConditions: string[]
}

export const COLOR_CATALOG: ColorEntry[] = [
  {
    name: '鲜绿色',
    nameEn: 'Bright Green',
    hexColor: '#4CAF50',
    r: 76, g: 175, b: 80,
    formationTime: '近几周至几个月',
    formationTimeEn: 'Weeks to months',
    interpretation: '近期形成的胆固醇结石，表面覆盖新鲜胆汁，属较新的排出物，提示肝胆系统近期产生较多胆固醇结晶',
    interpretationEn: 'Recently formed cholesterol stones covered with fresh bile. Indicates recent cholesterol crystallization in the hepatobiliary system',
    severity: 'Mild',
    composition: '胆固醇性结石 (胆固醇>70%)',
    relatedConditions: ['轻度胆汁淤积', '胆固醇代谢异常'],
  },
  {
    name: '翠绿色',
    nameEn: 'Emerald Green',
    hexColor: '#2E7D32',
    r: 46, g: 125, b: 50,
    formationTime: '几个月至一年',
    formationTimeEn: 'Months to 1 year',
    interpretation: '典型的胆固醇性结石，最常见类型，数量通常最多，说明肝胆系统存在持续的胆固醇过饱和现象',
    interpretationEn: 'Typical cholesterol stones, the most common type, usually present in the largest quantity. Indicates persistent cholesterol supersaturation',
    severity: 'Moderate',
    composition: '胆固醇性结石',
    relatedConditions: ['胆固醇代谢异常', '脂肪肝', '慢性胆囊炎'],
  },
  {
    name: '墨绿色',
    nameEn: 'Dark Green',
    hexColor: '#1B5E20',
    r: 27, g: 94, b: 32,
    formationTime: '一年以上',
    formationTimeEn: 'Over 1 year',
    interpretation: '较为陈旧的结石，胆汁色素已氧化，形成时间较长，提示肝胆排毒功能长期受限',
    interpretationEn: 'Older stones with oxidized bile pigments. Indicates long-term hepatobiliary detoxification impairment',
    severity: 'Moderate',
    composition: '胆固醇性结石 + 胆红素氧化产物',
    relatedConditions: ['肝内胆管结石', '慢性胆汁淤积', '肝功能异常'],
  },
  {
    name: '深绿至黑绿色',
    nameEn: 'Deep/Dark Green',
    hexColor: '#0D3B18',
    r: 13, g: 59, b: 24,
    formationTime: '数年',
    formationTimeEn: 'Several years',
    interpretation: '非常陈旧的结石，高度氧化，质地较硬，说明肝胆系统长期处于亚健康状态，结石可能在体内存在多年',
    interpretationEn: 'Very old, heavily oxidized, hard stones. Indicates years of suboptimal hepatobiliary health',
    severity: 'Severe',
    composition: '陈旧胆固醇性结石 + 高度氧化胆色素',
    relatedConditions: ['重度胆汁淤积', '慢性肝炎', '肝硬化前兆'],
  },
  {
    name: '黄褐色',
    nameEn: 'Yellow-Brown',
    hexColor: '#D4A017',
    r: 212, g: 160, b: 23,
    formationTime: '不定',
    formationTimeEn: 'Variable',
    interpretation: '胆固醇含量极高的结石，通常密度较大，易下沉，与高脂饮食密切相关',
    interpretationEn: 'Extremely high cholesterol content stones, usually dense and sinkable. Closely related to high-fat diet',
    severity: 'Moderate',
    composition: '纯胆固醇结石 (>90%胆固醇)',
    relatedConditions: ['高胆固醇血症', '非酒精性脂肪肝', '代谢综合征'],
  },
  {
    name: '米黄色/乳白色',
    nameEn: 'Beige/Creamy White',
    hexColor: '#F5DEB3',
    r: 245, g: 222, b: 179,
    formationTime: '较长时间',
    formationTimeEn: 'Extended period',
    interpretation: '以胆固醇为主的纯胆固醇性结石，属陈年结石，质地较软或蜡状，通常浮于水面',
    interpretationEn: 'Pure cholesterol stones, old and soft/waxy in texture. Usually float on water',
    severity: 'Moderate',
    composition: '纯胆固醇性结石',
    relatedConditions: ['长期高脂饮食', '胆汁酸代谢异常', '肥胖'],
  },
  {
    name: '棕褐色',
    nameEn: 'Dark Brown',
    hexColor: '#6D4C41',
    r: 109, g: 76, b: 65,
    formationTime: '较长时间',
    formationTimeEn: 'Extended period',
    interpretation: '含胆红素较多的色素性结石，常与胆汁淤积相关，可能下沉或悬浮于水中',
    interpretationEn: 'Pigment stones with high bilirubin content. Often associated with bile stasis, may sink or suspend',
    severity: 'Severe',
    composition: '胆红素性结石',
    relatedConditions: ['胆道感染', '溶血性贫血', '胆汁淤积性肝病'],
  },
  {
    name: '暗红色/红褐色',
    nameEn: 'Dark Red/Red-Brown',
    hexColor: '#8B0000',
    r: 139, g: 0, b: 0,
    formationTime: '不定',
    formationTimeEn: 'Variable',
    interpretation: '含血液成分的结石，提示可能有微小的胆道出血或胆道黏膜损伤',
    interpretationEn: 'Blood-containing stones, suggesting possible minor bile duct hemorrhage or mucosal injury',
    severity: 'Severe',
    composition: '混合性结石 + 血液成分',
    relatedConditions: ['胆道出血', '胆管炎', '胆囊息肉可能'],
  },
  {
    name: '白色/灰白色',
    nameEn: 'White/Grayish White',
    hexColor: '#E0E0E0',
    r: 224, g: 224, b: 224,
    formationTime: '长期',
    formationTimeEn: 'Long-term',
    interpretation: '高度钙化的结石或纯胆固醇核心，最陈旧的结石类型，质地坚硬，不易排出',
    interpretationEn: 'Heavily calcified stones or pure cholesterol cores, the oldest stone type. Hard texture, difficult to expel',
    severity: 'Severe',
    composition: '钙化性结石核心',
    relatedConditions: ['长期慢性胆囊炎', '胆囊壁钙化', '肝功能减退'],
  },
  {
    name: '黑色',
    nameEn: 'Black',
    hexColor: '#1A1A1A',
    r: 26, g: 26, b: 26,
    formationTime: '长期',
    formationTimeEn: 'Long-term',
    interpretation: '胆红素钙结石，质地坚硬，常见于肝内胆管，是较为严重的结石类型',
    interpretationEn: 'Calcium bilirubinate stones, hard texture, commonly found in intrahepatic bile ducts. A more serious stone type',
    severity: 'Severe',
    composition: '胆红素钙结石',
    relatedConditions: ['肝内胆管结石症', '原发性硬化性胆管炎', '慢性肝病'],
  },
]

// 颜色索引映射
export const COLOR_INDEX: Map<string, ColorEntry> = new Map(
  COLOR_CATALOG.map(c => [c.name, c])
)

// 按严重度分组
export const COLORS_BY_SEVERITY = {
  Mild: COLOR_CATALOG.filter(c => c.severity === 'Mild'),
  Moderate: COLOR_CATALOG.filter(c => c.severity === 'Moderate'),
  Severe: COLOR_CATALOG.filter(c => c.severity === 'Severe'),
}

// 颜色→RGB距离计算（用于模糊匹配AI返回的颜色）
export function findClosestColor(hexOrName: string): ColorEntry | null {
  // 先精确匹配名称
  const byName = COLOR_INDEX.get(hexOrName)
  if (byName) return byName

  // 尝试 hex 匹配
  if (hexOrName.startsWith('#')) {
    const hex = hexOrName.toUpperCase()
    const byHex = COLOR_CATALOG.find(c => c.hexColor.toUpperCase() === hex)
    if (byHex) return byHex

    // RGB距离匹配
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    let minDist = Infinity
    let closest: ColorEntry | null = null
    for (const c of COLOR_CATALOG) {
      const dist = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2)
      if (dist < minDist) { minDist = dist; closest = c }
    }
    return closest
  }

  // 模糊名称匹配（包含即可）
  const fuzzy = COLOR_CATALOG.find(c => c.name.includes(hexOrName) || hexOrName.includes(c.name))
  return fuzzy || null
}
