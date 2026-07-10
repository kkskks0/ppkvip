/**
 * 质地与成分规范化测试
 */
import { canonicalizeTexture, canonicalizeComposition } from './src/data/canonicalize'
import {
  findTexture, findComposition, isKnownTexture, isKnownComposition,
  crossValidateColorTexture, crossValidateTextureComposition,
  recommendByColorAndShape,
  getKnownTextureNames, getKnownCompositionNames,
  TEXTURE_ALIAS_MAP, COMPOSITION_ALIAS_MAP,
  KNOWN_TEXTURES, KNOWN_COMPOSITIONS,
} from './src/data/textureCompositionDb'

let passed = 0
let failed = 0
const failures: string[] = []

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) { passed++; console.log(`  ✅ ${name}`) }
    else { failed++; console.log(`  ❌ ${name}`); failures.push(name) }
  } catch (e: any) {
    failed++; console.log(`  ❌ ${name}: ${e.message}`); failures.push(name)
  }
}

function assert(condition: boolean, msg: string) { if (!condition) throw new Error(msg) }

console.log('\n🧬 质地规范化测试')
console.log('────────────────────────────────────────────────────────────')

test('精确匹配: "光滑"', () => {
  const r = canonicalizeTexture('光滑')
  return r.valid && r.canonicalType === '光滑'
})

test('精确匹配: "蜡质"', () => {
  const r = canonicalizeTexture('蜡质')
  return r.valid && r.canonicalType === '蜡质'
})

test('关键词匹配: "蜡样光泽" → "蜡质"', () => {
  const r = canonicalizeTexture('蜡样光泽')
  return r.valid && r.canonicalType === '蜡质'
})

test('关键词匹配: "多面体簇状结构" → "桑葚样"', () => {
  const r = canonicalizeTexture('多面体簇状结构')
  return r.valid && r.canonicalType === '桑葚样'
})

test('别名映射: "waxy" → "蜡质"', () => {
  const r = canonicalizeTexture('waxy')
  return r.valid && r.canonicalType === '蜡质'
})

test('别名映射: "果冻" → "凝胶状"', () => {
  const r = canonicalizeTexture('果冻')
  return r.valid && r.canonicalType === '凝胶状'
})

test('别名映射: "分层" → "层状"', () => {
  const r = canonicalizeTexture('分层')
  return r.valid && r.canonicalType === '层状'
})

test('别名映射: "油脂" → "油质"', () => {
  const r = canonicalizeTexture('油脂')
  return r.valid && r.canonicalType === '油质'
})

test('别名映射: "海绵" → "海绵质"', () => {
  const r = canonicalizeTexture('海绵')
  return r.valid && r.canonicalType === '海绵质'
})

test('别名映射: "糊状" → "泥浆质"', () => {
  const r = canonicalizeTexture('糊状')
  return r.valid && r.canonicalType === '泥浆质'
})

test('别名映射: "易碎" → "脆质"', () => {
  const r = canonicalizeTexture('易碎')
  return r.valid && r.canonicalType === '脆质'
})

test('英文匹配: "rough" → "粗糙"', () => {
  const r = canonicalizeTexture('rough')
  return r.valid && r.canonicalType === '粗糙'
})

test('英文匹配: "smooth" → "光滑"', () => {
  const r = canonicalizeTexture('smooth')
  return r.valid && r.canonicalType === '光滑'
})

test('边界: 空字符串', () => {
  const r = canonicalizeTexture('')
  return !r.valid
})

test('边界: 未知类型', () => {
  const r = canonicalizeTexture('透明状')
  return !r.valid
})

console.log('\n🔬 成分规范化测试')
console.log('────────────────────────────────────────────────────────────')

test('精确匹配: "胆固醇性结石"', () => {
  const r = canonicalizeComposition('胆固醇性结石')
  return r.valid && r.canonicalType === '胆固醇性结石'
})

test('精确匹配: "混合性结石"', () => {
  const r = canonicalizeComposition('混合性结石')
  return r.valid && r.canonicalType === '混合性结石'
})

test('关键词匹配: "胆固醇为主" → "胆固醇性结石"', () => {
  const r = canonicalizeComposition('胆固醇为主')
  return r.valid && r.canonicalType === '胆固醇性结石'
})

test('别名映射: "胆固醇" → "胆固醇性结石"', () => {
  const r = canonicalizeComposition('胆固醇')
  return r.valid && r.canonicalType === '胆固醇性结石'
})

test('别名映射: "mixed" → "混合性结石"', () => {
  const r = canonicalizeComposition('mixed')
  return r.valid && r.canonicalType === '混合性结石'
})

test('别名映射: "胆泥" → "胆汁淤渣"', () => {
  const r = canonicalizeComposition('胆泥')
  return r.valid && r.canonicalType === '胆汁淤渣'
})

test('别名映射: "粘液" → "粘液栓"', () => {
  const r = canonicalizeComposition('粘液')
  return r.valid && r.canonicalType === '粘液栓'
})

test('别名映射: "碳酸钙" → "碳酸钙结石"', () => {
  const r = canonicalizeComposition('碳酸钙')
  return r.valid && r.canonicalType === '碳酸钙结石'
})

test('别名映射: "钙皂" → "脂肪酸钙结石"', () => {
  const r = canonicalizeComposition('钙皂')
  return r.valid && r.canonicalType === '脂肪酸钙结石'
})

test('边界: 空字符串', () => {
  const r = canonicalizeComposition('')
  return !r.valid
})

test('边界: 未知成分', () => {
  const r = canonicalizeComposition('尿酸结石')
  return !r.valid
})

console.log('\n🔗 交叉验证测试')
console.log('────────────────────────────────────────────────────────────')

test('颜色-质地: 翠绿色+光滑 → 有效', () => {
  const r = crossValidateColorTexture('翠绿色', '光滑')
  return r.valid && r.score > 0
})

test('颜色-质地: 黑色+蜡质 → 无效（矛盾）', () => {
  const r = crossValidateColorTexture('黑色', '蜡质')
  return !r.valid
})

test('质地-成分: 光滑+胆固醇性结石 → 有效', () => {
  const r = crossValidateTextureComposition('光滑', '胆固醇性结石')
  return r.valid && r.score > 0
})

test('质地-成分: 蜡质+草酸钙结石 → 无效', () => {
  const r = crossValidateTextureComposition('蜡质', '草酸钙结石')
  return !r.valid
})

test('推荐: 翠绿色 → 应有胆固醇性结石', () => {
  const r = recommendByColorAndShape('翠绿色', '圆形')
  return r.recommendedCompositions.includes('胆固醇性结石')
})

test('推荐: 黑色 → 应有黑色素结石', () => {
  const r = recommendByColorAndShape('黑色', '颗粒状')
  return r.recommendedCompositions.includes('黑色素结石')
})

console.log('\n📚 知识库完整性检查')
console.log('────────────────────────────────────────────────────────────')

test('已知质地数量 ≥ 15', () => {
  const names = getKnownTextureNames()
  return names.length >= 15
})

test('已知成分数量 ≥ 12', () => {
  const names = getKnownCompositionNames()
  return names.length >= 12
})

test('所有质地条目有完整字段', () => {
  return KNOWN_TEXTURES.every((t: any) =>
    t.type && t.typeEn && t.description && t.visualCues.length >= 3 &&
    t.crossSectionCues.length >= 1 && t.severityLevel &&
    t.relatedCompositions.length >= 1 && t.typicalColors.length >= 1
  )
})

test('所有成分条目有完整字段', () => {
  return KNOWN_COMPOSITIONS.every((c: any) =>
    c.type && c.typeEn && c.description && c.typicalColor &&
    c.hexColor && c.hardness && c.relatedTextures.length >= 1 &&
    c.relatedColors.length >= 1 && c.imagingFeature &&
    c.riskFactors.length >= 1 && c.clinicalSignificance
  )
})

test('别名映射完整性: TEXTURE_ALIAS_MAP', () => {
  return Object.keys(TEXTURE_ALIAS_MAP).length >= 20
})

test('成分别名映射完整性: COMPOSITION_ALIAS_MAP', () => {
  return Object.keys(COMPOSITION_ALIAS_MAP).length >= 15
})

console.log('\n============================================================')
console.log(`  测试结果: ✅ ${passed} 通过 | ❌ ${failed} 失败 | 总计 ${passed + failed}`)
console.log('============================================================')

if (failures.length > 0) {
  console.log('\n失败详情:')
  failures.forEach(f => console.log(`  - ${f}`))
  process.exit(1)
}
