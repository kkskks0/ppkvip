/**
 * 肝胆排毒 - 形态/大小/质地/成分/排出模式知识库
 */

// ============ 形态分类 ============
export interface ShapeEntry {
  type: string
  typeEn: string
  description: string
  significance: string
  relatedConditions: string[]
  severity: 'Mild' | 'Moderate' | 'Severe'
}

export const SHAPE_CATALOG: ShapeEntry[] = [
  {
    type: '豌豆状圆形', typeEn: 'Pea-shaped Round',
    description: '表面光滑，圆形或椭圆形，单颗边界清晰',
    significance: '典型的胆囊胆固醇结石，长期在胆汁中滚动摩擦形成光滑表面',
    relatedConditions: ['慢性胆囊炎', '胆囊结石症'],
    severity: 'Moderate',
  },
  {
    type: '桑葚状/菜花状', typeEn: 'Mulberry/Cauliflower',
    description: '表面凹凸不平，多面体或多瓣状，呈簇状聚集',
    significance: '多个小结晶聚集而成的复合结石，说明结晶过程活跃',
    relatedConditions: ['多发性胆囊结石', '胆固醇过饱和'],
    severity: 'Moderate',
  },
  {
    type: '米粒状', typeEn: 'Rice-grain Shaped',
    description: '细小颗粒状，直径1-3mm，数量通常较多',
    significance: '早期形成的胆固醇结晶，处于结石形成初期阶段',
    relatedConditions: ['早期胆固醇代谢异常', '轻度胆汁淤积'],
    severity: 'Mild',
  },
  {
    type: '管状/圆柱状', typeEn: 'Tubular/Cylindrical',
    description: '细长圆柱形，两端圆钝，长度5-20mm',
    significance: '肝内胆管的铸型结石，说明曾有胆管堵塞，排出后胆管恢复通畅',
    relatedConditions: ['肝内胆管堵塞', '胆管炎', '胆汁淤积'],
    severity: 'Severe',
  },
  {
    type: '树枝状', typeEn: 'Branch-shaped',
    description: '分叉状，形似树枝分岔，可多级分支',
    significance: '胆管分支的完整铸型，说明结石形成范围广泛，涉及多级胆管',
    relatedConditions: ['广泛性肝内胆管结石', '胆管扩张', '慢性肝病'],
    severity: 'Severe',
  },
  {
    type: '泥沙状', typeEn: 'Sandy/Silt-like',
    description: '极细小的颗粒，均匀分布，无固定形态',
    significance: '尚未凝结的胆固醇结晶，处于早期结石状态，易排出',
    relatedConditions: ['胆固醇代谢早期异常', '胆汁稀释'],
    severity: 'Mild',
  },
  {
    type: '絮状/棉絮状', typeEn: 'Flocculent/Cotton-like',
    description: '松软蓬松，密度低，漂浮于水面',
    significance: '胆汁中的胆固醇絮状凝集物，结构松散，尚未形成固态',
    relatedConditions: ['胆汁成分异常', '轻度胆固醇沉积'],
    severity: 'Mild',
  },
  {
    type: '碎片状', typeEn: 'Fragmented',
    description: '不规则形状，边缘锐利，大小不一',
    significance: '较大结石在排出过程中破碎形成，说明排石过程有效',
    relatedConditions: ['胆结石排出中', '胆道压力变化'],
    severity: 'Moderate',
  },
  {
    type: '片状/薄片状', typeEn: 'Flake/Thin-sheet',
    description: '扁平薄片，厚度<1mm，面积较大',
    significance: '胆管壁上的胆固醇沉积物脱落形成',
    relatedConditions: ['胆管壁胆固醇沉积', '胆道黏膜损伤'],
    severity: 'Moderate',
  },
  {
    type: '泥状/糊状', typeEn: 'Pasty/Mud-like',
    description: '无固定形状，糊状，水分含量高',
    significance: '软性结石团块，形成初期阶段，胆固醇与胆汁混合不充分',
    relatedConditions: ['胆汁过浓', '饮水不足', '代谢减缓'],
    severity: 'Mild',
  },
  {
    type: '结晶状', typeEn: 'Crystalline',
    description: '闪光的晶体颗粒，有光泽，可见反光',
    significance: '纯净的胆固醇结晶，结晶度高，结构紧密',
    relatedConditions: ['高浓度胆固醇胆汁', '结晶核心形成'],
    severity: 'Moderate',
  },
]

// ============ 大小分类 ============
export interface SizeEntry {
  category: string
  categoryEn: string
  rangeMm: string
  minMm: number
  maxMm: number
  significance: string
}

export const SIZE_CATALOG: SizeEntry[] = [
  { category: '微细型', categoryEn: 'Micro-fine', rangeMm: '<1mm', minMm: 0, maxMm: 1, significance: '早期结晶颗粒，处于结石形成最初阶段' },
  { category: '细沙型', categoryEn: 'Fine-sand', rangeMm: '1-2mm', minMm: 1, maxMm: 2, significance: '分散的细小结晶体，数量多但易排出' },
  { category: '米粒型', categoryEn: 'Rice-grain', rangeMm: '2-4mm', minMm: 2, maxMm: 4, significance: '可见成型结石，需要关注胆固醇代谢' },
  { category: '豌豆型', categoryEn: 'Pea-sized', rangeMm: '4-7mm', minMm: 4, maxMm: 7, significance: '中等大小，胆囊颈部嵌顿风险增加' },
  { category: '黄豆型', categoryEn: 'Soybean-sized', rangeMm: '7-10mm', minMm: 7, maxMm: 10, significance: '较大结石，可能影响胆道功能' },
  { category: '花生型', categoryEn: 'Peanut-sized', rangeMm: '10-15mm', minMm: 10, maxMm: 15, significance: '大型结石，需密切关注胆道通畅性' },
  { category: '蚕豆型', categoryEn: 'Broad-bean-sized', rangeMm: '>15mm', minMm: 15, maxMm: Infinity, significance: '巨型结石，建议医疗干预评估' },
]

// ============ 质地分类 ============
export interface TextureEntry {
  type: string
  typeEn: string
  description: string
  composition: string
  conditions: string[]
}

export const TEXTURE_CATALOG: TextureEntry[] = [
  { type: '软质', typeEn: 'Soft', description: '柔软有弹性，按压即碎', composition: '胆固醇为主，水分含量高', conditions: ['近期形成结石', '高水含量胆汁'] },
  { type: '蜡质', typeEn: 'Waxy', description: '有韧性，不易捏碎', composition: '胆固醇高度浓缩，含少量钙', conditions: ['陈年胆固醇结石', '浓缩胆汁'] },
  { type: '硬质', typeEn: 'Hard', description: '硬实，捏压有显著阻力', composition: '含较多钙质和胆红素', conditions: ['钙化性结石', '慢性胆囊炎'] },
  { type: '脆质', typeEn: 'Brittle', description: '轻压即碎裂，内部干燥', composition: '胆固醇结晶含量高，结构松散', conditions: ['纯胆固醇结石', '长期脱水'] },
  { type: '油质', typeEn: 'Oily', description: '滑腻，手指有油光残留', composition: '纯胆固醇结晶，尚未硬化', conditions: ['高胆固醇胆汁', '脂质代谢异常'] },
  { type: '海绵质', typeEn: 'Spongy', description: '轻软，浮力大，内部多孔', composition: '胆汁泡沫凝结而成', conditions: ['胆汁泡沫化', '胆道气体异常'] },
  { type: '泥浆质', typeEn: 'Sludgy', description: '有流动感，半固态', composition: '胆汁中的胆固醇微结晶', conditions: ['胆汁淤积早期', '胆汁流动性差'] },
]

// ============ 成分分类 ============
export interface CompositionEntry {
  type: string
  typeEn: string
  percentage: string
  characteristics: string
  confidence: '高' | '中' | '低'
}

export const COMPOSITION_CATALOG: CompositionEntry[] = [
  { type: '胆固醇性结石', typeEn: 'Cholesterol Stones', percentage: '80-90%', characteristics: '黄绿色至墨绿色，浮于水面，胆固醇>70%', confidence: '高' },
  { type: '胆红素性结石', typeEn: 'Bilirubin Stones', percentage: '5-10%', characteristics: '棕褐色至黑色，可能下沉或悬浮', confidence: '中' },
  { type: '混合性结石', typeEn: 'Mixed Stones', percentage: '5-15%', characteristics: '土黄色至棕褐色，胆固醇+胆红素+钙盐', confidence: '中' },
  { type: '胆汁结晶微团', typeEn: 'Bile Crystal Micelles', percentage: '不定', characteristics: '泥沙状/絮状，胆固醇微结晶+胆汁酸', confidence: '低' },
  { type: '胆管铸型', typeEn: 'Bile Duct Cast', percentage: '不定', characteristics: '管状或树枝状，墨绿色，含黏蛋白', confidence: '中' },
  { type: '钙化性结石核心', typeEn: 'Calcified Stone Core', percentage: '罕见', characteristics: '白色或灰白色，碳酸钙+磷酸钙，质地坚硬', confidence: '高' },
  { type: '黏液管型', typeEn: 'Mucus Cast', percentage: '不定', characteristics: '半透明或浅绿色条状物，含少量胆固醇', confidence: '低' },
]

// ============ 排出模式 ============
export interface PatternEntry {
  type: string
  typeEn: string
  description: string
  significance: string
  riskLevel: '低' | '中' | '高'
}

export const PATTERN_CATALOG: PatternEntry[] = [
  { type: '模式一：大量鲜绿色碎石', typeEn: 'Pattern 1: Abundant bright green fragments',
    description: '大量鲜绿色碎块，色泽鲜艳', significance: '肝胆系统中近期形成了大量胆固醇结晶，结晶过程活跃', riskLevel: '低' },
  { type: '模式二：大量墨绿色管状铸型', typeEn: 'Pattern 2: Abundant dark green tubular casts',
    description: '大量墨绿色管状或树枝状结构', significance: '肝内胆管被严重堵塞，铸型表明胆管已开始清理', riskLevel: '高' },
  { type: '模式三：白色核心+绿色外壳', typeEn: 'Pattern 3: White core + green shell',
    description: '结石中心为白色/灰白色，外围绿色', significance: '陈年的胆固醇核心+近期包裹的胆汁层，形成时间跨度大', riskLevel: '中' },
  { type: '模式四：大量泥沙状物', typeEn: 'Pattern 4: Abundant sandy material',
    description: '大量细小泥沙状颗粒', significance: '结石处于早期结晶阶段，是排石的好时机', riskLevel: '低' },
  { type: '模式五：混合颜色和形态', typeEn: 'Pattern 5: Mixed colors and shapes',
    description: '多种颜色、多种形态的结石混合', significance: '结石形成于不同时期，分布广泛，需多次排石', riskLevel: '中' },
  { type: '模式六：排出物稀少', typeEn: 'Pattern 6: Sparse discharge',
    description: '排出物数量少，形态单一', significance: '准备不足或肝胆系统相对干净，也可能是排石效果不理想', riskLevel: '低' },
]

// ============ 性别差异化数据 ============
export interface GenderRiskEntry {
  gender: 'male' | 'female' | 'all'
  condition: string
  description: string
}

export const GENDER_SPECIFIC_RISKS: GenderRiskEntry[] = [
  { gender: 'female', condition: '经前综合征加重', description: '肝胆排毒功能下降可加重经前乳房胀痛、情绪波动等症状' },
  { gender: 'female', condition: '胆囊疾病高发', description: '女性（尤其经产妇）胆结石发病率是男性的2-3倍' },
  { gender: 'female', condition: '妊娠期肝胆负荷', description: '妊娠期雌激素升高促进胆固醇分泌，增加结石风险' },
  { gender: 'male', condition: '酒精性肝损伤', description: '男性饮酒率更高，酒精加重肝脏解毒负担' },
  { gender: 'male', condition: '非酒精性脂肪肝', description: '男性内脏脂肪堆积更常见，脂肪肝发病率高于女性' },
  { gender: 'all', condition: '代谢综合征', description: '高血脂、高血糖、肥胖的复合风险因素' },
]
