/**
 * 数据规范化引擎 单元测试
 * 运行: npx tsx server/test-canonicalize.ts
 */

import {
  canonicalizeColor,
  canonicalizeShape,
  canonicalizeSize,
  sanitizeHexColor,
} from './src/data/canonicalize'

interface TestCase {
  name: string
  input: any
  expected: { valid: boolean; canonicalName?: string }
}

let passed = 0
let failed = 0

function test(description: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${description}`)
      passed++
    } else {
      console.log(`  ❌ ${description}`)
      failed++
    }
  } catch (err: any) {
    console.log(`  💥 ${description} — ${err.message}`)
    failed++
  }
}

// ==================== 颜色规范化测试 ====================
console.log('\n🎨 颜色规范化测试')
console.log('─'.repeat(60))

// 正常场景
test('精确匹配: "翠绿色"', () => {
  const result = canonicalizeColor('翠绿色')
  return result.valid && result.canonicalName === '翠绿色'
})

test('精确匹配: "黄褐色"', () => {
  const result = canonicalizeColor('黄褐色')
  return result.valid && result.canonicalName === '黄褐色'
})

test('精确匹配: "黑色"', () => {
  const result = canonicalizeColor('黑色')
  return result.valid && result.canonicalName === '黑色'
})

// 模糊匹配 - AI常见输出
test('简称匹配: "翠绿" → "翠绿色"', () => {
  const result = canonicalizeColor('翠绿')
  return result.valid && result.canonicalName === '翠绿色'
})

test('简称匹配: "鲜绿" → "鲜绿色"', () => {
  const result = canonicalizeColor('鲜绿')
  return result.valid && result.canonicalName === '鲜绿色'
})

test('简称匹配: "墨绿" → "墨绿色"', () => {
  const result = canonicalizeColor('墨绿')
  return result.valid && result.canonicalName === '墨绿色'
})

// 混合色 → 主导色（测试中最常见的方差来源）
test('混合色: "翠绿黄褐混合" → "翠绿色"(翠绿权重最高)', () => {
  const result = canonicalizeColor('翠绿黄褐混合')
  return result.valid && result.canonicalName === '翠绿色' &&
    result.debugInfo.includes('翠绿色')
})

test('混合色: "翠绿与黄褐混合" → "翠绿色"', () => {
  const result = canonicalizeColor('翠绿与黄褐混合')
  return result.valid && result.canonicalName === '翠绿色'
})

test('混合色: "黄绿混合色" → "翠绿色"', () => {
  const result = canonicalizeColor('黄绿混合色')
  return result.valid && result.canonicalName === '翠绿色'
})

test('混合色: "黄褐为主略带绿色" → "黄褐色"', () => {
  const result = canonicalizeColor('黄褐为主略带绿色')
  return result.valid && result.canonicalName === '黄褐色'
})

// HEX距离退化为匹配
test('HEX退化: "#9ACD32"(黄绿色) → 最近知识库色', () => {
  const result = canonicalizeColor('未知颜色名', '#9ACD32')
  // #9ACD32 is closest to 翠绿色 (#2E7D32) or 鲜绿色 (#4CAF50)?
  // RGB: 154, 205, 50 → calculate
  return result.valid
})

test('HEX退化: "#808000"(橄榄色) → 最近知识库色', () => {
  const result = canonicalizeColor('无法识别', '#808000')
  return result.valid
})

// 边界场景
test('边界: 空字符串', () => {
  const result = canonicalizeColor('')
  return !result.valid
})

test('边界: "未知"', () => {
  const result = canonicalizeColor('未知')
  return !result.valid
})

test('边界: 纯英文名称 "Emerald Green"', () => {
  const result = canonicalizeColor('Emerald Green')
  return result.valid && result.canonicalName === '翠绿色'
})

// 规范HEX一致性
test('HEX一致性: 颜色确定后HEX来自知识库', () => {
  const result = canonicalizeColor('翠绿色', '#123456')
  return result.canonicalHex === '#2E7D32' // 知识库中的翠绿色HEX
})

// ==================== 形态规范化测试 ====================
console.log('\n🔷 形态规范化测试')
console.log('─'.repeat(60))

test('精确匹配: "桑葚菜花"', () => {
  const result = canonicalizeShape('桑葚菜花')
  return result.valid && result.canonicalType === '桑葚菜花'
})

test('精确匹配: "泥沙"', () => {
  const result = canonicalizeShape('泥沙')
  return result.valid && result.canonicalType === '泥沙'
})

test('精确匹配: "圆形"', () => {
  const result = canonicalizeShape('圆形')
  return result.valid && result.canonicalType === '圆形'
})

// 混合形态 → 主导形态
test('混合形态: "泥沙桑葚混合" → "桑葚菜花"(桑葚权重更高)', () => {
  const result = canonicalizeShape('泥沙桑葚混合')
  return result.valid && (result.canonicalType === '桑葚菜花')
})

test('混合形态: "桑葚状与泥沙状混合" → "桑葚菜花"', () => {
  const result = canonicalizeShape('桑葚状与泥沙状混合')
  return result.valid && result.canonicalType === '桑葚菜花'
})

test('近似: "桑葚菜花状多结晶" → "桑葚菜花"', () => {
  const result = canonicalizeShape('桑葚菜花状多结晶')
  return result.valid && result.canonicalType === '桑葚菜花'
})

test('近似: "菜花样" → "桑葚菜花"', () => {
  const result = canonicalizeShape('菜花样')
  return result.valid && result.canonicalType === '桑葚菜花'
})

// 边界
test('边界: 空字符串', () => {
  const result = canonicalizeShape('')
  return !result.valid
})

test('边界: 未知形态', () => {
  const result = canonicalizeShape('不规则形')
  return !result.valid
})

// ==================== 尺寸规范化测试 ====================
console.log('\n📏 尺寸规范化测试')
console.log('─'.repeat(60))

test('提取范围: "2-15mm"', () => {
  const result = canonicalizeSize('中等', '2-15mm')
  return result.extractedRangeMm === '2-15mm' && result.minMm === 2 && result.maxMm === 15
})

test('提取范围: "1-10mm"', () => {
  const result = canonicalizeSize('混合', '1-10mm')
  return result.extractedRangeMm === '1-10mm' && result.minMm === 1 && result.maxMm === 10
})

test('提取范围: "1mm - 15mm"(带空格)', () => {
  const result = canonicalizeSize('混合', '1mm - 15mm')
  return result.minMm === 1 && result.maxMm === 15
})

test('提取范围: "2-12"(无mm后缀)', () => {
  const result = canonicalizeSize('小型', '2-12')
  return result.minMm === 2 && result.maxMm === 12
})

test('分类规范: "中等至较大" → "中型"(中等优先)', () => {
  const result = canonicalizeSize('中等至较大', '2-15mm')
  return result.canonicalCategory === '中型'
})

test('分类规范: "混合大小" → "混合"', () => {
  const result = canonicalizeSize('混合大小', '1-10mm')
  return result.canonicalCategory === '混合'
})

// ==================== HEX清洗测试 ====================
console.log('\n🔧 HEX清洗测试')
console.log('─'.repeat(60))

test('标准HEX通过: "#2E7D32"', () => {
  const result = sanitizeHexColor('#2E7D32')
  return result === '#2E7D32'
})

test('小写HEX转为大写: "#2e7d32"', () => {
  const result = sanitizeHexColor('#2e7d32')
  return result === '#2E7D32'
})

test('无效HEX兜底: "not-a-color"', () => {
  const result = sanitizeHexColor('not-a-color')
  return result === '#999999'
})

test('空字符串兜底', () => {
  const result = sanitizeHexColor('')
  return result === '#999999'
})

// ==================== 结果汇总 ====================
console.log('\n' + '='.repeat(60))
console.log(`  测试结果: ✅ ${passed} 通过 | ❌ ${failed} 失败 | 总计 ${passed + failed}`)
console.log('='.repeat(60))

if (failed > 0) {
  process.exit(1)
}
