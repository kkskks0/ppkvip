import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Stack from '@mui/material/Stack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import LockIcon from '@mui/icons-material/Lock'
import DeleteIcon from '@mui/icons-material/Delete'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import PrintIcon from '@mui/icons-material/Print'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import StarIcon from '@mui/icons-material/Star'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { QRCodeSVG } from 'qrcode.react'
import PageLayout from '../components/layout/PageLayout'
import { useLang, Lang } from '../i18n/LangContext'
import { langLabels } from '../i18n/translations'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const SITE_URL = 'https://www.shengkangyan.com/ppk/'

const sevColor: Record<string, string> = { '轻度': '#4CAF50', '中度': '#FF9800', '重度': '#F44336', '严重': '#F44336', 'Mild': '#4CAF50', 'Moderate': '#FF9800', 'Severe': '#F44336' }
const sevBg: Record<string, string> = { '轻度': '#e8f5e9', '中度': '#fff3e0', '重度': '#ffebee', '严重': '#ffebee', 'Mild': '#e8f5e9', 'Moderate': '#fff3e0', 'Severe': '#ffebee' }

function Section({ title, icon, children, color = '#4CAF50' }: { title: string; icon?: React.ReactNode; children: React.ReactNode; color?: string }) {
  return (
    <Card sx={{ mb: 2.5, borderRadius: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden', pageBreakInside: 'avoid' }}>
      <Box sx={{ bgcolor: `${color}10`, px: 2.5, py: 1.5, borderBottom: `2px solid ${color}30`, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color, fontSize: 16 }}>{title}</Typography>
      </Box>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>{children}</CardContent>
    </Card>
  )
}

function CondTable({ conditions }: { conditions: { name: string; severity: string; description: string }[] }) {
  if (!conditions?.length) return null
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, mt: 1 }}>
      <Table size="small">
        <TableBody>
          {conditions.map((c, i) => (
            <TableRow key={i}>
              <TableCell sx={{ borderBottom: '1px solid #f0f0f0', py: 0.5, px: 1, minWidth: 80 }}>
                <Chip label={c.severity} size="small" sx={{ bgcolor: sevBg[c.severity] || '#f5f5f5', color: sevColor[c.severity] || '#666', fontWeight: 600, fontSize: 12, height: 26, px: 1.5 }}/>
              </TableCell>
              <TableCell sx={{ borderBottom: '1px solid #f0f0f0' }}>
                <Typography fontWeight={500} fontSize={14}>{c.name}</Typography>
                <Typography variant="body2" color="#666" fontSize={13}>{c.description}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function ReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const reportRef = useRef<HTMLDivElement>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  const showMsg = (msg: string, severity: 'success' | 'error' = 'success') => {
    setSnackMsg(msg)
    setSnackSeverity(severity)
    setSnackOpen(true)
  }

  const loadReport = () => {
    if (id) {
      fetch(`${API_BASE}/report-direct/${id}`).then(r => r.json()).then(d => {
        if (d.code === 0) setReport(d.data)
      }).finally(() => setLoading(false))
    }
  }

  useEffect(() => { loadReport() }, [id])

  // 解锁报告
  const handleUnlock = async (unlockType: 'PER_REPORT' | 'ANNUAL') => {
    setUnlocking(true)
    try {
      // Step 1: 创建支付
      const payRes = await fetch(`${API_BASE}/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: unlockType,
          userId: report?.userId,
          reportId: unlockType === 'PER_REPORT' ? id : undefined,
        }),
      })
      const payData = await payRes.json()
      if (payData.code !== 0) { showMsg(payData.message || '支付失败', 'error'); return }

      // Step 2: 解锁报告
      const unlockRes = await fetch(`${API_BASE}/report/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockType, userId: report?.userId }),
      })
      const unlockData = await unlockRes.json()
      if (unlockData.code === 0) {
        showMsg(t('unlockSuccess'), 'success')
        // 年费会员跳转到档案页
        if (unlockType === 'ANNUAL') {
          setTimeout(() => navigate(`/profile/${report?.userId}`), 1500)
        } else {
          loadReport()
        }
      } else {
        showMsg(unlockData.message || '解锁失败', 'error')
      }
    } catch {
      showMsg('支付服务异常，请稍后重试', 'error')
    } finally { setUnlocking(false) }
  }

  // 删除报告
  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/report-direct/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.code === 0) {
        showMsg(t('reportDeleted'), 'success')
        setTimeout(() => navigate('/'), 1000)
      } else {
        showMsg(data.message || '删除失败', 'error')
      }
    } catch { showMsg('删除失败，请稍后重试', 'error') }
    setDeleteOpen(false)
  }

  const handlePrint = () => window.print()

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      if (!reportRef.current) return
      // 临时显示锁定内容（PDF不受影响）
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false, windowWidth: 800 })
      const imgWidth = 210, pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/jpeg', 0.85)
      const pdf = new jsPDF('p', 'mm', 'a4')
      let pos = 0
      pdf.addImage(imgData, 'JPEG', 0, pos, imgWidth, imgHeight)
      while (pos + pageHeight < imgHeight) { pos -= pageHeight; pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, pos, imgWidth, imgHeight) }
      pdf.save(`pai-pai-kan-${report?.analysis?.reportMeta?.userName || 'user'}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e: any) { showMsg('PDF error: ' + e.message, 'error') } finally { setPdfLoading(false) }
  }

  if (loading) return <PageLayout title=""><Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress size={48} /></Box></PageLayout>
  if (!report) return <PageLayout title=""><Typography sx={{ textAlign: 'center', py: 10 }}>Not found</Typography></PageLayout>

  const a = report.analysis
  const meta = a?.reportMeta || {}
  const isUnlocked = report.isUnlocked
  const hasLocked = a?._locked

  const KVRow = ({ label, value }: { label: string; value: string }) => (
    <TableRow>
      <TableCell sx={{ fontWeight: 600, width: 120, borderBottom: '1px solid #f0f0f0', fontSize: 14, py: 0.8 }}>{label}</TableCell>
      <TableCell sx={{ borderBottom: '1px solid #f0f0f0', fontSize: 14, whiteSpace: 'normal', wordBreak: 'break-word' }}>{value || '-'}</TableCell>
    </TableRow>
  )

  return (
    <PageLayout title="">
      <Box sx={{ bgcolor: '#f0f2f5', minHeight: '100vh', pb: 10 }}>
        {/* Language */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, px: { xs: 0, md: 2 } }}>
          <ToggleButtonGroup value={lang} exclusive onChange={(_, v) => v && setLang(v)} size="small">
            {(['zh', 'zhTW', 'en'] as Lang[]).map(l => (
              <ToggleButton key={l} value={l} sx={{ textTransform: 'none', fontSize: 11, px: 1, py: 0.2 }}>{langLabels[l]}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Returning user greeting */}
        {meta.isReturningUser && (
          <Box sx={{ mx: 'auto', maxWidth: { xs: '100%', md: '210mm' }, mb: 1 }}>
            <Alert icon={<StarIcon />} severity="info" sx={{ borderRadius: 2 }}>
              {t('returningUserGreeting')}
            </Alert>
          </Box>
        )}

        <Box ref={reportRef} sx={{ width: { xs: '100%', md: '210mm' }, maxWidth: '100%', bgcolor: 'white', mx: 'auto', boxShadow: { xs: 'none', md: '0 2px 20px rgba(0,0,0,0.1)' }, borderRadius: { xs: 0, md: 2 }, overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{ background: 'linear-gradient(135deg, #1a5276, #2e86c1, #1abc9c)', color: 'white', p: { xs: 2, md: 3 }, position: 'relative' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5, fontSize: { xs: 18, md: 22 } }}>{t('reportTitle')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', opacity: 0.9 }}>
              <Typography variant="body2" fontSize={13}>{t('name')}：{meta.userName || '-'}</Typography>
              <Typography variant="body2" fontSize={13}>{t('gender')}：{meta.gender || '-'}</Typography>
              <Typography variant="body2" fontSize={13}>{meta.analysisTime || ''}</Typography>
              {isUnlocked && <Chip label={report.unlockType === 'ANNUAL' ? '年费会员' : '已解锁'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, height: 22 }} />}
            </Box>
            <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5 }}>
              <IconButton color="inherit" onClick={handleDownloadPDF} size="small" disabled={pdfLoading}>
                {pdfLoading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon fontSize="small" />}
              </IconButton>
              <IconButton color="inherit" onClick={handlePrint} size="small"><PrintIcon fontSize="small" /></IconButton>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
            {/* Overview - always visible */}
            <Section title={t('overview')} icon={<InfoIcon sx={{ fontSize: 18 }} />}>
              <Grid container spacing={1}>
                {[{ label: t('colorAnalysis'), value: a?.color?.name, bg: a?.color?.hexColor },
                  { label: t('shapeType'), value: a?.shape?.type?.slice(0, 10) },
                  { label: t('sizeCategory'), value: a?.size?.category },
                  { label: t('textureType'), value: a?.texture?.type?.slice(0, 10) },
                  { label: t('compType'), value: a?.composition?.type?.slice(0, 10) },
                  { label: t('quantity'), value: a?.quantity?.estimatedCount },
                ].map((item) => (
                  <Grid item xs={4} key={item.label}>
                    <Paper sx={{ p: 1.5, borderRadius: 1.5, borderLeft: `4px solid ${item.bg || '#4CAF50'}` }}>
                      <Typography variant="caption" color="text.secondary" fontSize={11}>{item.label}</Typography>
                      <Typography variant="body2" fontWeight="bold" fontSize={14} noWrap>{item.value || '-'}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Section>

            {/* Sample Image */}
            {meta.sampleImage && (
              <Section title={t('sampleImage')} icon={<InfoIcon sx={{ fontSize: 18 }} />} color="#607D8B">
                <Box sx={{ textAlign: 'center' }}>
                  {(() => {
                    const imgUrl = meta.sampleImage.startsWith('http') ? meta.sampleImage : `${window.location.origin}/ppk${meta.sampleImage}`
                    return <Box component="img" src={imgUrl} onError={(e: any) => { e.target.style.display = 'none' }} sx={{ maxWidth: '100%', maxHeight: 250, borderRadius: 2, border: '1px solid #e0e0e0' }} />
                  })()}
                </Box>
              </Section>
            )}

            {/* Color - always visible */}
            <Section title={t('colorAnalysis')} color="#2e86c1">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: a?.color?.hexColor || '#4CAF50' }} />
                <Box>
                  <Typography fontWeight="bold" fontSize={16}>{a?.color?.name}</Typography>
                  <Typography color="text.secondary" fontSize={13}>{t('formationTime')}：{a?.color?.formationTime}</Typography>
                </Box>
              </Box>
              <Typography sx={{ lineHeight: 1.8, color: '#444', mb: 1, fontSize: 14 }}>{a?.color?.interpretation}</Typography>
              {a?.color?.relatedConditions?.length > 0 && (
                <CondTable conditions={a.color.relatedConditions} />
              )}
            </Section>

            {/* Shape & Size - always visible */}
            <Section title={t('shapeSize')} color="#e67e22">
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                <Table size="small"><TableBody>
                  <KVRow label={t('shapeType')} value={a?.shape?.type} />
                  <KVRow label={t('shapeDesc')} value={a?.shape?.description} />
                  <KVRow label={t('shapeSignificance')} value={a?.shape?.significance} />
                  <KVRow label={t('sizeCategory')} value={`${a?.size?.category || '-'} (${a?.size?.estimatedRangeMm || '-'})`} />
                  <KVRow label={t('reference')} value={a?.size?.referenceObject} />
                </TableBody></Table>
              </TableContainer>
              {a?.shape?.relatedConditions?.length > 0 && <CondTable conditions={a.shape.relatedConditions} />}
            </Section>

            {/* ===== LOCKED CONTENT ===== */}
            {hasLocked && (
              <Card sx={{ mb: 2.5, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', border: '2px dashed #FF9800' }}>
                <Box sx={{
                  bgcolor: '#FFF8E1',
                  p: 3,
                  textAlign: 'center',
                  position: 'relative',
                }}>
                  <LockIcon sx={{ fontSize: 48, color: '#FF9800', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold" color="#E65100" sx={{ mb: 1 }}>
                    {t('reportLocked')}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto', fontSize: 14 }}>
                    {t('unlockDesc')}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                    <Button
                      variant="contained"
                      onClick={() => handleUnlock('PER_REPORT')}
                      disabled={unlocking}
                      sx={{
                        borderRadius: 2, py: 1.5, px: 3, fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                        '&:hover': { background: 'linear-gradient(135deg, #F57C00, #E65100)' },
                      }}
                    >
                      {unlocking ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                      {t('perReportPay')}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleUnlock('ANNUAL')}
                      disabled={unlocking}
                      sx={{
                        borderRadius: 2, py: 1.5, px: 3, fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #43A047, #2E7D32)',
                        '&:hover': { background: 'linear-gradient(135deg, #2E7D32, #1B5E20)' },
                      }}
                    >
                      <StarIcon sx={{ mr: 0.5 }} />
                      {t('annualPay')}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                    {t('annualPayDesc')}
                  </Typography>
                </Box>
              </Card>
            )}

            {/* ===== UNLOCKED CONTENT ===== */}
            {isUnlocked && (
              <>
                {/* Texture & Composition */}
                <Section title={t('textureCompTitle')} color="#8e44ad">
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, mb: 1 }}>
                    <Table size="small"><TableBody>
                      <KVRow label={t('textureType')} value={a?.texture?.type} />
                      <KVRow label={t('visualCues')} value={a?.texture?.visualCues} />
                      <KVRow label={t('compType')} value={a?.composition?.type} />
                      <KVRow label={t('confidence')} value={a?.composition?.confidence} />
                      <KVRow label={t('reasoning')} value={a?.composition?.reasoning} />
                    </TableBody></Table>
                  </TableContainer>
                  {a?.texture?.relatedConditions?.length > 0 && <CondTable conditions={a.texture.relatedConditions} />}
                </Section>

                {/* Pattern & Risk */}
                <Section title={t('patternRisk')} color="#c0392b">
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, mb: 1.5 }}>
                    <Table size="small"><TableBody>
                      <KVRow label={t('pattern')} value={a?.pattern?.type} />
                      <KVRow label={t('patternDesc')} value={a?.pattern?.description} />
                      <KVRow label={t('quantity')} value={`${a?.quantity?.estimatedCount || '-'} (${a?.quantity?.density || '-'})`} />
                      <KVRow label={t('quantitySignificance')} value={a?.quantity?.significance} />
                    </TableBody></Table>
                  </TableContainer>
                  {a?.diseaseRisk && (
                    <Box>
                      <Typography fontWeight="bold" fontSize={14} sx={{ mb: 0.5 }}>{t('diseaseRisk')}</Typography>
                      {a.diseaseRisk.highRisk?.length > 0 && <Box sx={{ mb: 0.5 }}><Chip icon={<WarningAmberIcon />} label={t('highRisk')} size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontSize: 12, height: 26, px: 1.5, mb: 0.3 }} />{a.diseaseRisk.highRisk.map((r: string, i: number) => <Chip key={i} label={r} size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', mr: 0.5, mb: 0.3, fontSize: 12, height: 26, px: 1.5 }} />)}</Box>}
                      {a.diseaseRisk.mediumRisk?.length > 0 && <Box sx={{ mb: 0.5 }}><Chip label={t('mediumRisk')} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: 12, height: 26, px: 1.5, mb: 0.3 }} />{a.diseaseRisk.mediumRisk.map((r: string, i: number) => <Chip key={i} label={r} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', mr: 0.5, mb: 0.3, fontSize: 12, height: 26, px: 1.5 }} />)}</Box>}
                      {a.diseaseRisk.lowRisk?.length > 0 && <Box><Chip icon={<CheckCircleIcon />} label={t('lowRisk')} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontSize: 12, height: 26, px: 1.5, mb: 0.3 }} />{a.diseaseRisk.lowRisk.map((r: string, i: number) => <Chip key={i} label={r} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', mr: 0.5, mb: 0.3, fontSize: 12, height: 26, px: 1.5 }} />)}</Box>}
                    </Box>
                  )}
                </Section>

                {/* Comprehensive */}
                <Section title={t('comprehensive')} color="#1a5276">
                  <Box sx={{ lineHeight: 2, fontSize: 14, color: '#333' }}>
                    {(a?.comprehensiveAnalysis || '').split(/([。！？])/).reduce((acc: string[], part: string, i: number) => { if (i % 2 === 0) acc.push(part); else acc[acc.length - 1] += part; return acc }, []).filter((s: string) => s.trim()).map((s: string, i: number) => {
                      const isKey = /重要|关键|建议|注意|风险|严重|警惕|务必|必须|立即|尽快|Important|Key|Attention|Risk|Severe|Must|Immediately/.test(s)
                      return <Box key={i} sx={{ mb: 0.5, pl: isKey ? 1 : 0, borderLeft: isKey ? '3px solid #e74c3c' : 'none', bgcolor: isKey ? '#fff5f5' : 'transparent', py: isKey ? 0.3 : 0, px: 0.5, borderRadius: isKey ? 0.5 : 0 }}>{s}</Box>
                    })}
                  </Box>
                </Section>

                {/* 30-Day Diet Plan */}
                {a?.dailyDietPlan?.length > 0 && (
                  <Section title={t('dailyDietPlan')} icon={<RestaurantIcon sx={{ fontSize: 18 }} />} color="#00695C">
                    {a.dailyDietPlan.map((day: any, i: number) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 1.5, bgcolor: i % 2 === 0 ? '#f9fbe7' : 'white' }}>
                        <Typography fontWeight="bold" color="#00695C" fontSize={14} sx={{ mb: 0.5 }}>
                          {t('day')}{day.day}{t('dayUnit')}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">{t('breakfast')}</Typography>
                            <Typography fontSize={13}>{day.breakfast}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">{t('lunch')}</Typography>
                            <Typography fontSize={13}>{day.lunch}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">{t('dinner')}</Typography>
                            <Typography fontSize={13}>{day.dinner}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">{t('snack')}</Typography>
                            <Typography fontSize={13}>{day.snack}</Typography>
                          </Grid>
                        </Grid>
                        {day.note && (
                          <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                            💡 {day.note}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Section>
                )}

                {/* Diet & Lifestyle */}
                <Section title={t('recommendations')} color="#27ae60">
                  {a?.dietAdvice?.map((g: any, i: number) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Typography fontWeight="bold" color="#27ae60" fontSize={14}>{g.category}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.3 }}>{g.items?.map((item: string, j: number) => <Chip key={j} label={item} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontSize: 12, height: 26, px: 1.5 }} />)}</Box>
                      {g.reason && <Typography color="text.secondary" sx={{ mt: 0.3, fontSize: 12 }}>{g.reason}</Typography>}
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  {a?.lifestyleAdvice?.map((l: any, i: number) => (
                    <Box key={i} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                        <Typography fontWeight="bold" fontSize={14}>{l.category}</Typography>
                        <Chip label={l.importance} size="small" sx={{ bgcolor: l.importance === '高' || l.importance === 'High' ? '#ffebee' : '#fff3e0', color: l.importance === '高' || l.importance === 'High' ? '#c62828' : '#e65100', fontSize: 10, height: 22, px: 1 }}/>
                      </Box>
                      <Typography color="#555" fontSize={14}>{l.advice}</Typography>
                    </Box>
                  ))}
                </Section>

                {/* Warnings */}
                <Section title={t('warnings')} color="#e74c3c">
                  {a?.warningSignals?.length > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography fontWeight="bold" fontSize={14} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}><WarningAmberIcon sx={{ fontSize: 16, color: '#e74c3c' }} /> {t('warningSignals')}</Typography>
                      {a.warningSignals.map((w: any, i: number) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1, mb: 0.5, borderRadius: 1, borderLeft: `3px solid ${sevColor[w.severity] || '#999'}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                            <Chip label={w.severity} size="small" sx={{ bgcolor: sevBg[w.severity], color: sevColor[w.severity], fontSize: 11, height: 24, px: 1.5 }}/>
                            <Typography fontWeight="bold" fontSize={14}>{w.signal}</Typography>
                          </Box>
                          <Typography color="text.secondary" fontSize={13}>{t('possible')}：{w.indicates}</Typography>
                          <Typography color="primary" display="block" fontSize={13}>{t('action')}：{w.action}</Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                  {a?.nextStepAdvice && <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: '#e3f2fd', border: '1px solid #90caf9', mb: 1.5 }}><Typography fontWeight="bold" color="#1565c0" fontSize={14} sx={{ mb: 0.3 }}>{t('nextSteps')}</Typography><Typography sx={{ lineHeight: 1.8, fontSize: 14 }}>{a.nextStepAdvice}</Typography></Paper>}
                  <Box sx={{ p: 1.5, bgcolor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}><Typography color="text.secondary" sx={{ lineHeight: 1.5, fontSize: 13 }}>⚠️ {a?.medicalDisclaimer || t('disclaimer')}</Typography></Box>
                </Section>
              </>
            )}
          </Box>
        </Box>

        {/* Bottom Actions */}
        <Box sx={{ mt: 2, mx: 'auto', maxWidth: { xs: '100%', md: '210mm' }, px: { xs: 1.5, md: 0 } }}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', mb: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
              <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}><QRCodeSVG value={SITE_URL} size={60} /></Box>
              <Box><Typography fontWeight="bold" color="#1a5276" fontSize={14}>{t('siteTitle')}</Typography><Typography variant="caption" color="text.secondary">{SITE_URL}</Typography></Box>
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" startIcon={pdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />} onClick={handleDownloadPDF} disabled={pdfLoading}
              sx={{ flex: 1, borderRadius: 2, py: 1, background: 'linear-gradient(135deg, #1a5276, #2e86c1)', fontSize: 13 }}>
              {pdfLoading ? '...' : t('downloadPDF')}
            </Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ flex: 1, borderRadius: 2, py: 1, fontSize: 13 }}>
              {t('print')}
            </Button>
            {/* Delete Report Button */}
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}
              sx={{ flex: 1, borderRadius: 2, py: 1, fontSize: 13 }}>
              {t('deleteReport')}
            </Button>
          </Stack>
        </Box>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>{t('deleteReport')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('confirmDelete')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button onClick={handleDelete} color="error" variant="contained">确认删除</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackSeverity} variant="filled" onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}>{snackMsg}</Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  )
}
