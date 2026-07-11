export const translations: Record<string, Record<string, string>> = {
  zh: {
    // App
    appName: '排排看',
    appDesc: '肝胆净化AI分析系统',
    startAnalysis: '开始分析',

    // Upload
    uploadTitle: '上传图片',
    name: '您的姓名',
    namePlaceholder: '请输入姓名',
    gender: '性别',
    male: '男',
    female: '女',
    defaultValue: '用户',
    imageCount: '排出物图片（最多3张，可多角度拍摄）',
    add: '添加',
    tips: '拍摄建议',
    tip1: '将排出物倒入白色容器中，尽量分散铺开，有助于AI更准确识别每颗排出物的特征',
    tip2: '自然光下拍摄，避免反光和阴影',
    tip3: '放置瓶盖作为尺寸参照物',
    tip4: '可多角度拍摄（正面、侧面、细节）',
    tip5: '如有文字标记请拍清楚，AI可识别',

    // Analysis progress
    analyzing: 'AI 正在分析',
    uploadProgress: '图片上传中',
    aiRecognition: 'AI视觉识别',
    colorShape: '颜色与形态分析',
    textureComp: '成分与质地判定',
    riskAssess: '健康风险评估',
    genAdvice: '生成个性化建议',
    genReport: '生成分析报告',

    // Report header
    reportTitle: '肝胆净化分析报告',
    overview: '排出物概览',
    sampleImage: '排出物照片',

    // Color
    colorAnalysis: '颜色分析',
    formationTime: '形成时间',
    interpretation: '健康解读',
    relatedConditions: '相关病症',

    // Shape & Size
    shapeSize: '形态与大小',
    shapeType: '形态类型',
    shapeDesc: '形态描述',
    shapeSignificance: '分析意义',
    sizeCategory: '大小分类',
    reference: '参照物',

    // Texture & Composition
    textureCompTitle: '质地与成分',
    textureType: '质地类型',
    visualCues: '视觉线索',
    compType: '成分类型',
    confidence: '置信度',
    reasoning: '判定依据',

    // Pattern & Risk
    patternRisk: '排出模式与风险评估',
    pattern: '排出模式',
    patternDesc: '模式说明',
    quantity: '数量估计',
    quantitySignificance: '数量分析',
    diseaseRisk: '健康风险分析',
    highRisk: '高风险',
    mediumRisk: '中风险',
    lowRisk: '低风险',

    // Comprehensive
    comprehensive: '综合分析报告',
    recommendations: '个性化建议',
    dietAdvice: '饮食建议',
    lifestyleAdvice: '生活方式建议',

    // Warnings
    warnings: '警示信号与后续建议',
    warningSignals: '警示信号',
    possible: '可能',
    action: '建议措施',
    nextSteps: '下一步建议',
    disclaimer: '本分析基于排出物特征的客观评估，仅供健康生活参考。保持健康饮食和良好的生活习惯是肝胆健康的基础。',

    // Home
    siteTitle: '排排看 · 肝胆净化AI分析',
    scanToVisit: '扫码即可访问',
    threeSteps: '三步完成',
    step1: '拍照上传',
    step1Desc: '排出物照片（最多3张）',
    step2: 'AI分析',
    step2Desc: '多维度智能识别',
    step3: '获取报告',
    step3Desc: '专业分析报告',

    // Features
    features: '核心功能',
    feat1: '颜色→状态映射',
    feat1Desc: '11种颜色对应不同健康状态和严重等级',
    feat2: '形态→状态关联',
    feat2Desc: '11种形态分析排出物特征与结晶类型',
    feat3: '性别差异化分析',
    feat3Desc: '基于男女不同生理特点的针对性建议',
    feat4: 'OCR文字识别',
    feat4Desc: '自动识别图片上的文字标记信息',
    feat5: '风险评估',
    feat5Desc: '高/中/低三级风险分级，精准定位',
    feat6: '个性化建议',
    feat6Desc: '饮食、作息、运动等多维度指导',

    // Misc
    copied: '链接已复制到剪贴板',

    // Report lock/unlock
    reportLocked: '解锁完整报告',
    freePreview: '免费预览',
    viewedItems: '已查看 {n}/{total} 项分析',
    unlockToView: '付费解锁以下深度分析内容',
    blurPreviewHint: '以上内容已模糊处理，解锁后查看完整分析',
    premiumTeaser1: '质地与成分分析',
    premiumTeaser2: '排出模式与风险评估',
    premiumTeaser3: '深度融合分析报告',
    premiumTeaser4: '7天详细饮食计划',
    premiumTeaser5: '个性化饮食建议',
    premiumTeaser6: '生活方式指导',
    premiumTeaser7: '警示信号与后续建议',
    freeContentLabel: '颜色 · 形态 · 大小 · 质地 · 成分 — 以上内容已为您免费展示',

    // Payment cards
    perReportTitle: '按次解锁 · 本次报告',
    perReportPrice: '¥9.90',
    perReportSubtitle: '解锁本次完整报告，即时生效',
    perReportFeature1: '9项深度分析 + 7天饮食计划',
    perReportFeature2: '支付后立即可看，一周内有效',
    perReportCta: '¥9.90 立即解锁',
    perReportUnit: '次',
    badgeRecommended: '推荐',

    annualTitle: '⭐ 年度会员 · 全部解锁',
    annualPrice: '¥59',
    annualSubtitle: '无限次解锁 + 健康档案 + 历史对比',
    annualFeature1: '一年内所有报告免费解锁查看',
    annualFeature2: '建立个人健康档案，跟踪净化进展',
    annualFeature3: '历次检测结果对比分析',
    annualFeature4: '检测6次即回本，省钱更省心',
    annualCta: '¥59 开通年费会员',
    annualUnit: '年',
    badgeBestValue: '超值',
    annualMemberLabel: '年费会员',
    unlockedLabel: '已解锁',

    // Trust
    trustFooter: '7天无理由退款 · 数据加密 · 隐私保护',

    // Share
    shareReport: '分享报告',
    shareTitle: '我的肝胆净化分析报告',
    shareText: 'AI智能分析肝胆净化结果，快来看看我的报告！',
    shareSuccess: '链接已复制，快去分享吧',
    shareFailed: '分享失败，请手动复制链接',

    // WeChat official account
    wechatFollowTitle: '关注公众号',
    wechatQrAlt: '代谢优化公众号二维码',
    wechatQrHint: '微信扫一扫，长按识别关注',
    wechatOfficialNotice: '本程序由微信服务号“代谢优化”提供，如有意见建议请于公众号内提交',
    wechatAccountName: '代谢优化',
    wechatFollowBtn: '一键复制公众号名称',
    wechatCopyHint: '复制后打开微信 → 搜索公众号 → 粘贴关注',
    wechatCopied: '公众号名称已复制',

    // Brand promotion
    brandPromoTitle: '排排看 · AI肝胆净化分析',
    brandPromoDesc: '拍照上传排出物，十秒获取专业分析报告',
    brandPromoFeature1: 'AI智能识别 · 11种颜色分析',
    brandPromoFeature2: '质地成分分析 · 健康风险评估',
    brandPromoFeature3: '个性化饮食计划 · 7天完整方案',
    brandPromoFeature4: '历史对比 · 追踪净化进展',
    brandPromoCta: '免费开始分析',
    poweredBy: 'Powered by 排排看 AI',

    // Unlock
    unlockSuccess: '解锁成功，完整报告已加载',
    unlockFailed: '解锁失败',
    deepAnalysisGenerating: '深度分析生成中，请稍候…',
    paymentFailed: '支付失败',

    // Delete
    reportDeleted: '报告已删除',
    confirmDelete: '服务器上将立即删除此报告，此操作不可撤销',
    deleteReport: '删除报告',
    cancel: '取消',
    confirmDeleteBtn: '确认删除',

    // Profile
    profileTitle: '个人健康档案',
    profileDesc: '完善档案信息，获取更精准的分析建议',
    saveProfile: '保存档案',
    profileSaved: '档案保存成功',
    saveFailed: '保存失败',
    saving: '保存中...',
    basicInfo: '基本信息',
    age: '年龄',
    birthday: '出生日期',
    healthGoal: '健康目标',
    healthGoalPlaceholder: '如：降低胆固醇、改善消化',
    healthInfo: '健康信息',
    email: '电子邮箱',
    address: '地址',
    emergencyContact: '紧急联系人',
    medicalHistory: '既往病史',
    medicalHistoryPlaceholder: '如：饮食偏好、运动习惯等',
    dietaryPreference: '饮食偏好',
    dietaryPreferencePlaceholder: '如：纯素、清淡饮食',
    notes: '备注',
    goBack: '返回',
    memberStatus: '当前会员',
    freeMemberLabel: '免费用户',
    memberExpiry: '到期时间',
    reportHistory: '检测记录',
    reportCount: '次',
    noReports: '暂无检测记录',

    // Diet plan
    dailyDietPlan: '7天饮食计划',
    day: '第',
    dayUnit: '天',
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
    nutritionNote: '营养提示',

    // Navigation
    navHome: '首页',
    navAnalyze: '分析',
    navReports: '报告',
    navProfile: '我的',

    // Error messages
    errorUploadFailed: '图片上传失败，请稍后重试',
    errorAnalysisFailed: '图片分析失败，请确保图片清晰且为肝胆净化相关照片',
    errorNetwork: '网络连接异常，请检查网络后重试',
    errorPaymentFailed: '支付服务异常，请稍后重试',
    errorDeleteFailed: '删除失败，请稍后重试',
    errorGeneric: '操作失败，请稍后重试',
    errorDelete: '删除失败',
    notFound: '未找到相关数据',

    // Knowledge quotes
    quote1: '肝脏是人体最大的解毒器官，每天处理巨噬细胞杀死的数千个异常细胞',
    quote2: '胆汁每天分泌约600~1000ml，经胆囊浓缩5~10倍后储存',
    quote3: '保持肠道通畅对肝脏净化至关重要，肠肝循环每天进行多次',
    quote4: '绿色蔬菜富含叶绿素，有助于肝脏解毒和胆汁分泌',
    quote5: '晚上11点前入睡，有利于肝胆在夜间充分修复与净化',
    quote6: '超过70%的人存在不同程度的肝内胆管沉积',
    quote7: '肝胆沉积的形成与高脂高糖饮食、缺乏运动及长期精神压力密切相关',
    quote8: '姜黄中的姜黄素具有显著的抗炎和利胆作用',
  },

  zhTW: {
    // App
    appName: '排排看',
    appDesc: '肝膽淨化AI分析系統',
    startAnalysis: '開始分析',

    // Upload
    uploadTitle: '上傳圖片',
    name: '您的姓名',
    namePlaceholder: '請輸入姓名',
    gender: '性別',
    male: '男',
    female: '女',
    defaultValue: '使用者',
    imageCount: '排出物圖片（最多3張，可多角度拍攝）',
    add: '新增',
    tips: '拍攝建議',
    tip1: '將排出物倒入白色容器中，盡量分散鋪開，有助於AI更準確辨識每顆排出物的特徵',
    tip2: '在自然光下拍攝，避免反光與陰影',
    tip3: '放置瓶蓋作為尺寸參照物',
    tip4: '可從多角度拍攝（正面、側面、細節）',
    tip5: '如有文字標記請拍清楚，AI可辨識',

    // Analysis progress
    analyzing: 'AI 正在分析',
    uploadProgress: '圖片上傳中',
    aiRecognition: 'AI視覺辨識',
    colorShape: '顏色與形態分析',
    textureComp: '成分與質地判定',
    riskAssess: '健康風險評估',
    genAdvice: '生成個人化建議',
    genReport: '生成分析報告',

    // Report header
    reportTitle: '肝膽淨化分析報告',
    overview: '排出物概覽',
    sampleImage: '排出物照片',

    // Color
    colorAnalysis: '顏色分析',
    formationTime: '形成時間',
    interpretation: '健康解讀',
    relatedConditions: '相關病症',

    // Shape & Size
    shapeSize: '形態與大小',
    shapeType: '形態類型',
    shapeDesc: '形態描述',
    shapeSignificance: '分析意義',
    sizeCategory: '大小分類',
    reference: '參照物',

    // Texture & Composition
    textureCompTitle: '質地與成分',
    textureType: '質地類型',
    visualCues: '視覺線索',
    compType: '成分類型',
    confidence: '可信度',
    reasoning: '判定依據',

    // Pattern & Risk
    patternRisk: '排出模式與風險評估',
    pattern: '排出模式',
    patternDesc: '模式說明',
    quantity: '數量估計',
    quantitySignificance: '數量分析',
    diseaseRisk: '健康風險分析',
    highRisk: '高風險',
    mediumRisk: '中風險',
    lowRisk: '低風險',

    // Comprehensive
    comprehensive: '綜合分析報告',
    recommendations: '個人化建議',
    dietAdvice: '飲食建議',
    lifestyleAdvice: '生活方式建議',

    // Warnings
    warnings: '警示訊號與後續建議',
    warningSignals: '警示訊號',
    possible: '可能',
    action: '建議措施',
    nextSteps: '下一步建議',
    disclaimer: '本分析基於排出物特徵的客觀評估，僅供健康生活參考。保持健康飲食和良好的生活習慣是肝膽健康的基礎。',

    // Home
    siteTitle: '排排看 · 肝膽淨化AI分析',
    scanToVisit: '掃碼即可瀏覽',
    threeSteps: '三步完成',
    step1: '拍照上傳',
    step1Desc: '排出物照片（最多3張）',
    step2: 'AI分析',
    step2Desc: '多維度智慧辨識',
    step3: '獲取報告',
    step3Desc: '專業分析報告',

    // Features
    features: '核心功能',
    feat1: '顏色→狀態對應',
    feat1Desc: '11種顏色對應不同健康狀態與嚴重等級',
    feat2: '形態→狀態關聯',
    feat2Desc: '11種形態分析排出物特徵與結晶類型',
    feat3: '性別差異化分析',
    feat3Desc: '基於男女不同生理特點的針對性建議',
    feat4: 'OCR文字辨識',
    feat4Desc: '自動辨識圖片上的文字標記資訊',
    feat5: '風險評估',
    feat5Desc: '高/中/低三級風險分級，精準定位',
    feat6: '個人化建議',
    feat6Desc: '飲食、作息、運動等多維度指導',

    // Misc
    copied: '連結已複製到剪貼簿',

    // Report lock/unlock
    reportLocked: '解鎖完整報告',
    freePreview: '免費預覽',
    viewedItems: '已檢視 {n}/{total} 項分析',
    unlockToView: '付費解鎖以下深度分析內容',
    blurPreviewHint: '以上內容已模糊處理，解鎖後查看完整分析',
    premiumTeaser1: '質地與成分分析',
    premiumTeaser2: '排出模式與風險評估',
    premiumTeaser3: '深度融合分析報告',
    premiumTeaser4: '7天詳細飲食計劃',
    premiumTeaser5: '個人化飲食建議',
    premiumTeaser6: '生活方式指導',
    premiumTeaser7: '警示訊號與後續建議',
    freeContentLabel: '顏色 · 形態 · 大小 · 質地 · 成分 — 以上內容已為您免費展示',

    // Payment cards
    perReportTitle: '按次解鎖 · 本次報告',
    perReportPrice: 'NT$45',
    perReportSubtitle: '解鎖本次完整報告，即時生效',
    perReportFeature1: '9項深度分析 + 7天飲食計劃',
    perReportFeature2: '支付後立即可看，一週內有效',
    perReportCta: 'NT$45 立即解鎖',
    perReportUnit: '次',
    badgeRecommended: '推薦',

    annualTitle: '⭐ 年度會員 · 全部解鎖',
    annualPrice: 'NT$268',
    annualSubtitle: '無限次解鎖 + 健康檔案 + 歷史對比',
    annualFeature1: '一年內所有報告免費解鎖檢視',
    annualFeature2: '建立個人健康檔案，追蹤淨化進展',
    annualFeature3: '歷次檢測結果對比分析',
    annualFeature4: '檢測6次即回本，省錢更省心',
    annualCta: 'NT$268 開通年費會員',
    annualUnit: '年',
    badgeBestValue: '超值',
    annualMemberLabel: '年費會員',
    unlockedLabel: '已解鎖',

    // Trust
    trustFooter: '7天無理由退款 · 數據加密 · 隱私保護',

    // Share
    shareReport: '分享報告',
    shareTitle: '我的肝膽淨化分析報告',
    shareText: 'AI智慧分析肝膽淨化結果，快來看看我的報告！',
    shareSuccess: '連結已複製，快去分享吧',
    shareFailed: '分享失敗，請手動複製連結',

    // WeChat official account
    wechatFollowTitle: '關注公眾號',
    wechatQrAlt: '代謝優化公眾號二維碼',
    wechatQrHint: '微信掃一掃，長按識別關注',
    wechatOfficialNotice: '本程序由微信服務號「代謝優化」提供，如有意見建議請於公眾號內提交',
    wechatAccountName: '代謝優化',
    wechatFollowBtn: '一鍵複製公眾號名稱',
    wechatCopyHint: '複製後打開微信 → 搜尋公眾號 → 貼上關注',
    wechatCopied: '公眾號名稱已複製',

    // Brand promotion
    brandPromoTitle: '排排看 · AI肝膽淨化分析',
    brandPromoDesc: '拍照上傳排出物，十秒獲取專業分析報告',
    brandPromoFeature1: 'AI智慧辨識 · 11種顏色分析',
    brandPromoFeature2: '質地成分分析 · 健康風險評估',
    brandPromoFeature3: '個人化飲食計劃 · 7天完整方案',
    brandPromoFeature4: '歷史對比 · 追蹤淨化進展',
    brandPromoCta: '免費開始分析',
    poweredBy: 'Powered by 排排看 AI',

    // Unlock
    unlockSuccess: '解鎖成功，完整報告已載入',
    unlockFailed: '解鎖失敗',
    deepAnalysisGenerating: '深度分析生成中，請稍候…',
    paymentFailed: '支付失敗',

    // Delete
    reportDeleted: '報告已刪除',
    confirmDelete: '伺服器上將立即刪除此報告，此操作無法復原',
    deleteReport: '刪除報告',
    cancel: '取消',
    confirmDeleteBtn: '確認刪除',

    // Profile
    profileTitle: '個人健康檔案',
    profileDesc: '完善檔案資訊，獲取更精準的分析建議',
    saveProfile: '儲存檔案',
    profileSaved: '檔案儲存成功',
    saveFailed: '儲存失敗',
    saving: '儲存中...',
    basicInfo: '基本資訊',
    age: '年齡',
    birthday: '出生日期',
    healthGoal: '健康目標',
    healthGoalPlaceholder: '如：降低膽固醇、改善消化',
    healthInfo: '健康資訊',
    email: '電子郵件',
    address: '地址',
    emergencyContact: '緊急聯絡人',
    medicalHistory: '既往病史',
    medicalHistoryPlaceholder: '如：飲食偏好、運動習慣等',
    dietaryPreference: '飲食偏好',
    dietaryPreferencePlaceholder: '如：純素、清淡飲食',
    notes: '備註',
    goBack: '返回',
    memberStatus: '目前會員',
    freeMemberLabel: '免費使用者',
    memberExpiry: '到期時間',
    reportHistory: '檢測記錄',
    reportCount: '次',
    noReports: '暫無檢測記錄',

    // Diet plan
    dailyDietPlan: '7天飲食計劃',
    day: '第',
    dayUnit: '天',
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
    nutritionNote: '營養提示',

    // Navigation
    navHome: '首頁',
    navAnalyze: '分析',
    navReports: '報告',
    navProfile: '我的',

    // Error messages
    errorUploadFailed: '圖片上傳失敗，請稍後再試',
    errorAnalysisFailed: '圖片分析失敗，請確保圖片清晰且為肝膽淨化相關照片',
    errorNetwork: '網路連線異常，請檢查網路後再試',
    errorPaymentFailed: '支付服務異常，請稍後再試',
    errorDeleteFailed: '刪除失敗，請稍後再試',
    errorGeneric: '操作失敗，請稍後再試',
    errorDelete: '刪除失敗',
    notFound: '找不到相關資料',

    // Knowledge quotes
    quote1: '肝臟是人體最大的解毒器官，每天處理巨噬細胞殺死的數千個異常細胞',
    quote2: '膽汁每天分泌約600~1000ml，經膽囊濃縮5~10倍後儲存',
    quote3: '保持腸道通暢對肝臟淨化至關重要，腸肝循環每天進行多次',
    quote4: '綠色蔬菜富含葉綠素，有助於肝臟解毒與膽汁分泌',
    quote5: '晚上11點前就寢，有利於肝膽在夜間充分修復與淨化',
    quote6: '超過70%的人存在不同程度的肝內膽管沉積',
    quote7: '肝膽沉積的形成與高脂高糖飲食、缺乏運動及長期精神壓力密切相關',
    quote8: '薑黃中的薑黃素具有顯著的抗發炎與利膽作用',
  },

  en: {
    // App
    appName: 'Pai Pai Kan',
    appDesc: 'Liver & Gallbladder Cleanse AI Analysis',
    startAnalysis: 'Start Analysis',

    // Upload
    uploadTitle: 'Upload Images',
    name: 'Your Name',
    namePlaceholder: 'Enter your name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    defaultValue: 'User',
    imageCount: 'Discharge images (up to 3, from multiple angles)',
    add: 'Add',
    tips: 'Photography Tips',
    tip1: 'Spread the discharge in a white container for optimal AI recognition of individual particles',
    tip2: 'Shoot in natural light; avoid glare and shadows',
    tip3: 'Place a bottle cap alongside as a size reference',
    tip4: 'Capture multiple angles (front, side, close-up)',
    tip5: 'If there are handwritten labels, photograph them clearly for AI OCR',

    // Analysis progress
    analyzing: 'AI Analyzing',
    uploadProgress: 'Uploading images',
    aiRecognition: 'AI Visual Recognition',
    colorShape: 'Color & Morphology Analysis',
    textureComp: 'Composition & Texture Assessment',
    riskAssess: 'Health Risk Assessment',
    genAdvice: 'Generating Personalized Advice',
    genReport: 'Generating Analysis Report',

    // Report header
    reportTitle: 'Liver & Gallbladder Cleanse Report',
    overview: 'Discharge Overview',
    sampleImage: 'Sample Image',

    // Color
    colorAnalysis: 'Color Analysis',
    formationTime: 'Formation Time',
    interpretation: 'Interpretation',
    relatedConditions: 'Related Conditions',

    // Shape & Size
    shapeSize: 'Shape & Size',
    shapeType: 'Morphology Type',
    shapeDesc: 'Description',
    shapeSignificance: 'Analysis Significance',
    sizeCategory: 'Size Category',
    reference: 'Reference Object',

    // Texture & Composition
    textureCompTitle: 'Texture & Composition',
    textureType: 'Texture Type',
    visualCues: 'Visual Cues',
    compType: 'Composition Type',
    confidence: 'Confidence Level',
    reasoning: 'Rationale',

    // Pattern & Risk
    patternRisk: 'Pattern & Risk Assessment',
    pattern: 'Discharge Pattern',
    patternDesc: 'Pattern Description',
    quantity: 'Estimated Quantity',
    quantitySignificance: 'Quantity Analysis',
    diseaseRisk: 'Health Risk Analysis',
    highRisk: 'High Risk',
    mediumRisk: 'Medium Risk',
    lowRisk: 'Low Risk',

    // Comprehensive
    comprehensive: 'Comprehensive Analysis',
    recommendations: 'Personalized Recommendations',
    dietAdvice: 'Dietary Advice',
    lifestyleAdvice: 'Lifestyle Recommendations',

    // Warnings
    warnings: 'Warning Signs & Next Steps',
    warningSignals: 'Warning Signs',
    possible: 'Possible',
    action: 'Recommended Action',
    nextSteps: 'Next Steps',
    disclaimer: 'This assessment is based on discharge characteristics and is for healthy lifestyle reference only. Maintaining a healthy diet and lifestyle is the foundation of liver and gallbladder wellness.',

    // Home
    siteTitle: 'Pai Pai Kan · Liver Cleanse AI Analysis',
    scanToVisit: 'Scan to visit',
    threeSteps: 'Three Simple Steps',
    step1: 'Upload Photo',
    step1Desc: 'Discharge photos (up to 3)',
    step2: 'AI Analysis',
    step2Desc: 'Multi-dimensional intelligent recognition',
    step3: 'Get Report',
    step3Desc: 'Professional analysis report',

    // Features
    features: 'Core Features',
    feat1: 'Color → Status Mapping',
    feat1Desc: '11 colors mapped to health status and severity levels',
    feat2: 'Morphology → Status Correlation',
    feat2Desc: '11 shapes for discharge feature and crystal type analysis',
    feat3: 'Gender-Specific Analysis',
    feat3Desc: 'Tailored recommendations based on male/female physiology',
    feat4: 'OCR Text Recognition',
    feat4Desc: 'Automatically detect handwritten labels and markings on images',
    feat5: 'Risk Assessment',
    feat5Desc: 'Three-tier risk classification: high / medium / low',
    feat6: 'Personalized Guidance',
    feat6Desc: 'Diet, sleep, exercise, and lifestyle recommendations',

    // Misc
    copied: 'Link copied to clipboard',

    // Report lock/unlock
    reportLocked: 'Unlock Full Report',
    freePreview: 'Free Preview',
    viewedItems: '{n}/{total} sections viewed',
    unlockToView: 'Unlock the following in-depth analyses',
    blurPreviewHint: 'Content above is blurred — unlock to view the full analysis',
    premiumTeaser1: 'Texture & Composition Analysis',
    premiumTeaser2: 'Pattern & Risk Assessment',
    premiumTeaser3: 'In-depth Comprehensive Analysis',
    premiumTeaser4: '7-Day Detailed Meal Plan',
    premiumTeaser5: 'Personalized Dietary Advice',
    premiumTeaser6: 'Lifestyle Guidance',
    premiumTeaser7: 'Warning Signs & Next Steps',
    freeContentLabel: 'Color · Shape · Size · Texture · Composition — shown above at no cost',

    // Payment cards
    perReportTitle: 'Pay-per-Report',
    perReportPrice: '$1.50',
    perReportSubtitle: 'Unlock this full report instantly',
    perReportFeature1: '9 in-depth analyses + 7-day meal plan',
    perReportFeature2: 'View instantly after payment, valid for 1 week',
    perReportCta: '$1.50 Unlock Now',
    perReportUnit: 'report',
    badgeRecommended: 'Popular',

    annualTitle: '⭐ Annual Membership',
    annualPrice: '$8.90',
    annualSubtitle: 'Unlimited access + Health profile + History tracking',
    annualFeature1: 'All reports free to view for one year',
    annualFeature2: 'Build your personal health profile and track cleanse progress',
    annualFeature3: 'Compare historical test results side by side',
    annualFeature4: 'Pays for itself after just 6 reports',
    annualCta: '$8.90 Join Annual Plan',
    annualUnit: 'year',
    badgeBestValue: 'Best Value',
    annualMemberLabel: 'Annual Member',
    unlockedLabel: 'Unlocked',

    // Trust
    trustFooter: '7-day refund · Encrypted data · Privacy protected',

    // Share
    shareReport: 'Share Report',
    shareTitle: 'My Liver & Gallbladder Cleanse Report',
    shareText: 'AI-powered liver detox analysis. Check out my results!',
    shareSuccess: 'Link copied! Share it with others',
    shareFailed: 'Sharing failed. Please copy the link manually.',

    // WeChat official account
    wechatFollowTitle: 'Follow Our WeChat',
    wechatQrAlt: 'Metabolism Optimize QR code',
    wechatQrHint: 'Scan or long-press the QR code with WeChat',
    wechatOfficialNotice: 'This service is provided by the WeChat official account “代谢优化”. For feedback, please submit via the official account.',
    wechatAccountName: '代谢优化',
    wechatFollowBtn: 'Copy Account Name',
    wechatCopyHint: 'Open WeChat → Search Official Accounts → Paste to follow',
    wechatCopied: 'Account name copied',

    // Brand promotion
    brandPromoTitle: 'Pai Pai Kan · AI Liver Cleanse Analysis',
    brandPromoDesc: 'Upload a photo and get a professional analysis in seconds',
    brandPromoFeature1: 'AI Recognition · 11-color analysis',
    brandPromoFeature2: 'Texture & composition · Health assessment',
    brandPromoFeature3: 'Personalized meal plan · 7-day program',
    brandPromoFeature4: 'History tracking · Monitor your progress',
    brandPromoCta: 'Start Free Analysis',
    poweredBy: 'Powered by Pai Pai Kan AI',

    // Unlock
    unlockSuccess: 'Unlocked! Your full report is now available.',
    unlockFailed: 'Unlock failed',
    deepAnalysisGenerating: 'Generating in-depth analysis, please wait…',
    paymentFailed: 'Payment failed',

    // Delete
    reportDeleted: 'Report deleted',
    confirmDelete: 'This report will be permanently deleted from the server immediately. This action cannot be undone.',
    deleteReport: 'Delete Report',
    cancel: 'Cancel',
    confirmDeleteBtn: 'Confirm Delete',

    // Profile
    profileTitle: 'Personal Health Profile',
    profileDesc: 'Complete your profile for more accurate analysis and recommendations',
    saveProfile: 'Save Profile',
    profileSaved: 'Profile saved successfully',
    saveFailed: 'Save failed',
    saving: 'Saving...',
    basicInfo: 'Basic Information',
    age: 'Age',
    birthday: 'Date of Birth',
    healthGoal: 'Health Goal',
    healthGoalPlaceholder: 'e.g., Lower cholesterol, improve digestion',
    healthInfo: 'Health Information',
    email: 'Email Address',
    address: 'Address',
    emergencyContact: 'Emergency Contact',
    medicalHistory: 'Medical History',
    medicalHistoryPlaceholder: 'e.g., Dietary preferences, exercise habits',
    dietaryPreference: 'Dietary Preference',
    dietaryPreferencePlaceholder: 'e.g., Vegan, light diet',
    notes: 'Notes',
    goBack: 'Back',
    memberStatus: 'Membership',
    freeMemberLabel: 'Free User',
    memberExpiry: 'Expiry Date',
    reportHistory: 'Test History',
    reportCount: ' reports',
    noReports: 'No test records yet',

    // Diet plan
    dailyDietPlan: '7-Day Meal Plan',
    day: 'Day ',
    dayUnit: '',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    nutritionNote: 'Nutrition Note',

    // Navigation
    navHome: 'Home',
    navAnalyze: 'Analyze',
    navReports: 'Reports',
    navProfile: 'Profile',

    // Error messages
    errorUploadFailed: 'Image upload failed. Please try again later.',
    errorAnalysisFailed: 'Analysis failed. Please ensure the image is clear and shows liver/gallbladder cleanse discharge.',
    errorNetwork: 'Network error. Please check your connection and try again.',
    errorPaymentFailed: 'Payment service unavailable. Please try again later.',
    errorDeleteFailed: 'Failed to delete. Please try again later.',
    errorGeneric: 'Operation failed. Please try again later.',
    errorDelete: 'Delete failed',
    notFound: 'Data not found',

    // Knowledge quotes
    quote1: 'The liver is the body\'s largest detoxification organ, processing thousands of abnormal cells eliminated by macrophages each day',
    quote2: 'Approximately 600–1000 mL of bile is secreted daily, concentrated 5–10× by the gallbladder before storage',
    quote3: 'Maintaining gut health is essential for liver detoxification via the enterohepatic circulation',
    quote4: 'Green vegetables rich in chlorophyll support liver detoxification and bile production',
    quote5: 'Going to bed before 11 PM allows the liver and gallbladder to repair and detoxify effectively overnight',
    quote6: 'Over 70% of people have some degree of intrahepatic biliary deposits',
    quote7: 'Biliary deposit formation is closely linked to high-fat/high-sugar diets, physical inactivity, and chronic stress',
    quote8: 'Curcumin in turmeric exhibits potent anti-inflammatory and choleretic (bile-flow-promoting) effects',
  },
}

export type Lang = 'zh' | 'zhTW' | 'en'
export const langLabels: Record<Lang, string> = { zh: '简体中文', zhTW: '繁體中文', en: 'English' }
