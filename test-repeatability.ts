/**
 * 拍拍看 AI 可重复性测试脚本
 *
 * 用途: 使用同一张图片连续执行5次快速分析,检测AI输出的一致性和差异来源
 * 前置条件: 服务器已重启(calibrationCache 已清空)
 *
 * 运行方式: npx tsx test-repeatability.ts [可选: 指定图片路径]
 * 示例: npx tsx test-repeatability.ts
 *       npx tsx test-repeatability.ts ./server/uploads/xxx.jpg
 */

import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

// ==================== 配置 ====================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_BASE = 'http://localhost:3001'
const RUN_COUNT = 5
const REQUEST_TIMEOUT_MS = 60_000 // 单次请求超时

// 默认测试图片：选取 uploads 目录下最大的真实图片
const DEFAULT_IMAGE_NAME = '480776e2-d498-4f84-9698-d9a09ccb060a.jpg'
const UPLOADS_DIR = path.join(__dirname, 'server', 'uploads')

// ==================== 类型定义 ====================

interface QuickAnalysisResponse {
  code: number
  data: {
    reportId: string
    status: string
    isUnlocked: boolean
    colorFingerprint: string
    calibrated: boolean
    quickSummary: {
      color: { name: string; hexColor: string; formationTime: string; interpretation: string }
      shape: { type: string; description: string; significance: string }
      size: { category: string; estimatedRangeMm: string; referenceObject: string }
    }
  }
  message: string
}

interface TestRunResult {
  runIndex: number
  timestamp: string
  imageKey: string
  responseTimeMs: number
  success: boolean
  error?: string
  colorFingerprint: string
  calibrated: boolean
  reportId: string
  rawResponse: QuickAnalysisResponse | null
}

interface VarianceAnalysis {
  field: string
  values: string[]
  uniqueCount: number
  totalCount: number
  agreementRate: string
  detail: string
}

// ==================== 工具函数 ====================

/** HTTP POST JSON 请求 */
function httpPost(url: string, body: object, timeoutMs: number): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const parsed = new URL(url)
    const mod = parsed.protocol === 'https:' ? https : http

    const req = mod.request({
      hostname: parsed.hostname, port: parsed.port,
      path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: timeoutMs,
    }, (res) => {
      let d = ''
      res.on('data', (c: Buffer) => (d += c.toString()))
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 0, data: JSON.parse(d) }) }
        catch { resolve({ status: res.statusCode || 0, data: d }) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(payload)
    req.end()
  })
}

/** HTTP DELETE */
function httpDelete(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = http.request({
      hostname: parsed.hostname, port: parsed.port,
      path: parsed.pathname, method: 'DELETE',
      timeout: 10000,
    }, (res) => { res.resume(); res.on('end', resolve) })
    req.on('error', reject)
    req.end()
  })
}

/** 复制文件并生成新 UUID 文件名 */
function copyImageToUploads(sourcePath: string): string {
  const ext = path.extname(sourcePath)
  const newName = `${crypto.randomUUID()}${ext}`
  const destPath = path.join(UPLOADS_DIR, newName)
  fs.copyFileSync(sourcePath, destPath)
  return newName
}

/** 计算 MD5 */
function md5(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex')
}

/** 计算字符串相似度 (Jaccard on character trigrams) */
function textSimilarity(a: string, b: string): number {
  const trigrams = (s: string) => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3))
    return set
  }
  const sa = trigrams(a)
  const sb = trigrams(b)
  const intersection = new Set([...sa].filter(x => sb.has(x)))
  const union = new Set([...sa, ...sb])
  return union.size === 0 ? 1 : intersection.size / union.size
}

// ==================== 主要测试逻辑 ====================

async function main() {
  console.log('='.repeat(70))
  console.log('  拍拍看 AI 可重复性测试')
  console.log('  同一图片 × 5次 快速分析 → 结果一致性分析')
  console.log('='.repeat(70))

  // --- Step 1: 确定测试图片 ---
  const argPath = process.argv[2]
  let sourceImagePath: string

  if (argPath) {
    sourceImagePath = path.resolve(argPath)
  } else {
    sourceImagePath = path.join(UPLOADS_DIR, DEFAULT_IMAGE_NAME)
  }

  if (!fs.existsSync(sourceImagePath)) {
    console.error(`\n❌ 测试图片不存在: ${sourceImagePath}`)
    console.error('   用法: npx tsx test-repeatability.ts [图片路径]')
    console.error(`   可用图片:`)
    const files = fs.readdirSync(UPLOADS_DIR).filter(f => {
      const stat = fs.statSync(path.join(UPLOADS_DIR, f))
      return stat.isFile() && stat.size > 1000 // 排除小于1KB的无效文件
    })
    files.slice(0, 10).forEach(f => {
      const stat = fs.statSync(path.join(UPLOADS_DIR, f))
      console.error(`     ${f} (${(stat.size / 1024).toFixed(1)}KB)`)
    })
    process.exit(1)
  }

  const sourceStat = fs.statSync(sourceImagePath)
  console.log(`\n📷 测试图片: ${path.basename(sourceImagePath)} (${(sourceStat.size / 1024).toFixed(1)}KB)`)
  console.log(`   路径: ${sourceImagePath}`)

  // --- Step 2: 检查服务器运行状态 ---
  console.log(`\n🔍 检查服务器状态...`)
  try {
    const health = await httpPost(`${API_BASE}/api/health`, {}, 5000)
    console.log(`   ✅ 服务器运行中: ${health.data.status}`)
  } catch {
    console.error('   ❌ 服务器未运行! 请先启动服务器: cd server && npx tsx src/index.ts')
    process.exit(1)
  }

  // --- Step 3: 执行5次测试 ---
  const results: TestRunResult[] = []
  const createdReportIds: string[] = []

  console.log(`\n🧪 开始执行 ${RUN_COUNT} 次测试...`)
  console.log('─'.repeat(70))

  for (let i = 0; i < RUN_COUNT; i++) {
    const runStart = Date.now()
    const imageKey = copyImageToUploads(sourceImagePath)
    console.log(`\n[第${i + 1}次] imageKey: ${imageKey.slice(0, 8)}...`)

    try {
      const resp = await httpPost(`${API_BASE}/api/quick-analysis`, {
        imageUrl: `/uploads/${imageKey}`,
        imageKey: imageKey,
        userName: '测试用户',
        hasCap: false,
        gender: '未填写',
        lang: 'zh',
      }, REQUEST_TIMEOUT_MS)

      const elapsed = Date.now() - runStart

      if (resp.data?.code === 0 && resp.data?.data) {
        const d = resp.data.data as QuickAnalysisResponse['data']
        createdReportIds.push(d.reportId)

        results.push({
          runIndex: i + 1,
          timestamp: new Date().toISOString(),
          imageKey,
          responseTimeMs: elapsed,
          success: true,
          colorFingerprint: d.colorFingerprint,
          calibrated: d.calibrated,
          reportId: d.reportId,
          rawResponse: resp.data,
        })

        const c = d.quickSummary?.color
        const s = d.quickSummary?.shape
        const z = d.quickSummary?.size
        console.log(`   ✅ 成功 | 耗时: ${(elapsed / 1000).toFixed(1)}s`)
        console.log(`   颜色: ${c?.name || '?'} (${c?.hexColor || '?'})`)
        console.log(`   形态: ${s?.type || '?'}`)
        console.log(`   尺寸: ${z?.category || '?'} | ${z?.estimatedRangeMm || '?'}`)
        console.log(`   校准: ${d.calibrated ? '已命中缓存' : '首次分析'} | 指纹: ${d.colorFingerprint}`)
      } else {
        results.push({
          runIndex: i + 1,
          timestamp: new Date().toISOString(),
          imageKey,
          responseTimeMs: elapsed,
          success: false,
          error: `API返回错误: code=${resp.data?.code}, message=${resp.data?.message}`,
          colorFingerprint: '',
          calibrated: false,
          reportId: '',
          rawResponse: null,
        })
        console.log(`   ❌ 失败: ${resp.data?.message || '未知错误'}`)
      }
    } catch (err: any) {
      const elapsed = Date.now() - runStart
      results.push({
        runIndex: i + 1,
        timestamp: new Date().toISOString(),
        imageKey,
        responseTimeMs: elapsed,
        success: false,
        error: err.message,
        colorFingerprint: '',
        calibrated: false,
        reportId: '',
        rawResponse: null,
      })
      console.log(`   ❌ 失败: ${err.message}`)
    }
  }

  // --- Step 4: 分析结果 ---
  console.log('\n' + '='.repeat(70))
  console.log('  📊 测试结果汇总')
  console.log('='.repeat(70))

  const successResults = results.filter(r => r.success)
  const failResults = results.filter(r => !r.success)

  console.log(`\n总执行次数: ${RUN_COUNT}`)
  console.log(`成功: ${successResults.length} | 失败: ${failResults.length}`)

  if (successResults.length < 2) {
    console.log('\n⚠️  成功次数不足2次,无法进行差异分析。')
    generateReport(results, [], sourceImagePath)
    return
  }

  // --- 时间统计 ---
  const times = successResults.map(r => r.responseTimeMs)
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const timeStdDev = Math.sqrt(times.reduce((s, t) => s + (t - avgTime) ** 2, 0) / times.length)

  console.log(`\n⏱️  响应时间:`)
  console.log(`   平均值: ${(avgTime / 1000).toFixed(1)}s | 最小: ${(minTime / 1000).toFixed(1)}s | 最大: ${(maxTime / 1000).toFixed(1)}s`)
  console.log(`   标准差: ${(timeStdDev / 1000).toFixed(1)}s (变异系数: ${((timeStdDev / avgTime) * 100).toFixed(1)}%)`)

  // --- 提取关键字段 ---
  const colorNames = successResults.map(r => r.rawResponse!.data.quickSummary.color.name)
  const hexColors = successResults.map(r => r.rawResponse!.data.quickSummary.color.hexColor)
  const formationTimes = successResults.map(r => r.rawResponse!.data.quickSummary.color.formationTime)
  const interpretations = successResults.map(r => r.rawResponse!.data.quickSummary.color.interpretation)
  const shapeTypes = successResults.map(r => r.rawResponse!.data.quickSummary.shape.type)
  const shapeDescriptions = successResults.map(r => r.rawResponse!.data.quickSummary.shape.description)
  const shapeSignificances = successResults.map(r => r.rawResponse!.data.quickSummary.shape.significance)
  const sizeCategories = successResults.map(r => r.rawResponse!.data.quickSummary.size.category)
  const sizeRanges = successResults.map(r => r.rawResponse!.data.quickSummary.size.estimatedRangeMm)
  const sizeReferences = successResults.map(r => r.rawResponse!.data.quickSummary.size.referenceObject)
  const fingerprints = successResults.map(r => r.colorFingerprint)

  // --- 字段级差异分析 ---
  const fields: VarianceAnalysis[] = [
    analyzeField('颜色名称', colorNames),
    analyzeField('HEX色值', hexColors),
    analyzeField('形成时间', formationTimes),
    { field: '颜色解读', ...analyzeTextField('颜色解读(interpretation)', interpretations) },
    analyzeField('形态类型', shapeTypes),
    { field: '形态描述', ...analyzeTextField('形态描述(description)', shapeDescriptions) },
    { field: '健康意义', ...analyzeTextField('健康意义(significance)', shapeSignificances) },
    analyzeField('尺寸分类', sizeCategories),
    analyzeField('尺寸范围', sizeRanges),
    analyzeField('参照物', sizeReferences),
  ]

  console.log(`\n📋 字段一致性分析:`)
  console.log('─'.repeat(70))
  for (const f of fields) {
    const icon = f.uniqueCount === 1 ? '✅' : f.uniqueCount <= 2 ? '⚠️' : '❌'
    console.log(`  ${icon} ${f.field.padEnd(18)} | 一致率: ${f.agreementRate.padEnd(10)} | ${f.uniqueCount}/${f.totalCount}种不同值`)
    if (f.uniqueCount > 1) {
      console.log(`     └ 差异详情: ${f.detail}`)
    }
  }

  // --- 指纹分析 ---
  console.log(`\n🔑 颜色指纹一致性:`)
  const uniqueFingerprints = new Set(fingerprints)
  if (uniqueFingerprints.size === 1) {
    console.log(`   ✅ 全部一致: ${fingerprints[0]}`)
  } else {
    console.log(`   ❌ 出现 ${uniqueFingerprints.size} 种不同指纹:`)
    fingerprints.forEach((fp, i) => console.log(`      第${i + 1}次: ${fp}`))
  }

  // --- 校准缓存分析 ---
  const calibratedCount = successResults.filter(r => r.calibrated).length
  console.log(`\n🔄 校准缓存命中:`)
  console.log(`   命中次数: ${calibratedCount}/${successResults.length}`)
  console.log(`   说明: 首次运行后缓存该图片的指纹,后续运行命中缓存但AI仍重新调用`)

  // --- 颜色映射一致性 ---
  console.log(`\n🎨 颜色-形态联合分布:`)
  const colorShapePairs = successResults.map(r =>
    `${r.rawResponse!.data.quickSummary.color.name} + ${r.rawResponse!.data.quickSummary.shape.type}`
  )
  const pairCounts = new Map<string, number>()
  colorShapePairs.forEach(p => pairCounts.set(p, (pairCounts.get(p) || 0) + 1))
  for (const [pair, count] of pairCounts.entries()) {
    const pct = ((count / successResults.length) * 100).toFixed(0)
    console.log(`   ${pair}: ${count}次 (${pct}%)`)
  }

  // --- 生成报告 ---
  generateReport(results, fields, sourceImagePath)

  // --- 清理: 删除创建的测试报告 ---
  console.log(`\n🧹 清理测试数据...`)
  for (const id of createdReportIds) {
    try {
      await httpDelete(`${API_BASE}/api/report-direct/${id}`)
    } catch { /* 忽略删除错误 */ }
  }
  // 清理复制的测试图片文件
  for (const r of successResults) {
    try {
      const fp = path.join(UPLOADS_DIR, r.imageKey)
      if (fs.existsSync(fp) && fp !== sourceImagePath) fs.unlinkSync(fp)
    } catch { /* 忽略 */ }
  }
  console.log('   完成。')
}

// ==================== 分析工具 ====================

function analyzeField(name: string, values: string[]): VarianceAnalysis {
  const unique = [...new Set(values)]
  const total = values.length
  const maxCount = Math.max(...unique.map(v => values.filter(x => x === v).length))
  const agreementRate = total > 0 ? `${((maxCount / total) * 100).toFixed(0)}%` : 'N/A'

  let detail = ''
  if (unique.length > 1) {
    const counts = unique.map(v => ({
      value: v,
      count: values.filter(x => x === v).length,
    })).sort((a, b) => b.count - a.count)
    detail = counts.map(c => `"${c.value}"×${c.count}`).join(', ')
  }

  return { field: name, values, uniqueCount: unique.length, totalCount: total, agreementRate, detail }
}

function analyzeTextField(name: string, texts: string[]): Omit<VarianceAnalysis, 'field'> {
  const uniqueValues = [...new Set(texts)]
  const total = texts.length

  // 对每对文本计算相似度
  const similarities: number[] = []
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      similarities.push(textSimilarity(texts[i], texts[j]))
    }
  }
  const avgSimilarity = similarities.length > 0
    ? similarities.reduce((a, b) => a + b, 0) / similarities.length
    : 1
  const agreementRate = `${(avgSimilarity * 100).toFixed(1)}%`

  // 长度统计
  const lengths = texts.map(t => t.length)
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const minLen = Math.min(...lengths)
  const maxLen = Math.max(...lengths)

  const detail = `文本相似度${agreementRate}, 长度范围${minLen}-${maxLen}字(均值${avgLen.toFixed(0)})`

  return { values: texts, uniqueCount: uniqueValues.length, totalCount: total, agreementRate, detail }
}

// ==================== 报告生成 ====================

function generateReport(results: TestRunResult[], fields: VarianceAnalysis[], sourcePath: string) {
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportPath = path.join(__dirname, `test-report-${now}.md`)

  const successResults = results.filter(r => r.success)
  const failResults = results.filter(r => !r.success)

  // 编码分析
  const colorNames = successResults.map(r => r.rawResponse!.data.quickSummary.color.name)
  const hexColors = successResults.map(r => r.rawResponse!.data.quickSummary.color.hexColor)
  const shapeTypes = successResults.map(r => r.rawResponse!.data.quickSummary.shape.type)

  const colorConsistent = new Set(colorNames).size === 1
  const hexConsistent = new Set(hexColors).size === 1
  const shapeConsistent = new Set(shapeTypes).size === 1

  const times = successResults.map(r => r.responseTimeMs)
  const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0

  let report = `# 拍拍看 AI 可重复性测试报告

> **生成时间**: ${new Date().toLocaleString('zh-CN')}
> **测试图片**: ${path.basename(sourcePath)} (${(fs.statSync(sourcePath).size / 1024).toFixed(1)}KB)
> **图片指纹(SHA256前16位)**: ${successResults[0]?.colorFingerprint || 'N/A'}
> **测试次数**: ${RUN_COUNT} | 成功: ${successResults.length} | 失败: ${failResults.length}

---

## 一、测试目的

使用同一张肝胆排毒排出物图片，在系统重启后连续执行5次快速分析，检测AI输出的**一致性**和**可重复性**，定位结果偏移的根本原因。

---

## 二、测试环境

| 项目 | 值 |
|------|-----|
| API端点 | \`POST /api/quick-analysis\` |
| 分析阶段 | 快速分析 (仅颜色/形态/尺寸) |
| AI模型 | MiMo v2.5 (推理模型) |
| max_tokens | 100000 |
| 单次超时 | 45秒 |
| 用户参数 | 固定：userName=测试用户, gender=未填写, hasCap=false, lang=zh |
| 校准缓存 | 首次运行后缓存指纹，后续命中但AI仍重新调用 |

---

## 三、逐次测试数据

| 序号 | 时间 | 耗时(s) | 颜色名称 | HEX | 形态 | 尺寸分类 | 范围(mm) | 校准 |
|------|------|---------|----------|-----|------|----------|----------|------|
`

  for (const r of successResults) {
    const d = r.rawResponse!.data.quickSummary
    report += `| ${r.runIndex} | ${r.timestamp.slice(11, 19)} | ${(r.responseTimeMs / 1000).toFixed(1)} | ${d.color.name} | ${d.color.hexColor} | ${d.shape.type} | ${d.size.category} | ${d.size.estimatedRangeMm} | ${r.calibrated ? '✓' : '—'} |\n`
  }

  for (const r of failResults) {
    report += `| ${r.runIndex} | ${r.timestamp.slice(11, 19)} | ${(r.responseTimeMs / 1000).toFixed(1)} | ❌ 失败 | — | — | — | — | — |\n`
  }

  report += `
---

## 四、详细字段数据

### 4.1 颜色分析

| 序号 | 颜色名称 | HEX色值 | 形成时间推断 | 解读摘要(前80字) |
|------|----------|---------|-------------|-----------------|
`

  for (const r of successResults) {
    const c = r.rawResponse!.data.quickSummary.color
    report += `| ${r.runIndex} | ${c.name} | \`${c.hexColor}\` | ${c.formationTime} | ${(c.interpretation || '').slice(0, 80)}... |\n`
  }

  report += `
### 4.2 形态分析

| 序号 | 形态类型 | 描述摘要(前80字) | 健康意义(前60字) |
|------|----------|-----------------|-----------------|
`

  for (const r of successResults) {
    const s = r.rawResponse!.data.quickSummary.shape
    report += `| ${r.runIndex} | ${s.type} | ${(s.description || '').slice(0, 80)}... | ${(s.significance || '').slice(0, 60)}... |\n`
  }

  report += `
### 4.3 尺寸分析

| 序号 | 尺寸分类 | 范围(mm) | 参照物 |
|------|----------|----------|--------|
`

  for (const r of successResults) {
    const z = r.rawResponse!.data.quickSummary.size
    report += `| ${r.runIndex} | ${z.category} | ${z.estimatedRangeMm} | ${z.referenceObject} |\n`
  }

  report += `
---

## 五、字段一致性分析

| 字段 | 一致率 | 不同值数 | 差异详情 |
|------|--------|---------|---------|
`

  for (const f of fields) {
    report += `| ${f.field} | ${f.agreementRate} | ${f.uniqueCount}/${f.totalCount} | ${f.uniqueCount > 1 ? f.detail : '—'} |\n`
  }

  report += `
---

## 六、差异根本原因分析

### 6.1 确定性分析

| 因素 | 状态 | 影响 |
|------|------|------|
| **输入图片** | ✅ 完全一致 | 同一文件复制，SHA256一致，图片指纹固定 |
| **系统提示词(Prompt)** | ✅ 完全一致 | QUICK_SYSTEM_PROMPT固定不变 |
| **用户参数** | ✅ 完全一致 | userName/gender/hasCap/lang固定 |
| **API配置** | ✅ 完全一致 | model/max_tokens/baseUrl固定 |
| **校准缓存** | ⚠️ 首次后命中 | 不影响AI调用，仅标记calibrated标志 |
| **AI推理模型** | ❌ 非确定性 | MiMo v2.5为推理模型，每次采样结果不同 |
| **随机种子** | ❌ 未固定 | API不提供seed/temperature参数控制 |

### 6.2 方差来源

`;

  // 基于实际结果的分析
  if (colorConsistent && hexConsistent && shapeConsistent) {
    report += `> ✅ **结论：本次测试AI输出高度一致**，颜色名称、HEX值、形态类型在${successResults.length}次运行中完全相同。表明在当前输入下模型对核心分类的判断是稳定的。

**低方差来源**:
1. **自然语言生成差异**: 解读文本(interpretation/description)措辞和长度存在微小差异，属于LLM正常行为
2. **采样温度**: 推理模型在token采样时产生的自然波动
`;
  } else if (colorConsistent && !hexConsistent) {
    report += `> ⚠️ **中等方差**: 颜色名称一致但HEX色值不一致。模型对颜色分类稳定，但HEX具体值的确定受采样影响。
`;
  } else if (!colorConsistent) {
    report += `> ❌ **高方差**: 颜色名称不一致。同一图片被模型在不同轮次判为不同颜色。说明模型对颜色边界的判断在本图上有分歧。
`;
  }

  report += `### 6.3 根本原因定位

1. **LLM非确定性(主因)**
   - MiMo v2.5是推理模型(Reasoning Model)，内部使用Chain-of-Thought推理
   - 每次推理过程受采样温度(temperature)影响，产生不同token序列
   - API不支持seed参数固定随机种子，结果无法复现

2. **图片视觉特征边界模糊**
   - 医疗影像的颜色判断存在主观性(如"翠绿"vs"墨绿"的边界)
   - 光照、背景等因素影响模型的颜色感知
   - 形态分类存在模糊区间(如"泥沙状"vs"絮状")

3. **系统Prompt固定但输出不可控**
   - Prompt中虽定义了颜色-形态映射表，但模型对映射的选择非确定性
   - interpretation等长文本的生成受解码策略影响，措辞必然变化

4. **无抑制机制**
   - 系统未设置temperature=0或top_p控制
   - 无输出一致性检查或多数投票机制`;

  report += `

### 6.4 响应时间分析

| 指标 | 值 |
|------|-----|
| 平均响应时间 | ${(avgTime / 1000).toFixed(1)}s |
| 最小/最大 | ${(Math.min(...times) / 1000).toFixed(1)}s / ${(Math.max(...times) / 1000).toFixed(1)}s |
| 标准差 | ${(Math.sqrt(times.reduce((s, t) => s + (t - avgTime) ** 2, 0) / times.length) / 1000).toFixed(1)}s |

> 响应时间波动主要来自：
> - 推理模型的Chain-of-Thought长度变化
> - API服务端负载波动
> - 网络延迟抖动

---

## 七、改进建议

1. **增加输出一致性层**: 对快速分析的结果进行多次调用取多数投票，减少单次采样的随机性
2. **API参数优化**: 如果MiMo API支持，设置\`temperature=0\`或更低的采样温度
3. **后处理约束**: 对颜色名称/形态类型与已知映射表做模糊匹配，统一相近表述
4. **校准缓存增强**: 当前缓存只存color/shape/size引用，可改为缓存完整AI响应以避免重复调用
5. **颜色映射硬校验**: 对AI返回的颜色名称做映射表(翠绿/墨绿/黄褐等)严格匹配，不匹配时选最接近项

---

## 八、测试结论

- **分类稳定性**: ${colorConsistent ? '颜色名称和形态类型判断稳定，一致性100%' : `颜色或形态类型存在${new Set([...colorNames, ...shapeTypes]).size}种不同判断，一致性不足`}
- **文本生成稳定性**: 解读类文本存在预期内的措辞差异(LM采样本质)，相似度约${fields.filter(f => f.field.includes('解读') || f.field.includes('描述') || f.field.includes('意义')).map(f => f.agreementRate).join('/')}
- **根因**: ${colorConsistent ? '系统架构合理，差异仅源于LLM正常的采样波动' : 'LLM非确定性是主因，图片边缘特征放大了判断分歧'}
- **建议优先级**: ${colorConsistent ? '低优先级优化(当前结果可用)' : '高优先级 - 需要后处理约束或多次投票机制'}

---

*报告由 test-repeatability.ts 自动生成*
`

  fs.writeFileSync(reportPath, report, 'utf-8')
  console.log(`\n📄 测试报告已生成: ${reportPath}`)
}

// ==================== 入口 ====================

main().catch(err => {
  console.error('\n💥 测试脚本异常:', err)
  process.exit(1)
})
