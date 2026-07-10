/**
 * 肝胆排毒 - 饮食建议与生活方式知识库
 * 饮食建议以豆类植物蛋白为核心，不推荐蛋奶制品
 */

// ============ 饮食建议 ============
export interface DietAdviceEntry {
  category: string
  categoryEn: string
  items: string[]
  reason: string
  reasonEn: string
  targetConditions: string[]
}

export const DIET_ADVICE_CATALOG: DietAdviceEntry[] = [
  {
    category: '排石期间饮食',
    categoryEn: 'During Flush Diet',
    items: [
      '每日饮用1000ml新鲜苹果汁，分4-5次，下午5点前喝完',
      '以蔬菜、水果、全谷物、豆类为主的清淡纯素饮食',
      '所有食物温热食用，避免生冷',
    ],
    reason: '苹果酸软化结石，植物性饮食降低胆固醇摄入，温热食物促进胆汁流动',
    reasonEn: 'Malic acid softens stones, plant-based diet reduces cholesterol intake, warm food promotes bile flow',
    targetConditions: ['胆囊结石', '肝内胆管结石', '胆固醇代谢异常'],
  },
  {
    category: '植物蛋白核心推荐',
    categoryEn: 'Plant Protein Core Recommendations',
    items: [
      '黄豆及制品：豆腐、豆浆、腐竹、豆皮、纳豆',
      '杂豆类：扁豆、鹰嘴豆、黑豆、绿豆、红豆、芸豆',
      '发酵豆制品：天贝、味噌、纳豆（益生菌丰富）',
      '坚果种子：核桃、亚麻籽、奇亚籽、南瓜籽（每日一小把）',
      '全谷物：藜麦、糙米、燕麦、荞麦、小米',
    ],
    reason: '植物蛋白零胆固醇，富含膳食纤维和植物化学物，有助于降低胆汁胆固醇饱和度，发酵豆制品含益生菌促进肠道健康',
    reasonEn: 'Plant protein has zero cholesterol, rich in fiber and phytochemicals, fermented soy products contain probiotics',
    targetConditions: ['高胆固醇血症', '脂肪肝', '胆囊结石', '代谢综合征'],
  },
  {
    category: '日常护肝饮食',
    categoryEn: 'Daily Liver-Protective Diet',
    items: [
      '多吃十字花科蔬菜：西兰花、卷心菜、羽衣甘蓝',
      '每日摄入大蒜2-3瓣和姜黄1-2g',
      '豆类蔬菜汤：红豆薏米汤、绿豆百合汤',
      '以全谷物替代精制碳水',
      '每日饮用2-3杯绿茶或蒲公英茶',
    ],
    reason: '十字花科蔬菜激活肝脏解毒酶，姜黄素抗炎利胆，豆类汤品利尿排毒',
    reasonEn: 'Cruciferous vegetables activate liver detox enzymes, curcumin is anti-inflammatory and choleretic',
    targetConditions: ['脂肪肝', '肝功能异常', '代谢综合征'],
  },
  {
    category: '每日餐盘构成',
    categoryEn: 'Daily Plate Composition',
    items: [
      '早餐：豆浆/杂豆粥 + 全麦馒头/燕麦 + 时令水果',
      '午餐：杂粮饭 + 1份豆制品主菜（麻婆豆腐/素炒豆干/天贝炒时蔬）+ 2份清炒时蔬',
      '晚餐：五谷杂粮粥 + 蒸蔬菜 + 凉拌豆腐/纳豆',
      '加餐：鹰嘴豆泥配蔬菜条、黑豆茶、蒸毛豆',
    ],
    reason: '三餐均衡分配，以豆制品为核心蛋白来源，避免动物蛋白增加胆汁胆固醇浓度',
    reasonEn: 'Balanced meals with soy as core protein, avoiding animal protein that increases bile cholesterol',
    targetConditions: ['肥胖', '高胆固醇血症', '消化不良'],
  },
  {
    category: '禁忌与避免食物',
    categoryEn: 'Foods to Avoid',
    items: [
      '所有蛋类：鸡蛋、鸭蛋、鹌鹑蛋、蛋黄（高胆固醇）',
      '所有奶制品：牛奶、奶酪、酸奶、黄油、奶油、冰淇淋',
      '动物内脏、肥肉、虾蟹（高胆固醇和饱和脂肪）',
      '油炸食品、烘焙糕点、人造奶油（反式脂肪）',
      '酒精（直接肝毒性）',
      '碳酸饮料、冷饮（影响胆汁温度与流动性）',
    ],
    reason: '蛋类和奶制品胆固醇含量高，增加胆汁胆固醇饱和度，促进结石形成；酒精直接损伤肝细胞',
    reasonEn: 'Eggs and dairy are high in cholesterol, increasing bile cholesterol saturation; alcohol is hepatotoxic',
    targetConditions: ['高胆固醇血症', '脂肪肝', '胆囊结石', '酒精性肝损伤'],
  },
]

// ============ 生活方式建议 ============
export interface LifestyleAdviceEntry {
  category: string
  categoryEn: string
  advice: string
  adviceEn: string
  importance: '高' | '中' | '低'
  targetConditions: string[]
}

export const LIFESTYLE_ADVICE_CATALOG: LifestyleAdviceEntry[] = [
  {
    category: '作息调整',
    categoryEn: 'Sleep Schedule',
    advice: '晚上11点前入睡，保证肝胆在子时(23:00-01:00)和丑时(01:00-03:00)充分修复与排毒，每日睡眠7-8小时',
    adviceEn: 'Sleep before 11 PM to ensure liver repair during peak detox hours. Get 7-8 hours of sleep daily',
    importance: '高',
    targetConditions: ['慢性疲劳', '肝功能异常', '失眠'],
  },
  {
    category: '运动建议',
    categoryEn: 'Exercise',
    advice: '每周进行150分钟中等强度有氧运动（快走、游泳、骑行），配合瑜伽扭转体式促进胆汁流动',
    adviceEn: '150 min/week moderate aerobic exercise, plus yoga twists to promote bile flow',
    importance: '中',
    targetConditions: ['肥胖', '脂肪肝', '代谢综合征'],
  },
  {
    category: '情绪管理',
    categoryEn: 'Emotional Wellness',
    advice: '肝主疏泄，情志不畅伤肝。练习深呼吸、冥想或太极，每周至少3次，每次15-20分钟',
    adviceEn: 'Practice deep breathing, meditation, or tai chi at least 3 times/week. Emotional stress directly impacts liver function',
    importance: '高',
    targetConditions: ['情绪波动', '偏头痛', '经前综合征'],
  },
  {
    category: '饮水管理',
    categoryEn: 'Hydration',
    advice: '每日温水2000-3000ml，晨起300-500ml柠檬温水，少量多次饮用，避免一次性大量饮水',
    adviceEn: '2000-3000ml warm water daily, 300-500ml warm lemon water upon waking. Sip throughout the day',
    importance: '中',
    targetConditions: ['胆汁浓缩', '便秘', '肾结石风险'],
  },
]

// ============ 警告信号知识库 ============
export interface WarningSignalEntry {
  signal: string
  signalEn: string
  indicates: string
  indicatesEn: string
  severity: '轻度' | '中度' | '重度'
  severityEn: 'Mild' | 'Moderate' | 'Severe'
  action: string
  actionEn: string
}

export const WARNING_SIGNALS: WarningSignalEntry[] = [
  {
    signal: '右上腹剧烈疼痛', signalEn: 'Severe right upper quadrant pain',
    indicates: '急性胆囊炎或胆道梗阻', indicatesEn: 'Acute cholecystitis or biliary obstruction',
    severity: '重度', severityEn: 'Severe',
    action: '立即停止排石，休息观察，若持续不缓解请重视身体状况', actionEn: 'Stop flush immediately, rest and observe. Pay close attention to your body if symptoms persist',
  },
  {
    signal: '皮肤或眼白发黄', signalEn: 'Yellowing of skin or eyes (jaundice)',
    indicates: '胆道堵塞导致胆红素逆流入血', indicatesEn: 'Bile duct obstruction causing bilirubin reflux',
    severity: '重度', severityEn: 'Severe',
    action: '暂停排石，大量饮水，密切观察身体变化', actionEn: 'Pause flush, drink plenty of water, monitor your body closely',
  },
  {
    signal: '发热超过38.5°C', signalEn: 'Fever above 38.5°C',
    indicates: '可能胆道感染或胆管炎', indicatesEn: 'Possible biliary infection or cholangitis',
    severity: '重度', severityEn: 'Severe',
    action: '暂停排石，充分休息，补充温水并持续观察体温变化', actionEn: 'Pause flush, rest well, drink warm water and monitor temperature changes',
  },
  {
    signal: '持续性恶心呕吐', signalEn: 'Persistent nausea and vomiting',
    indicates: '排石反应过强或胆道刺激', indicatesEn: 'Excessive flush reaction or biliary irritation',
    severity: '中度', severityEn: 'Moderate',
    action: '暂停排石，补充电解质，观察症状', actionEn: 'Pause flush, replenish electrolytes, monitor symptoms',
  },
  {
    signal: '排出物中含鲜红血液', signalEn: 'Bright red blood in discharge',
    indicates: '消化道出血或胆道黏膜损伤', indicatesEn: 'Gastrointestinal bleeding or biliary mucosal injury',
    severity: '重度', severityEn: 'Severe',
    action: '立即停止排石，安静休息，密切注意排出物颜色变化', actionEn: 'Stop flush immediately, rest quietly, monitor discharge color changes closely',
  },
]

// ============ 30天饮食计划模板 ============
export const MONTHLY_DIET_TEMPLATE = {
  weeks: [
    {
      name: '第一周：清肝排毒启动',
      theme: '以苹果汁排毒为主，辅助清淡豆类素食',
      breakfast: ['温豆浆 300ml + 全麦馒头1个', '红豆薏米粥 + 蒸红薯', '燕麦片 + 核桃碎 + 蓝莓'],
      lunch: ['麻婆豆腐 + 糙米饭 + 清炒西兰花', '天贝炒青椒 + 杂粮饭 + 紫菜汤', '红烧素鸡 + 藜麦饭 + 蒸南瓜'],
      dinner: ['五谷杂粮粥 + 凉拌海带丝 + 纳豆', '蒸蔬菜拼盘 + 豆腐味噌汤', '扁豆蔬菜汤 + 全麦面包'],
    },
    {
      name: '第二周：深度净化',
      theme: '强化豆类摄入，增加发酵食品',
      breakfast: ['黑豆浆 + 蒸山药 + 红枣', '绿豆百合粥 + 核桃', '南瓜小米粥 + 煮毛豆'],
      lunch: ['鹰嘴豆咖喱 + 糙米饭 + 凉拌黄瓜', '豆腐蘑菇煲 + 藜麦饭 + 蒸胡萝卜', '黑豆玉米沙拉 + 烤红薯'],
      dinner: ['冬瓜薏仁汤 + 清蒸豆腐', '蔬菜豆皮卷 + 紫薯粥', '纳豆拌饭 + 味噌汤 + 焯菠菜'],
    },
    {
      name: '第三周：修复强化',
      theme: '多种豆类轮换，增加抗氧化食物',
      breakfast: ['红豆花生糊 + 全麦面包', '蒸芋头 + 温豆浆 + 枸杞', '薏仁山药粥 + 核桃碎'],
      lunch: ['芸豆炖南瓜 + 糙米饭', '腐竹烧木耳 + 小米饭 + 蒸西兰花', '毛豆仁炒香菇 + 紫米饭'],
      dinner: ['豆腐裙带菜汤 + 蒸玉米', '扁豆番茄浓汤 + 全麦饼', '天贝沙拉 + 鹰嘴豆泥 + 蔬菜条'],
    },
    {
      name: '第四周：巩固调理',
      theme: '均衡搭配，建立长期健康饮食习惯',
      breakfast: ['综合豆粥（红豆绿豆黑豆）+ 蒸红薯', '豆浆燕麦糊 + 亚麻籽粉', '蒸山药 + 红枣枸杞茶'],
      lunch: ['五香豆干炒时蔬 + 糙米饭 + 海带汤', '什锦豆煲（鹰嘴豆+芸豆+扁豆）+ 藜麦饭', '素炒三丝（豆皮+胡萝卜+芹菜）+ 小米饭'],
      dinner: ['冬瓜豆腐汤 + 蒸南瓜 + 纳豆', '紫薯粥 + 凉拌三丝 + 毛豆', '杂粮粥 + 蒸蔬菜 + 豆腐乳'],
    },
  ],
}
