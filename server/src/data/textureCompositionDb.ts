/**
 * 质地与成分本地知识库（增强版）
 *
 * 数据来源：
 * - 标准医学教科书（胆石症分类学）
 * - The Systematic Classification of Gallbladder Stones (PLOS ONE, 2013)
 * - Nature Reviews Disease Primers: Gallstones (2016)
 * - 中国胆石病临床诊疗指南
 *
 * 硬性约束：
 * - 系统仅基于此数据库中的已知信息进行回答
 * - 当数据不在数据库中时，标记为无效，前端隐藏相关区域
 * - 绝对禁止生成任何推测性或"未知"的兜底回复
 */

// ==================== 已知质地类型（15种，覆盖临床全部类型） ====================

export interface TextureEntry {
  type: string
  typeEn: string
  description: string
  visualCues: string[]
  /** 内部切面特征（若有切面可观察） */
  crossSectionCues: string[]
  severityLevel: '轻' | '中' | '重'
  relatedCompositions: string[]
  /** 典型关联颜色（HEX） */
  typicalColors: string[]
  clinicalNotes: string
}

export const KNOWN_TEXTURES: TextureEntry[] = [
  {
    type: '光滑',
    typeEn: 'Smooth',
    description: '表面均匀平整，无明显颗粒感，反光性较强，触感如抛光卵石',
    visualCues: ['表面反光均匀', '边缘整齐平滑', '卵石样外观', '无凹凸纹理', '颜色均匀一致'],
    crossSectionCues: ['放射状结晶排列', '中心可见深色核心', '车轮辐条样结构'],
    severityLevel: '中',
    relatedCompositions: ['胆固醇性结石', '混合性结石'],
    typicalColors: ['#8BC34A', '#CDDC39', '#FFEB3B'],
    clinicalNotes: '光滑表面通常表示纯胆固醇结石或胆固醇为主混合结石，在胆囊内长期翻滚打磨形成。单发大结石多见，剖面可见放射状胆固醇结晶',
  },
  {
    type: '粗糙',
    typeEn: 'Rough',
    description: '表面不平整，有明显凹凸感和颗粒突起，触感如砂纸',
    visualCues: ['表面不规则凹凸', '颜色深浅不一有斑驳感', '边缘不整齐呈锯齿状', '可见细小颗粒或刺状突起', '无光泽或哑光质感'],
    crossSectionCues: ['不均匀结构', '可见钙化斑点', '无明显放射状纹理'],
    severityLevel: '中',
    relatedCompositions: ['混合性结石', '胆红素钙结石', '草酸钙结石'],
    typicalColors: ['#795548', '#8D6E63', '#4E342E'],
    clinicalNotes: '粗糙表面常见于多成分混合结石、胆色素结石或草酸钙结石。表面刺状突起提示草酸钙成分',
  },
  {
    type: '桑葚样',
    typeEn: 'Mulberry-like',
    description: '表面呈多面体簇状聚集，形似桑葚或菜花，每个小面有独立反光',
    visualCues: ['多面体簇状结构', '各小面有独立反光点', '形似桑葚或黑莓', '边缘呈锯齿状轮廓', '每个凸起直径1-3mm'],
    crossSectionCues: ['多个小核心融合结构', '无明显单一核心'],
    severityLevel: '中',
    relatedCompositions: ['胆固醇性结石', '黑色素结石'],
    typicalColors: ['#3E2723', '#4E342E', '#33691E'],
    clinicalNotes: '桑葚样表面提示多个微小结石聚集融合，或黑色素结石的典型外观。胆固醇结石中表示多发性小结石互相挤压形成',
  },
  {
    type: '蜡质',
    typeEn: 'Waxy',
    description: '表面有蜡样光泽，质地较软，指甲可划出痕迹，触感如蜡烛',
    visualCues: ['蜡样或油脂光泽', '质地柔软有韧性', '指甲可轻松划痕', '颜色均匀偏黄或浅黄', '按压可轻微变形'],
    crossSectionCues: ['均质无结构', '颜色内外一致'],
    severityLevel: '轻',
    relatedCompositions: ['胆固醇性结石', '脂肪酸钙结石'],
    typicalColors: ['#FFEB3B', '#FFF9C4', '#FFECB3'],
    clinicalNotes: '蜡质质地是纯胆固醇结石的典型特征，胆固醇含量通常>90%，属于早期可逆性沉积。此类结石在CT上不显影（透X线阴性结石）',
  },
  {
    type: '泥沙状',
    typeEn: 'Sludge-like',
    description: '极细颗粒松散聚集体，类似湿沙或淤泥，无固定形态，轻压即散',
    visualCues: ['松散颗粒结构无明显粘连', '湿润泥沙或淤泥质感', '颜色偏暗', '轻压即碎散', '颗粒直径<1mm'],
    crossSectionCues: ['无固定内部结构', '颗粒状松散排列'],
    severityLevel: '轻',
    relatedCompositions: ['胆色素沉积', '胆红素钙结石', '胆汁淤渣'],
    typicalColors: ['#795548', '#6D4C41', '#5D4037'],
    clinicalNotes: '泥沙状物质在医学上称为"胆泥"(biliary sludge)，由胆固醇单水结晶+胆红素钙+黏蛋白组成。是肝胆排毒早期的积极信号，饮食调整效果显著',
  },
  {
    type: '絮状',
    typeEn: 'Flocculent',
    description: '松软纤维状或棉絮状结构，质地轻盈蓬松，水中可漂浮',
    visualCues: ['纤维状/棉絮状外观', '质地轻盈松软', '水中易漂浮', '浅色或半透明', '无明显边界'],
    crossSectionCues: ['松散纤维网结构'],
    severityLevel: '轻',
    relatedCompositions: ['粘液栓', '蛋白质基质沉积'],
    typicalColors: ['#ECEFF1', '#FFF8E1', '#E8F5E9'],
    clinicalNotes: '絮状物多为黏蛋白与胆固醇微结晶凝聚，常见于排毒反应初期。黏蛋白是结石形成的"胶水"，排出黏蛋白是阻断结石形成的关键步骤',
  },
  {
    type: '层状',
    typeEn: 'Laminated',
    description: '可见明显分层结构，如同树木年轮，各层颜色和质地可能不同',
    visualCues: ['同心圆层状纹理', '各层颜色深浅交替', '边缘可见分层线', '类似树木年轮外观', '表面可能光滑但内部层次分明'],
    crossSectionCues: ['清晰的同心圆层状结构', '浅色胆固醇层与深色色素层交替', '核心与外壳成分不同'],
    severityLevel: '中',
    relatedCompositions: ['混合性结石', '胆固醇性结石'],
    typicalColors: ['#8D6E63', '#A1887F', '#BCAAA4'],
    clinicalNotes: '层状结构是混合性结石的典型特征，胆固醇层（浅色）与胆色素层（深色）交替沉积，记录了结石形成的不同阶段。类似"年轮"，层数越多形成时间越长',
  },
  {
    type: '片状',
    typeEn: 'Flaky',
    description: '薄片层状结构，可自然剥落分离，边缘不规则，厚度<1mm',
    visualCues: ['薄片状分层', '可逐层剥离', '边缘不规则卷曲', '表面有细纹纹理', '透光可见层次'],
    crossSectionCues: ['平行层状结构', '层间结合松散'],
    severityLevel: '中',
    relatedCompositions: ['胆色素沉积', '碳酸钙结石', '混合性结石'],
    typicalColors: ['#FAFAFA', '#F5F5F5', '#795548'],
    clinicalNotes: '片状结构提示胆汁成分间断性分层沉积，与间歇性胆汁淤积有关。白色片状多为碳酸钙沉积，棕色片状为胆色素沉积',
  },
  {
    type: '块状',
    typeEn: 'Massive',
    description: '大块致密结构，质地坚硬，体积较大（通常>10mm），外形不规则',
    visualCues: ['大块致密外形', '外形不规则有棱角', '质地坚硬无法用手指捏碎', '重量感明显', '可能有钙化外壳'],
    crossSectionCues: ['致密无孔结构', '可能含钙化核心', '多层包裹结构'],
    severityLevel: '重',
    relatedCompositions: ['混合性结石', '胆红素钙结石', '碳酸钙结石'],
    typicalColors: ['#5D4037', '#4E342E', '#8D6E63'],
    clinicalNotes: '块状结构表示长期慢性沉积（数月到数年），通常需要医疗关注。大块结石可能嵌顿胆囊颈部或胆总管，引起急性症状',
  },
  {
    type: '颗粒状',
    typeEn: 'Granular',
    description: '均匀细小的圆球形或近球形颗粒，大小相对一致（1-3mm），有一定硬度',
    visualCues: ['均匀细小颗粒', '大小较为一致', '形状偏圆或椭圆', '有一定硬度不易捏碎', '散在分布或少量聚集'],
    crossSectionCues: ['致密均质', '细小结晶体'],
    severityLevel: '轻',
    relatedCompositions: ['胆固醇性结石', '磷酸钙结石'],
    typicalColors: ['#8BC34A', '#FDD835', '#BDBDBD'],
    clinicalNotes: '颗粒状多为微小结石雏形（<3mm），此阶段通过饮食干预+增加饮水+规律运动可望自行排出或溶解。是最佳干预窗口期',
  },
  {
    type: '凝胶状',
    typeEn: 'Gelatinous',
    description: '半透明果冻状或胶状质地，有弹性，按压可变形并回弹',
    visualCues: ['半透明或乳白外观', '胶状/果冻质感', '有弹性按压可变形', '表面湿润有光泽', '无明显固定形态'],
    crossSectionCues: ['均匀胶状无结构'],
    severityLevel: '轻',
    relatedCompositions: ['粘液栓', '蛋白质基质沉积'],
    typicalColors: ['#ECEFF1', '#FFF8E1', '#E8F5E9'],
    clinicalNotes: '凝胶状是黏蛋白（mucin）过度分泌形成的胶状基质。黏蛋白凝胶是胆固醇结晶析出的"支架"，排出凝胶意味着减少了结石形成的基质。排毒过程中的积极信号',
  },
  {
    type: '脆质',
    typeEn: 'Brittle',
    description: '质地坚硬但脆性大，轻压即碎裂成多块，断面不规则',
    visualCues: ['外观坚硬但轻压即碎', '碎裂后呈不规则小块', '断面不整齐呈贝壳状', '碎块边缘锐利', '干燥无油脂感'],
    crossSectionCues: ['不规则断口', '可见微裂隙', '无韧性结构'],
    severityLevel: '中',
    relatedCompositions: ['胆红素钙结石', '草酸钙结石', '混合性结石'],
    typicalColors: ['#4E342E', '#3E2723', '#6D4C41'],
    clinicalNotes: '脆质常见于胆色素结石（特别是棕色色素结石）和高草酸钙含量的结石。质地脆提示结石含水量低、矿化程度高',
  },
  {
    type: '油质',
    typeEn: 'Oily/Greasy',
    description: '表面滑腻有油光，手指触摸后留油感，类似凝固油脂',
    visualCues: ['油腻光泽', '手指触摸有油滑感', '色偏黄或黄绿', '半透明质感', '质地柔软易变形'],
    crossSectionCues: ['均质脂样结构'],
    severityLevel: '轻',
    relatedCompositions: ['胆固醇性结石', '脂肪酸钙结石'],
    typicalColors: ['#FFEB3B', '#FDD835', '#FFF176'],
    clinicalNotes: '油质是极高胆固醇含量（>95%）的表现，结石尚未硬化，仍处于"软结石"阶段。与高脂饮食和脂质代谢异常密切相关，饮食调整效果显著',
  },
  {
    type: '海绵质',
    typeEn: 'Spongy/Porous',
    description: '质地轻软，浮力大，内部多孔，类似海绵结构，可吸水',
    visualCues: ['多孔疏松结构', '浮力大可漂浮水面', '质地轻盈', '表面粗糙多孔', '颜色偏浅'],
    crossSectionCues: ['蜂窝状多孔结构', '孔洞大小不一'],
    severityLevel: '轻',
    relatedCompositions: ['胆汁淤渣', '蛋白质基质沉积'],
    typicalColors: ['#FFF8E1', '#F5F5DC', '#D7CCC8'],
    clinicalNotes: '海绵质多为胆汁泡沫化或气体混合形成的结构，也可能为蛋白质基质形成的疏松骨架。一般不构成临床风险，但提示胆汁成分异常',
  },
  {
    type: '泥浆质',
    typeEn: 'Pasty/Mud-like',
    description: '半固态糊状，有流动感，类似浓稠泥浆或牙膏，含水分离',
    visualCues: ['糊状半固态', '有流动感', '可塑性类似软泥', '含水分离感', '无固定外形'],
    crossSectionCues: ['无内部结构', '均匀糊状'],
    severityLevel: '轻',
    relatedCompositions: ['胆汁淤渣', '胆色素沉积'],
    typicalColors: ['#8D6E63', '#A1887F', '#6D4C41'],
    clinicalNotes: '泥浆质对应医学上的"胆泥"(biliary sludge)，是胆固醇微结晶+胆红素钙+黏蛋白的混合物。通过增加饮水和改善胆汁流动性可显著改善',
  },
]

// ==================== 已知成分类型（12种，按临床分类学扩展） ====================

export interface CompositionEntry {
  type: string
  typeEn: string
  description: string
  typicalColor: string
  hexColor: string
  hardness: string
  /** 在胆结石中的占比 */
  occurrence: string
  relatedTextures: string[]
  /** 关联的颜色名称（用于AI交叉验证） */
  relatedColors: string[]
  /** X线/CT表现 */
  imagingFeature: string
  /** 主要病因/风险因素 */
  riskFactors: string[]
  clinicalSignificance: string
}

export const KNOWN_COMPOSITIONS: CompositionEntry[] = [
  {
    type: '胆固醇性结石',
    typeEn: 'Cholesterol Stones',
    description: '以胆固醇为主要成分（>70%）的结石，剖面呈放射状结晶排列。纯胆固醇结石胆固醇含量>90%，黄色蜡质',
    typicalColor: '黄绿色/翠绿色/黄白色',
    hexColor: '#8BC34A',
    hardness: '中等偏软（蜡质可指甲划痕）到中等偏硬',
    occurrence: '最常见，占西方人群胆结石的80-85%，中国人群约50-60%',
    relatedTextures: ['光滑', '蜡质', '油质', '颗粒状', '结晶状', '层状'],
    relatedColors: ['鲜绿色', '翠绿色', '米黄色/乳白色', '黄褐色'],
    imagingFeature: 'CT不显影（透X线阴性结石），超声可见强回声伴声影',
    riskFactors: ['高脂饮食', '肥胖', '快速减重', '女性', '多次妊娠', '高雌激素'],
    clinicalSignificance: '胆固醇性结石是最常见的类型，与生活方式密切相关。蜡质软结石阶段可通过饮食调整逆转，硬化后需关注胆道通畅性',
  },
  {
    type: '胆红素钙结石',
    typeEn: 'Calcium Bilirubinate Stones',
    description: '胆红素与钙离子结合形成的沉积物，属于棕色色素结石。质地松脆易碎，剖面呈层状无定形结构，无放射状结晶',
    typicalColor: '棕褐色/黄褐色/深棕色',
    hexColor: '#5D4037',
    hardness: '中等偏软（松脆易碎，手指可捏碎）',
    occurrence: '常见于亚洲人群，约占胆结石的20-30%，与胆道感染密切相关',
    relatedTextures: ['粗糙', '脆质', '泥沙状', '层状', '块状'],
    relatedColors: ['棕褐色', '黄褐色'],
    imagingFeature: '因含钙，CT可部分显影，X线平片约30%可见',
    riskFactors: ['胆道细菌感染', '寄生虫感染', '胆汁淤积', '胆道狭窄'],
    clinicalSignificance: '胆红素钙结石提示胆道存在慢性感染或炎症。不同于胆固醇结石的代谢性成因，其核心驱动因素是感染，需关注胆道卫生和抗炎饮食',
  },
  {
    type: '黑色素结石',
    typeEn: 'Black Pigment Stones',
    description: '以聚合胆红素和无机钙盐（碳酸钙、磷酸钙）为主要成分。小而坚硬，表面光滑呈金属样光泽，剖面均匀致密无层状结构',
    typicalColor: '纯黑色/黑褐色',
    hexColor: '#212121',
    hardness: '极硬（无法用手指捏碎）',
    occurrence: '约占胆结石的5-10%，与溶血性疾病和肝硬化密切相关',
    relatedTextures: ['粗糙', '桑葚样', '颗粒状'],
    relatedColors: ['黑色', '深绿至黑绿色'],
    imagingFeature: '50-75%在X线平片上显影（含钙量高），CT明显高密度',
    riskFactors: ['慢性溶血性贫血', '肝硬化', '镰状细胞病', '遗传性球形红细胞增多症'],
    clinicalSignificance: '黑色素结石是严重肝胆疾病的标志，通常提示存在慢性溶血或肝硬化等基础疾病。此类结石形成于无菌胆汁环境，与胆固醇结石成因完全不同',
  },
  {
    type: '混合性结石',
    typeEn: 'Mixed Stones',
    description: '胆固醇+胆色素+钙盐等多种成分混合。呈多面体形（因子结石相互挤压），剖面呈同心圆层状结构，颜色深浅交替如同树木年轮',
    typicalColor: '多层混杂色（黄白+棕褐交替）',
    hexColor: '#8D6E63',
    hardness: '坚硬偏脆',
    occurrence: '第二常见类型，中国人群占比最高（约40-50%），常为多发性',
    relatedTextures: ['光滑', '层状', '粗糙', '片状', '块状'],
    relatedColors: ['翠绿色', '黄褐色', '棕褐色', '墨绿色'],
    imagingFeature: '因含钙量不同，可为透X线、部分显影或完全显影',
    riskFactors: ['多种代谢异常并存', '长期高脂高糖饮食', '糖尿病', '代谢综合征'],
    clinicalSignificance: '混合性结石成分复杂，提示多种代谢异常并存（脂质+色素+钙代谢均异常）。"年轮"状层数反映结石形成的时间跨度和反复沉积过程。建议系统评估饮食结构和代谢指标',
  },
  {
    type: '胆色素沉积',
    typeEn: 'Bile Pigment Deposit',
    description: '以胆色素为主的松散沉积物，尚未形成致密结石。棕褐色，质地松软如湿泥，含水量高',
    typicalColor: '棕褐色/暗棕色',
    hexColor: '#795548',
    hardness: '松软（轻压即散）',
    occurrence: '常见于胆汁分泌节律异常或轻度胆汁淤积者',
    relatedTextures: ['泥沙状', '泥浆质', '片状'],
    relatedColors: ['棕褐色'],
    imagingFeature: '超声可能不显影或仅见胆泥回声，CT不显影',
    riskFactors: ['饮食不规律', '长时间禁食', '胆汁分泌节律紊乱'],
    clinicalSignificance: '胆色素沉积是胆色素结石的前期阶段，处于可逆期。通过规律饮食、增加膳食纤维和充足饮水可有效改善胆汁流动性，防止进展为致密结石',
  },
  {
    type: '脂肪酸钙结石',
    typeEn: 'Calcium Fatty Acid Stones',
    description: '脂肪酸与钙离子皂化形成的钙皂。白色或浅黄色，质地如软蜡或肥皂，油腻感明显',
    typicalColor: '白色/浅黄色/奶油色',
    hexColor: '#FFF9C4',
    hardness: '较软（类似肥皂硬度）',
    occurrence: '少见，约占3-5%，常见于脂肪吸收不良或胰腺功能不全者',
    relatedTextures: ['蜡质', '油质', '絮状'],
    relatedColors: ['米黄色/乳白色', '白色/灰白色'],
    imagingFeature: 'CT不显影或低密度，超声可能不典型',
    riskFactors: ['高饱和脂肪摄入', '脂肪泻', '胰腺外分泌功能不全', '短肠综合征'],
    clinicalSignificance: '脂肪酸钙结石提示脂肪消化吸收障碍，脂肪酸在肠道内与钙结合形成不溶性钙皂。减少饱和脂肪摄入、增加不饱和脂肪比例是核心干预策略',
  },
  {
    type: '磷酸钙结石',
    typeEn: 'Calcium Phosphate Stones',
    description: '磷酸钙结晶沉积形成的结石，灰白色，质地坚硬，表面常粗糙有颗粒感',
    typicalColor: '灰白色/浅灰色',
    hexColor: '#BDBDBD',
    hardness: '坚硬',
    occurrence: '较少见，约占胆结石的5-8%',
    relatedTextures: ['粗糙', '结晶状', '颗粒状'],
    relatedColors: ['白色/灰白色'],
    imagingFeature: 'X线和CT均显影（不透X线），密度较高',
    riskFactors: ['钙磷代谢异常', '甲状旁腺功能亢进', '维生素D过量'],
    clinicalSignificance: '磷酸钙结石与全身钙磷代谢异常相关，在胆结石中属于特殊类型。建议检查血钙、血磷和甲状旁腺激素水平，排除甲状旁腺功能异常',
  },
  {
    type: '碳酸钙结石',
    typeEn: 'Calcium Carbonate Stones',
    description: '碳酸钙沉积物，白色坚硬，表面呈白垩质或粉笔质感，有时呈石灰样外观',
    typicalColor: '白色/白垩色/灰白色',
    hexColor: '#FAFAFA',
    hardness: '极硬（类似石灰石硬度）',
    occurrence: '罕见，约占2-3%，常见于长期慢性胆囊炎患者',
    relatedTextures: ['粗糙', '片状', '块状', '层状'],
    relatedColors: ['白色/灰白色'],
    imagingFeature: 'X线平片明显显影（不透X线），CT高密度',
    riskFactors: ['慢性胆囊炎', '胆汁pH值持续异常', '胆囊钙化（瓷胆囊）'],
    clinicalSignificance: '碳酸钙结石提示长期慢性炎症环境导致胆汁pH值持续偏碱，促使碳酸钙沉淀。一旦形成极难溶解，且可能伴随胆囊壁钙化（瓷胆囊），需要持续医学监测',
  },
  {
    type: '蛋白质基质沉积',
    typeEn: 'Protein Matrix Deposit',
    description: '以黏蛋白糖蛋白为主要成分的基质沉积物，构成结石形成的"骨架"。淡黄色胶状或海绵状，有一定弹性',
    typicalColor: '淡黄色/浅琥珀色',
    hexColor: '#FFECB3',
    hardness: '弹性中等（类似软胶）',
    occurrence: '普遍存在于各类结石的基质中，独立出现多见于炎症活跃期',
    relatedTextures: ['凝胶状', '海绵质', '絮状', '泥沙状'],
    relatedColors: ['米黄色/乳白色', '黄褐色'],
    imagingFeature: '不显影（无钙化成分）',
    riskFactors: ['胆囊黏膜慢性炎症', '高黏蛋白分泌体质', '代谢综合征'],
    clinicalSignificance: '蛋白质基质（主要是黏蛋白MUC5AC）是结石形成的"胶水"和"骨架"。胆固醇结晶在黏蛋白凝胶中成核并生长。减少黏蛋白过度分泌（通过抗炎饮食）是预防结石形成的关键环节',
  },
  {
    type: '粘液栓',
    typeEn: 'Mucus Plug',
    description: '黏蛋白凝聚形成的胶状栓状物，透明度高，半透明或乳白色果冻状，是胆管清理过程中的正常排出物',
    typicalColor: '透明/乳白色/浅黄透明',
    hexColor: '#ECEFF1',
    hardness: '极软（果冻状）',
    occurrence: '常见于肝胆排毒初期至中期，是胆管清理的积极标志',
    relatedTextures: ['凝胶状', '絮状'],
    relatedColors: ['米黄色/乳白色'],
    imagingFeature: '超声和CT均不显影',
    riskFactors: ['正常排毒反应', '胆管黏膜更新'],
    clinicalSignificance: '粘液栓是肝胆排毒过程中胆管黏膜更新脱落的正常产物，属于积极信号。黏蛋白（mucin）的排出意味着胆管清理正在发生，减少了结石形成的基质环境',
  },
  {
    type: '草酸钙结石',
    typeEn: 'Calcium Oxalate Stones',
    description: '草酸钙结晶沉积，深褐色或黑色，质地极硬，表面常有刺状或针状突起，是最坚硬的胆结石类型之一',
    typicalColor: '深褐色/黑色',
    hexColor: '#4E342E',
    hardness: '极硬（类似肾结石硬度）',
    occurrence: '极少见，约占胆结石的1-2%',
    relatedTextures: ['粗糙', '结晶状', '颗粒状'],
    relatedColors: ['黑色', '棕褐色'],
    imagingFeature: 'X线和CT均显影（不透X线），密度最高',
    riskFactors: ['高草酸饮食（菠菜、甜菜、坚果、巧克力）', '炎症性肠病', '小肠切除术后'],
    clinicalSignificance: '草酸钙结石极少见于胆囊，多见于肾脏。出现于胆汁中提示严重的代谢异常或肠道草酸吸收增加。表面刺状突起是其最独特的形态特征，调整饮食（减少高草酸食物）见效较快',
  },
  {
    type: '胆汁淤渣',
    typeEn: 'Biliary Sludge',
    description: '胆固醇单水结晶+胆红素钙颗粒+黏蛋白的混合物，医学上称为"胆泥"(biliary sludge)。半固态糊状，是结石形成的前驱状态',
    typicalColor: '棕黄色/灰绿色/奶油色',
    hexColor: '#A1887F',
    hardness: '半固态糊状（类似牙膏）',
    occurrence: '常见于长期禁食、全胃肠外营养、妊娠期、快速减重者',
    relatedTextures: ['泥浆质', '泥沙状', '海绵质', '凝胶状'],
    relatedColors: ['黄褐色', '米黄色/乳白色', '鲜绿色'],
    imagingFeature: '超声可见分层低回声物质（无后方声影），CT不显影',
    riskFactors: ['长时间禁食', '全胃肠外营养(TPN)', '快速减重', '妊娠', '胆汁淤积'],
    clinicalSignificance: '胆汁淤渣是结石形成的关键前驱阶段，是干预的最佳窗口。通过恢复进食、增加饮水、改善胆汁流动性，此阶段可完全逆转。若长期不处理，淤渣将成为结石的核心',
  },
]

// ==================== 查询函数 ====================

/** 已知质地类型名称集合（含中英文） */
const TEXTURE_NAMES = new Set(KNOWN_TEXTURES.flatMap(t => [t.type, t.typeEn.toLowerCase()]))

/** 已知成分类型名称集合（含中英文） */
const COMPOSITION_NAMES = new Set(KNOWN_COMPOSITIONS.flatMap(c => [c.type, c.typeEn.toLowerCase()]))

/**
 * 检查质地类型是否在已知数据库中
 */
export function isKnownTexture(textureType: string | undefined | null): boolean {
  if (!textureType || textureType === '未知' || textureType === 'Unknown') return false
  const cleaned = textureType.trim()
  return TEXTURE_NAMES.has(cleaned) || TEXTURE_NAMES.has(cleaned.toLowerCase())
}

/**
 * 检查成分类型是否在已知数据库中
 */
export function isKnownComposition(compType: string | undefined | null): boolean {
  if (!compType || compType === '未知' || compType === 'Unknown') return false
  const cleaned = compType.trim()
  return COMPOSITION_NAMES.has(cleaned) || COMPOSITION_NAMES.has(cleaned.toLowerCase())
}

/**
 * 查找质地条目（模糊匹配，支持中英文和简称）
 */
export function findTexture(textureType: string): TextureEntry | null {
  const cleaned = textureType.trim().toLowerCase()
  return KNOWN_TEXTURES.find(
    t => t.type === textureType.trim() ||
         t.type.toLowerCase() === cleaned ||
         t.typeEn.toLowerCase() === cleaned
  ) || null
}

/**
 * 查找成分条目（模糊匹配，支持中英文）
 */
export function findComposition(compType: string): CompositionEntry | null {
  const cleaned = compType.trim().toLowerCase()
  return KNOWN_COMPOSITIONS.find(
    c => c.type === compType.trim() ||
         c.type.toLowerCase() === cleaned ||
         c.typeEn.toLowerCase() === cleaned
  ) || null
}

/**
 * 获取所有已知质地名称列表（用于AI prompt约束）
 */
export function getKnownTextureNames(): string[] {
  return KNOWN_TEXTURES.map(t => t.type)
}

/**
 * 获取所有已知成分名称列表（用于AI prompt约束）
 */
export function getKnownCompositionNames(): string[] {
  return KNOWN_COMPOSITIONS.map(c => c.type)
}

/**
 * 获取可用置信度值
 */
export function getConfidenceLevels(): string[] {
  return ['高', '中', '低']
}

/**
 * 交叉验证：检查颜色与质地组合是否在已知关联中
 * 返回关联的置信度分数（0-1）
 */
export function crossValidateColorTexture(colorName: string, textureType: string): { valid: boolean; score: number; matchedCompositions: string[] } {
  const texture = findTexture(textureType)
  if (!texture) return { valid: false, score: 0, matchedCompositions: [] }

  // 检查是否有成分同时关联此颜色和质地
  const matchedComps = KNOWN_COMPOSITIONS.filter(c =>
    texture.relatedCompositions.includes(c.type) &&
    c.relatedColors.includes(colorName)
  )

  if (matchedComps.length > 0) {
    return { valid: true, score: 0.8 + matchedComps.length * 0.1, matchedCompositions: matchedComps.map(c => c.type) }
  }

  return { valid: false, score: 0, matchedCompositions: [] }
}

/**
 * 交叉验证：检查质地与成分组合是否在已知关联中
 * 返回关联的置信度分数（0-1）
 */
export function crossValidateTextureComposition(textureType: string, compType: string): { valid: boolean; score: number } {
  const texture = findTexture(textureType)
  const comp = findComposition(compType)
  if (!texture || !comp) return { valid: false, score: 0 }

  // 双向验证：成分的关联质地包含该质地，且质地的关联成分包含该成分
  const compLinksToTexture = comp.relatedTextures.includes(textureType)
  const textureLinksToComp = texture.relatedCompositions.includes(compType)

  if (compLinksToTexture && textureLinksToComp) {
    return { valid: true, score: 1.0 }
  } else if (compLinksToTexture || textureLinksToComp) {
    return { valid: true, score: 0.7 }
  }

  return { valid: false, score: 0 }
}

/**
 * 根据观察到的颜色和形态推荐最可能的质地和成分
 * 用于AI难以判断时提供参考
 */
export function recommendByColorAndShape(
  colorName: string,
  shapeType: string
): { recommendedTextures: string[]; recommendedCompositions: string[]; reasoning: string } {
  // 基于颜色反查可能的成分
  const compositionsByColor = KNOWN_COMPOSITIONS.filter(c => c.relatedColors.includes(colorName))
  const compNames = compositionsByColor.map(c => c.type)

  // 基于成分反查可能的质地
  const textureSet = new Set<string>()
  for (const comp of compositionsByColor) {
    for (const tex of comp.relatedTextures) {
      textureSet.add(tex)
    }
  }

  return {
    recommendedTextures: Array.from(textureSet),
    recommendedCompositions: compNames,
    reasoning: `基于颜色"${colorName}"分析，可能成分为：${compNames.join('、')}；对应常见质地为：${Array.from(textureSet).join('、')}`,
  }
}

/**
 * 生成质地成分数据库的文本描述（用于AI prompt —— 增强版）
 */
export function generateTextureCompositionPrompt(): string {
  const textureList = KNOWN_TEXTURES.map(t =>
    `  - ${t.type}：${t.description}\n    视觉线索：${t.visualCues.join('；')}\n    切面特征：${t.crossSectionCues.join('；')}\n    严重度：${t.severityLevel} | 关联成分：${t.relatedCompositions.join('、')}`
  ).join('\n')

  const compositionList = KNOWN_COMPOSITIONS.map(c =>
    `  - ${c.type}：${c.description}\n    典型颜色：${c.typicalColor} | 硬度：${c.hardness} | 发生率：${c.occurrence}\n    关联质地：${c.relatedTextures.join('、')} | 关联颜色：${c.relatedColors.join('、')}\n    X线：${c.imagingFeature} | 风险因素：${c.riskFactors.join('、')}`
  ).join('\n')

  // 颜色-质地-成分关联速查表
  const crossRefTable = KNOWN_COMPOSITIONS.map(c =>
    `${c.type} → 典型颜色[${c.relatedColors.join('/')}] + 典型质地[${c.relatedTextures.join('/')}]`
  ).join('\n')

  return `
【质地数据库 - 仅可选择以下15种类型】
${textureList}

【成分数据库 - 仅可选择以下12种类型】
${compositionList}

【颜色→成分→质地 关联速查表】
${crossRefTable}

【质地识别关键方法 - 请按以下步骤逐项分析图片】
步骤1-表面特征：观察结石表面是否光滑/粗糙/有颗粒/有蜡质光泽/有桑葚样多面体
步骤2-质地触感推断：根据光泽度推断软硬度（高光泽=蜡质/油质，哑光=粗糙/硬质）
步骤3-形态关联：结合形态判断（圆形+光滑=胆固醇，多面体+粗糙=混合型，管状+致密=胆管铸型）
步骤4-颜色交叉验证：颜色必须与成分一致（黄色/黄绿→胆固醇，棕褐→胆红素，纯黑→黑色素，白色→钙化）
步骤5-综合判定：颜色+形态+质地+成分必须自洽，若不一致则重新评估

硬性规则：
- texture.type 必须从上述质地数据库的15种类型中选择，不允许使用"未知"或其他非数据库内类型
- composition.type 必须从上述成分数据库的12种类型中选择，不允许使用"未知"或其他非数据库内类型
- confidence 可选值：高、中、低
- 颜色-质地-成分三者必须逻辑自洽，如：黄绿色+光滑+胆固醇性结石 是自洽的；黑色+蜡质+胆固醇性结石 则是矛盾的
- 如果无法完全确定，从数据库中选择颜色和形态最匹配的选项
- visualCues 要具体描述图片中观察到的视觉证据，不少于3条
- reasoning 要详细说明判定依据，包括颜色依据、形态依据、表面特征依据`
}

// ==================== 简称/别名映射 ====================

/**
 * 质地简称和别名映射（用于AI非标准输出的规范化）
 */
export const TEXTURE_ALIAS_MAP: Record<string, string> = {
  'smoothen': '光滑', '平滑': '光滑', '光面': '光滑', '光': '光滑',
  'rough': '粗糙', '粗': '粗糙',
  'mulberry': '桑葚样', '桑葚': '桑葚样', '桑椹': '桑葚样', '桑葚状': '桑葚样', 'cauliflower': '桑葚样',
  'waxy': '蜡质', 'wax': '蜡质', '蜡样': '蜡质', '蜡': '蜡质',
  'sludge': '泥沙状', 'sand': '泥沙状', 'sandy': '泥沙状', '沙状': '泥沙状', '泥状': '泥浆质',
  'flocculent': '絮状', 'flocc': '絮状', 'cotton': '絮状', '棉絮': '絮状',
  'laminated': '层状', 'laminate': '层状', 'layer': '层状', '分层': '层状', '层叠': '层状', '年轮': '层状',
  'flaky': '片状', 'flake': '片状', '薄片': '片状',
  'massive': '块状', 'mass': '块状', '大块': '块状', '块': '块状',
  'granular': '颗粒状', 'granule': '颗粒状', '粒状': '颗粒状', '颗粒': '颗粒状',
  'gelatinous': '凝胶状', 'gelatin': '凝胶状', 'gel': '凝胶状', 'jelly': '凝胶状', '果冻': '凝胶状', '胶状': '凝胶状', '胶质': '凝胶状',
  'brittle': '脆质', '易碎': '脆质', '脆': '脆质', '酥脆': '脆质',
  'oily': '油质', 'greasy': '油质', '油脂': '油质', '油腻': '油质', '脂样': '油质',
  'spongy': '海绵质', 'sponge': '海绵质', 'porous': '海绵质', '多孔': '海绵质', '海绵': '海绵质',
  'pasty': '泥浆质', 'mud': '泥浆质', 'paste': '泥浆质', '糊状': '泥浆质', '膏状': '泥浆质', '泥': '泥浆质',
  '软': '蜡质', 'soft': '蜡质', '硬': '块状', 'hard': '块状',
}

/**
 * 成分简称和别名映射
 */
export const COMPOSITION_ALIAS_MAP: Record<string, string> = {
  'cholesterol': '胆固醇性结石', '胆固醇结石': '胆固醇性结石', '胆固醇': '胆固醇性结石',
  'calcium bilirubinate': '胆红素钙结石', '胆红素': '胆红素钙结石', '胆色素结石': '胆红素钙结石', 'brown pigment': '胆红素钙结石',
  'black pigment': '黑色素结石', '黑色结石': '黑色素结石',
  'mixed': '混合性结石', '混合型': '混合性结石', '混合': '混合性结石',
  'bile pigment': '胆色素沉积', '色素沉积': '胆色素沉积', '胆色素': '胆色素沉积',
  'calcium fatty acid': '脂肪酸钙结石', '脂肪酸钙': '脂肪酸钙结石', '脂肪酸': '脂肪酸钙结石', '钙皂': '脂肪酸钙结石',
  'calcium phosphate': '磷酸钙结石', '磷酸钙': '磷酸钙结石',
  'calcium carbonate': '碳酸钙结石', '碳酸钙': '碳酸钙结石',
  'protein matrix': '蛋白质基质沉积', '蛋白基质': '蛋白质基质沉积', '蛋白质': '蛋白质基质沉积', 'mucin': '蛋白质基质沉积',
  'mucus': '粘液栓', '粘液': '粘液栓', '黏液': '粘液栓',
  'calcium oxalate': '草酸钙结石', '草酸钙': '草酸钙结石',
  'biliary sludge': '胆汁淤渣', 'bile sludge': '胆汁淤渣', '胆泥': '胆汁淤渣', 'sludge': '胆汁淤渣',
}
