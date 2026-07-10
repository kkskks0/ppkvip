import { useEffect, useState, useCallback } from 'react'
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
import VisibilityIcon from '@mui/icons-material/Visibility'
import DiamondIcon from '@mui/icons-material/Diamond'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LinearProgress from '@mui/material/LinearProgress'
import DeleteIcon from '@mui/icons-material/Delete'
import IosShareIcon from '@mui/icons-material/IosShare'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ScienceIcon from '@mui/icons-material/Science'
import TimelineIcon from '@mui/icons-material/Timeline'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import PageLayout from '../components/layout/PageLayout'
import { useLang, Lang } from '../i18n/LangContext'
import { langLabels } from '../i18n/translations'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const sevColor: Record<string, string> = { '轻度': '#4CAF50', '中度': '#FF9800', '重度': '#F44336', '严重': '#F44336', 'Mild': '#4CAF50', 'Moderate': '#FF9800', 'Severe': '#F44336' }
const sevBg: Record<string, string> = { '轻度': '#e8f5e9', '中度': '#fff3e0', '重度': '#ffebee', '严重': '#ffebee', 'Mild': '#e8f5e9', 'Moderate': '#fff3e0', 'Severe': '#ffebee' }

// Pre-compile regex for comprehensive analysis sentence splitting (avoid re-compilation in render)
const SENTENCE_SPLIT_RE = /([。！？.!?])/
const KEY_SENTENCE_RE = /重要|关键|建议|注意|风险|严重|警惕|务必|必须|立即|尽快|Important|Key|Attention|Risk|Severe|Must|Immediately|urgent|critical|Caution|Warning/i

function Section({ title, icon, children, color = '#4CAF50' }: { title: string; icon?: React.ReactNode; children: React.ReactNode; color?: string }) {
  return (
    <Card sx={{ mb: 2.5, borderRadius: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
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
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  const showMsg = useCallback((msg: string, severity: 'success' | 'error' = 'success') => {
    setSnackMsg(msg)
    setSnackSeverity(severity)
    setSnackOpen(true)
  }, [])

  const loadReport = useCallback(() => {
    if (id) {
      fetch(`${API_BASE}/report-direct/${id}`).then(r => r.json()).then(d => {
        if (d.code === 0) setReport(d.data)
      }).finally(() => setLoading(false))
    }
  }, [id])

  useEffect(() => { loadReport() }, [loadReport])

  // Share report — useCallback to avoid re-creation on each render
  const handleShare = useCallback(async () => {
    const shareUrl = window.location.href
    const shareTitle = t('shareTitle')
    const shareText = t('shareText')

    // Prefer Web Share API (mobile native sharing)
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        return
      } catch {
        // User cancelled, fall through to clipboard
      }
    }

    // Desktop fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`)
      showMsg(t('shareSuccess'), 'success')
    } catch {
      // Last resort: use textarea selection + execCommand
      const textarea = document.createElement('textarea')
      textarea.value = `${shareTitle}\n${shareText}\n${shareUrl}`
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        // navigator.clipboard may be blocked in some contexts; execCommand is deprecated but works as fallback
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (ok) { showMsg(t('shareSuccess'), 'success') } else { showMsg(t('shareFailed'), 'error') }
      } catch {
        document.body.removeChild(textarea)
        showMsg(t('shareFailed'), 'error')
      }
    }
  }, [showMsg, t])

  // Unlock report
  const handleUnlock = useCallback(async (unlockType: 'PER_REPORT' | 'ANNUAL') => {
    // If already unlocked, directly jump to full content without any toast
    if (report?.isUnlocked) {
      loadReport()
      // Smooth scroll to unlocked content
      setTimeout(() => {
        const el = document.getElementById('unlocked-content')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      return
    }

    setUnlocking(true)
    try {
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
      if (payData.code !== 0) { showMsg(payData.message || t('paymentFailed'), 'error'); return }

      const unlockRes = await fetch(`${API_BASE}/report/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlockType, userId: report?.userId }),
      })
      const unlockData = await unlockRes.json()
      if (unlockData.code === 0) {
        if (unlockData.data?.needsDeepAnalysis && unlockType === 'PER_REPORT') {
          showMsg(t('deepAnalysisGenerating'), 'success')
          try {
            await fetch(`${API_BASE}/report/${id}/deep-analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          } catch { /* deep analysis failure is non-blocking */ }
        }
        // Directly show full report content without redundant "unlockSuccess" toast
        loadReport()
      } else if (unlockData.code === 3003) {
        // Report already unlocked — silently jump to content
        loadReport()
      } else {
        showMsg(unlockData.message || t('unlockFailed'), 'error')
      }
    } catch {
      showMsg(t('errorPaymentFailed'), 'error')
    } finally { setUnlocking(false) }
  }, [report?.isUnlocked, report?.userId, id, loadReport, showMsg, t])

  // Delete report
  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/report-direct/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.code === 0) {
        showMsg(t('reportDeleted'), 'success')
        setTimeout(() => navigate('/'), 1000)
      } else {
        showMsg(data.message || t('errorDeleteFailed'), 'error')
      }
    } catch { showMsg(t('errorDeleteFailed'), 'error') }
    setDeleteOpen(false)
  }, [id, navigate, showMsg, t])

  if (loading) return <PageLayout title=""><Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress size={48} /></Box></PageLayout>
  if (!report) return <PageLayout title=""><Typography sx={{ textAlign: 'center', py: 10 }}>{t('notFound')}</Typography></PageLayout>

  const a = report.analysis
  const meta = a?.reportMeta || {}
  const isUnlocked = report.isUnlocked
  const hasLocked = a?._locked
  const textureValid = a?._textureValid !== false   // 默认 true（兼容旧数据）
  const compositionValid = a?._compositionValid !== false

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

        <Box sx={{ width: '100%', maxWidth: '100%', bgcolor: 'white', mx: 'auto', boxShadow: { xs: 'none', md: '0 2px 20px rgba(0,0,0,0.1)' }, borderRadius: { xs: 0, md: 2 }, overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{ background: 'linear-gradient(135deg, #1a5276, #2e86c1, #1abc9c)', color: 'white', p: { xs: 2, md: 3 }, position: 'relative' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5, fontSize: { xs: 18, md: 22 } }}>{t('reportTitle')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', opacity: 0.9 }}>
              <Typography variant="body2" fontSize={13}>{t('name')}：{meta.userName || '-'}</Typography>
              <Typography variant="body2" fontSize={13}>{t('gender')}：{meta.gender || '-'}</Typography>
              <Typography variant="body2" fontSize={13}>{meta.analysisTime || ''}</Typography>
              {isUnlocked && <Chip label={report.unlockType === 'ANNUAL' ? t('annualMemberLabel') : t('unlockedLabel')} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, height: 22 }} />}
            </Box>
            {/* Share button */}
            <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5 }}>
              <IconButton color="inherit" onClick={handleShare} size="small" aria-label={t('shareReport')}>
                <IosShareIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
            {/* Overview - always visible */}
            <Section title={t('overview')} icon={<InfoIcon sx={{ fontSize: 18 }} />}>
              <Grid container spacing={1}>
                {[
                  { label: t('colorAnalysis'), value: a?.color?.name, bg: a?.color?.hexColor, show: true },
                  { label: t('shapeType'), value: a?.shape?.type?.slice(0, 10), show: true },
                  { label: t('sizeCategory'), value: a?.size?.category, show: true },
                  { label: t('textureType'), value: a?.texture?.type?.slice(0, 10), show: textureValid },
                  { label: t('compType'), value: a?.composition?.type?.slice(0, 10), show: compositionValid },
                  { label: t('quantity'), value: a?.quantity?.estimatedCount, show: true },
                ].filter(item => item.show).map((item) => (
                  <Grid item xs={4} key={item.label}>
                    <Paper sx={{ p: 1.5, borderRadius: 1.5, borderLeft: `4px solid ${item.bg || '#4CAF50'}` }}>
                      <Typography variant="caption" color="text.secondary" fontSize={11}>{item.label}</Typography>
                      <Typography variant="body2" fontWeight="bold" fontSize={14} noWrap>{item.value || '-'}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Section>

            {/* Sample Image with magnifier */}
            {meta.sampleImage && (
              <Section title={t('sampleImage')} icon={<InfoIcon sx={{ fontSize: 18 }} />} color="#607D8B">
                <Box sx={{ textAlign: 'center' }}>
                  {(() => {
                    const imgUrl = meta.sampleImage.startsWith('http') ? meta.sampleImage : `${window.location.origin}/ppk${meta.sampleImage}`
                    return <Box component="img" src={imgUrl} onError={(e: any) => { e.target.style.display = 'none' }} sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 2, border: '1px solid #e0e0e0' }} />
                  })()}
                </Box>
              </Section>
            )}

            {/* Color - always visible, enlarged text */}
            <Section title={t('colorAnalysis')} color="#2e86c1">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: a?.color?.hexColor || '#4CAF50', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                <Box>
                  <Typography fontWeight="bold" fontSize={20}>{a?.color?.name}</Typography>
                  <Typography color="text.secondary" fontSize={14}>{t('formationTime')}：{a?.color?.formationTime}</Typography>
                </Box>
              </Box>
              <Typography sx={{ lineHeight: 2, color: '#333', mb: 1, fontSize: 15, bgcolor: '#f8fbff', p: 1.5, borderRadius: 1.5, borderLeft: '3px solid #2e86c1' }}>{a?.color?.interpretation}</Typography>
              {a?.color?.relatedConditions?.length > 0 && (
                <CondTable conditions={a.color.relatedConditions} />
              )}
            </Section>

            {/* Shape & Size - always visible, enlarged text */}
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

            {/* Texture & Composition — FREE, always visible; only when data in knowledge base */}
            {(textureValid || compositionValid) && (a?.texture?.type || a?.composition?.type) && (
              <Section title={t('textureCompTitle')} color="#8e44ad">
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, mb: 1 }}>
                  <Table size="small"><TableBody>
                    {textureValid && <KVRow label={t('textureType')} value={a?.texture?.type || '-'} />}
                    {textureValid && <KVRow label={t('visualCues')} value={a?.texture?.visualCues || a?.texture?._enriched?.description || '-'} />}
                    {compositionValid && <KVRow label={t('compType')} value={a?.composition?.type || '-'} />}
                    {compositionValid && <KVRow label={t('confidence')} value={a?.composition?.confidence || '-'} />}
                    {compositionValid && <KVRow label={t('reasoning')} value={a?.composition?.reasoning || '-'} />}
                  </TableBody></Table>
                </TableContainer>
                {a?.texture?.relatedConditions?.length > 0 && textureValid && <CondTable conditions={a.texture.relatedConditions} />}
              </Section>
            )}

            {/* ===== LOCKED CONTENT: Product-driven conversion design ===== */}
            {hasLocked && (
              <Box sx={{ mt: 2 }}>
                {/* Progress indicator */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Typography variant="body2" fontWeight={600} color="text.secondary" fontSize={13}>
                        {t('freePreview')}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#FF9800" fontSize={13}>
                        {t('viewedItems').replace('{n}', '5').replace('{total}', '10')}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={50}
                      sx={{
                        height: 6, borderRadius: 3, bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #4CAF50, #FF9800)',
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
                    <Typography variant="caption" color="text.secondary">
                      {t('freeContentLabel')}
                    </Typography>
                  </Box>
                </Card>

                {/* ===== Gaussian Blur Preview: Information-gap teaser ===== */}
                <Card sx={{
                  mb: 2, borderRadius: 2,
                  boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                  position: 'relative',
                }}>
                  {/* Blurred mock report content */}
                  <Box sx={{
                    filter: 'blur(10px)',
                    WebkitFilter: 'blur(10px)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    p: 2.5,
                    bgcolor: '#fafbfc',
                    opacity: 0.85,
                  }}>
                    {/* Section header mimic */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Box sx={{ width: 28, height: 4, bgcolor: '#FF9800', borderRadius: 1 }} />
                      <Box sx={{ width: 160, height: 16, bgcolor: '#ccc', borderRadius: 1 }} />
                    </Box>

                    {/* Data overview row — blurred key metrics */}
                    <Grid container spacing={1.5} sx={{ mb: 2 }}>
                      {['#f44336', '#ff9800', '#4caf50', '#2196f3'].map((color, i) => (
                        <Grid item xs={3} key={i}>
                          <Box sx={{
                            p: 1.2, borderRadius: 1, bgcolor: 'white',
                            border: '1px solid #e8e8e8',
                          }}>
                            <Box sx={{ width: 32, height: 6, bgcolor: color, borderRadius: 1, mb: 1, opacity: 0.7 }} />
                            <Box sx={{ width: '80%', height: 8, bgcolor: '#ddd', borderRadius: 1, mb: 0.5 }} />
                            <Box sx={{ width: '60%', height: 12, bgcolor: '#bbb', borderRadius: 1 }} />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {/* Risk indicator bar mimic */}
                    <Box sx={{
                      p: 1.5, borderRadius: 1, mb: 2,
                      bgcolor: '#fff8e1', border: '1px solid #ffe0b2',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f44336' }} />
                        <Box sx={{ width: 80, height: 10, bgcolor: '#e0e0e0', borderRadius: 1 }} />
                        <Box sx={{ width: 60, height: 8, bgcolor: '#ddd', borderRadius: 1, ml: 'auto' }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {[0, 1, 2].map((_, i) => (
                          <Box key={i} sx={{ flex: 1, height: 18, bgcolor: i === 0 ? '#ffcdd2' : i === 1 ? '#ffe0b2' : '#c8e6c9', borderRadius: 1 }} />
                        ))}
                      </Box>
                    </Box>

                    {/* Full-width text paragraph blocks — simulate analysis content */}
                    {[100, 70, 90, 60, 85, 95].map((w, i) => (
                      <Box key={i} sx={{
                        width: `${w}%`, height: 11,
                        bgcolor: i % 3 === 0 ? '#c8c8c8' : '#e0e0e0',
                        borderRadius: 1, mb: 0.8, ml: i % 4 === 0 ? 3 : 0,
                      }} />
                    ))}

                    {/* Divider */}
                    <Box sx={{ borderTop: '1px solid #e8e8e8', my: 1.5 }} />

                    {/* Sub-section headers + compact text blocks */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Box sx={{
                        flex: 1,
                        p: 1.2, borderRadius: 1, bgcolor: 'white',
                        border: '1px solid #e8e8e8',
                      }}>
                        <Box sx={{ width: '50%', height: 8, bgcolor: '#bbb', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '90%', height: 6, bgcolor: '#ddd', borderRadius: 1, mb: 0.5 }} />
                        <Box sx={{ width: '75%', height: 6, bgcolor: '#ddd', borderRadius: 1, mb: 0.5 }} />
                        <Box sx={{ width: '60%', height: 6, bgcolor: '#ddd', borderRadius: 1 }} />
                      </Box>
                      <Box sx={{
                        flex: 1,
                        p: 1.2, borderRadius: 1, bgcolor: 'white',
                        border: '1px solid #e8e8e8',
                      }}>
                        <Box sx={{ width: '40%', height: 8, bgcolor: '#bbb', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '85%', height: 6, bgcolor: '#ddd', borderRadius: 1, mb: 0.5 }} />
                        <Box sx={{ width: '70%', height: 6, bgcolor: '#ddd', borderRadius: 1, mb: 0.5 }} />
                        <Box sx={{ width: '55%', height: 6, bgcolor: '#ddd', borderRadius: 1 }} />
                      </Box>
                    </Box>

                    {/* Data points row — simulate scores/numbers */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      {[40, 55, 65, 70, 50].map((w, i) => (
                        <Box key={i} sx={{
                          px: 1.5, py: 0.6, borderRadius: 2,
                          bgcolor: i === 2 ? '#fff3e0' : '#f5f5f5',
                          border: `1px solid ${i === 2 ? '#ffcc80' : '#e0e0e0'}`,
                          width: `${w}px`,
                          height: 20,
                        }} />
                      ))}
                    </Box>
                  </Box>

                  {/* Gradient overlay at the bottom + CTA */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent 0%, rgba(255,255,255,0.85) 40%, white 100%)',
                    pt: 8, pb: 2.5, px: 2.5,
                    textAlign: 'center',
                    zIndex: 2,
                  }}>
                    <LockIcon sx={{ fontSize: 24, color: '#FF9800', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} color="#E65100" sx={{ mb: 0.5 }}>
                      {t('reportLocked')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ mb: 0.5 }}>
                      {t('blurPreviewHint')}
                    </Typography>
                  </Box>
                </Card>

                {/* Premium content teasers + CTA section */}
                <Card sx={{ mb: 2, borderRadius: 2, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #FFE0B2' }}>
                  {/* Teaser header */}
                  <Box sx={{
                    background: 'linear-gradient(135deg, #FFF8E1, #FFF3E0)',
                    px: 2.5, py: 2,
                    borderBottom: '1px dashed #FFCC80',
                    textAlign: 'center',
                  }}>
                    <LockIcon sx={{ fontSize: 32, color: '#FF9800', mb: 0.5 }} />
                    <Typography variant="h6" fontWeight={700} color="#E65100" sx={{ mb: 0.5 }}>
                      {t('reportLocked')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontSize={13}>
                      {t('unlockToView')}
                    </Typography>
                  </Box>

                  {/* Premium content preview grid — no blur, clean teasers */}
                  <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                    <Grid container spacing={1}>
                      {[
                        // premiumTeaser1 (质地成分) 已移至免费区域
                        t('premiumTeaser2'), t('premiumTeaser3'),
                        t('premiumTeaser4'), t('premiumTeaser5'), t('premiumTeaser6'),
                        t('premiumTeaser7'),
                      ].map((label, i) => (
                        <Grid item xs={6} sm={4} key={i}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.2, borderRadius: 1.5, textAlign: 'center',
                              position: 'relative',
                              bgcolor: 'white',
                              border: '1px solid #e8e8e8',
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: '#FF9800', bgcolor: '#FFF8E1' },
                            }}
                          >
                            <LockIcon sx={{ fontSize: 14, color: '#FF9800', mb: 0.3 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={500} fontSize={11}>
                              {label}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Payment cards stacked vertically */}
                  <Box sx={{ p: 2, bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Card 1: 按次解锁 */}
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 2, overflow: 'hidden',
                        border: '2px solid #FF9800',
                        bgcolor: '#FFF8E1',
                        position: 'relative',
                      }}
                    >
                      <Box sx={{
                        position: 'absolute', top: 0, right: 0,
                        bgcolor: '#FF9800', color: 'white',
                        px: 1.5, py: 0.3,
                        borderBottomLeftRadius: 8,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {t('badgeRecommended')}
                      </Box>
                      <Box sx={{ p: 2, pb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#E65100" sx={{ mb: 0.2 }}>
                          {t('perReportTitle')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3, mb: 0.8 }}>
                          <Typography variant="h5" fontWeight={800} color="#F57C00">
                            {t('perReportPrice')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">/{t('perReportUnit')}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontSize={12}>
                          {t('perReportSubtitle')}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleIcon sx={{ fontSize: 14, color: '#4CAF50' }} />
                            <Typography variant="caption" fontSize={12}>{t('perReportFeature1')}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleIcon sx={{ fontSize: 14, color: '#4CAF50' }} />
                            <Typography variant="caption" fontSize={12}>{t('perReportFeature2')}</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleUnlock('PER_REPORT')}
                        disabled={unlocking}
                        endIcon={unlocking ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                        sx={{
                          borderRadius: 0, py: 1.5, fontWeight: 700, fontSize: 15,
                          background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                          '&:hover': { background: 'linear-gradient(135deg, #F57C00, #E65100)' },
                          '&:disabled': { background: '#ccc' },
                        }}
                      >
                        {t('perReportCta')}
                      </Button>
                    </Paper>

                    {/* Card 2: 年费会员 */}
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 2, overflow: 'hidden',
                        border: '2px solid #66BB6A',
                        bgcolor: '#F1F8E9',
                        position: 'relative',
                      }}
                    >
                      <Box sx={{
                        position: 'absolute', top: 0, right: 0,
                        bgcolor: '#43A047', color: 'white',
                        px: 1.5, py: 0.3,
                        borderBottomLeftRadius: 8,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {t('badgeBestValue')}
                      </Box>
                      <Box sx={{ p: 2, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                          <WorkspacePremiumIcon sx={{ fontSize: 20, color: '#43A047' }} />
                          <Typography variant="subtitle1" fontWeight={700} color="#2E7D32">
                            {t('annualTitle').replace('⭐ ', '')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3, mb: 0.8 }}>
                          <Typography variant="h5" fontWeight={800} color="#388E3C">
                            {t('annualPrice')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">/{t('annualUnit')}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontSize={12}>
                          {t('annualSubtitle')}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DiamondIcon sx={{ fontSize: 14, color: '#43A047' }} />
                            <Typography variant="caption" fontSize={12}>{t('annualFeature1')}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DiamondIcon sx={{ fontSize: 14, color: '#43A047' }} />
                            <Typography variant="caption" fontSize={12}>{t('annualFeature2')}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DiamondIcon sx={{ fontSize: 14, color: '#43A047' }} />
                            <Typography variant="caption" fontSize={12}>{t('annualFeature3')}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DiamondIcon sx={{ fontSize: 14, color: '#43A047' }} />
                            <Typography variant="caption" fontWeight={600} color="#E65100" fontSize={12}>
                              {t('annualFeature4')}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleUnlock('ANNUAL')}
                        disabled={unlocking}
                        endIcon={unlocking ? <CircularProgress size={16} color="inherit" /> : <WorkspacePremiumIcon />}
                        sx={{
                          borderRadius: 0, py: 1.5, fontWeight: 700, fontSize: 15,
                          background: 'linear-gradient(135deg, #43A047, #2E7D32)',
                          '&:hover': { background: 'linear-gradient(135deg, #2E7D32, #1B5E20)' },
                          '&:disabled': { background: '#ccc' },
                        }}
                      >
                        {t('annualCta')}
                      </Button>
                    </Paper>
                  </Box>

                  {/* Trust footer */}
                  <Box sx={{
                    px: 2, py: 1.5, bgcolor: '#fafafa',
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                  }}>
                    <VerifiedUserIcon sx={{ fontSize: 14, color: '#9E9E9E' }} />
                    <Typography variant="caption" color="text.secondary" fontSize={11}>
                      {t('trustFooter')}
                    </Typography>
                  </Box>
                </Card>
              </Box>
            )}

            {/* ===== UNLOCKED CONTENT ===== */}
            {isUnlocked && (
              <Box id="unlocked-content">
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
                    {(a?.comprehensiveAnalysis || '').split(SENTENCE_SPLIT_RE).reduce((acc: string[], part: string, i: number) => { if (i % 2 === 0) acc.push(part); else acc[acc.length - 1] += part; return acc }, []).filter((s: string) => s.trim()).map((s: string, i: number) => {
                      const isKey = KEY_SENTENCE_RE.test(s)
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
              </Box>
            )}
          </Box>
        </Box>

        {/* Bottom Actions — Mobile optimized */}
        <Box sx={{ mt: 2, mx: 'auto', maxWidth: { xs: '100%', md: '210mm' }, px: { xs: 1.5, md: 0 } }}>
          {/* Share & Delete */}
          <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<IosShareIcon />}
              onClick={handleShare}
              sx={{
                flex: 1, borderRadius: 2, py: 1.2, fontSize: 14, fontWeight: 600,
                background: 'linear-gradient(135deg, #1a5276, #2e86c1)',
                '&:hover': { background: 'linear-gradient(135deg, #154360, #2471a3)' },
              }}
            >
              {t('shareReport')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteOpen(true)}
              sx={{ borderRadius: 2, py: 1.2, fontSize: 13, minWidth: 100 }}
            >
              {t('deleteReport')}
            </Button>
          </Stack>

          {/* ===== Brand Promotion Module ===== */}
          <Card sx={{
            borderRadius: 3, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(26,82,118,0.12)',
            border: '1px solid #e3f2fd',
          }}>
            {/* Top gradient banner */}
            <Box sx={{
              background: 'linear-gradient(135deg, #1a5276 0%, #2e86c1 50%, #1abc9c 100%)',
              px: 2.5, py: 2.5,
              color: 'white', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative circles */}
              <Box sx={{
                position: 'absolute', top: -30, right: -20,
                width: 120, height: 120, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.08)',
              }} />
              <Box sx={{
                position: 'absolute', bottom: -40, left: -30,
                width: 160, height: 160, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.06)',
              }} />
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, fontSize: { xs: 17, md: 20 }, letterSpacing: 0.5 }}>
                  {t('brandPromoTitle')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: 13, maxWidth: 320, mx: 'auto' }}>
                  {t('brandPromoDesc')}
                </Typography>
              </Box>
            </Box>

            {/* Feature items */}
            <Box sx={{ px: 2, py: 2, bgcolor: '#f8faff' }}>
              <Grid container spacing={1}>
                {[
                  { icon: <ScienceIcon />, text: t('brandPromoFeature1') },
                  { icon: <TimelineIcon />, text: t('brandPromoFeature2') },
                  { icon: <MenuBookIcon />, text: t('brandPromoFeature3') },
                  { icon: <TrendingUpIcon />, text: t('brandPromoFeature4') },
                ].map((item, i) => (
                  <Grid item xs={6} key={i}>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      p: 1.2, borderRadius: 1.5,
                      bgcolor: 'white', border: '1px solid #e8edf5',
                    }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1,
                        bgcolor: `${['#2e86c1', '#1abc9c', '#e67e22', '#8e44ad'][i]}15`,
                        color: ['#2e86c1', '#1abc9c', '#e67e22', '#8e44ad'][i],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {item.icon}
                      </Box>
                      <Typography variant="caption" fontWeight={500} fontSize={11} color="#37474f" lineHeight={1.3}>
                        {item.text}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* CTA Button */}
            <Box sx={{ px: 2, pb: 2, bgcolor: '#f8faff' }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/')}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: 15,
                  background: 'linear-gradient(135deg, #2e86c1, #1abc9c)',
                  boxShadow: '0 4px 14px rgba(26,188,156,0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #2471a3, #17a589)', boxShadow: '0 6px 20px rgba(26,188,156,0.45)' },
                  transition: 'all 0.3s',
                }}
              >
                {t('brandPromoCta')}
              </Button>
            </Box>

            {/* Trust footer */}
            <Box sx={{
              px: 2, py: 1.5,
              bgcolor: '#eceff1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              borderTop: '1px solid #e0e0e0',
            }}>
              <VerifiedUserIcon sx={{ fontSize: 14, color: '#78909c' }} />
              <Typography variant="caption" color="text.secondary" fontSize={11}>
                {t('trustFooter')}
              </Typography>
              <Typography variant="caption" color="#90a4ae" fontSize={10}>
                · {t('poweredBy')}
              </Typography>
            </Box>
          </Card>

          {/* ===== WeChat Official Account Follow Section ===== */}
          <Card sx={{
            mt: 2, borderRadius: 3, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(7,193,96,0.12)',
            border: '1px solid #e8f5e9',
          }}>
            {/* Header — WeChat green */}
            <Box sx={{
              background: 'linear-gradient(135deg, #07C160 0%, #06ad56 100%)',
              px: 2.5, py: 2,
              color: 'white', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <Box sx={{
                position: 'absolute', top: -20, right: -20,
                width: 100, height: 100, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.1)',
              }} />
              <Box sx={{
                position: 'absolute', bottom: -30, left: -30,
                width: 120, height: 120, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.08)',
              }} />
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.27C7.44 16.11 8.2 16.31 9 16.41c-.03-.22-.05-.45-.05-.68 0-3.04 3.13-5.5 7-5.5.66 0 1.3.07 1.91.2C17.24 6.4 13.72 4 9.5 4zM7 8.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                  <path d="M16 11c-3.31 0-6 2.24-6 5s2.69 5 6 5c.63 0 1.24-.08 1.82-.22L20 22l-.55-1.83C20.71 19.21 22 17.72 22 16c0-2.76-2.69-5-6-5zm-2 3.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
                <Typography variant="h6" fontWeight={700} fontSize={{ xs: 17, md: 19 }}>
                  {t('wechatFollowTitle')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#f8fff9' }}>
              <Grid container spacing={3} alignItems="center">
                {/* QR Code — centered on mobile, left on desktop */}
                <Grid item xs={12} md={5} sx={{ textAlign: 'center' }}>
                  <Box
                    component="img"
                    src="/qr-metabolism-optimize.png"
                    alt={t('wechatQrAlt')}
                    onError={(e: any) => { e.target.style.display = 'none' }}
                    sx={{
                      width: { xs: 180, sm: 200, md: 210 },
                      height: 'auto',
                      borderRadius: 2,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      border: '4px solid white',
                      bgcolor: 'white',
                    }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1.2, color: '#07C160', fontWeight: 600, fontSize: 12 }}>
                    {t('wechatQrHint')}
                  </Typography>
                </Grid>

                {/* Text + CTA */}
                <Grid item xs={12} md={7}>
                  <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                    <Typography variant="body1" sx={{
                      color: '#1b5e20',
                      fontWeight: 600,
                      mb: 2,
                      fontSize: { xs: 14, md: 15.5 },
                      lineHeight: 1.7,
                    }}>
                      {t('wechatOfficialNotice')}
                    </Typography>

                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.27C7.44 16.11 8.2 16.31 9 16.41c-.03-.22-.05-.45-.05-.68 0-3.04 3.13-5.5 7-5.5.66 0 1.3.07 1.91.2C17.24 6.4 13.72 4 9.5 4zM7 8.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                          <path d="M16 11c-3.31 0-6 2.24-6 5s2.69 5 6 5c.63 0 1.24-.08 1.82-.22L20 22l-.55-1.83C20.71 19.21 22 17.72 22 16c0-2.76-2.69-5-6-5zm-2 3.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                        </svg>
                      }
                      onClick={() => {
                        // Copy public account name to clipboard for easy search
                        navigator.clipboard.writeText(t('wechatAccountName')).then(() => {
                          showMsg(t('wechatCopied'), 'success')
                        }).catch(() => { /* ignore copy errors */ })
                      }}
                      sx={{
                        borderRadius: 2,
                        py: 1.3,
                        fontWeight: 700,
                        fontSize: 15,
                        bgcolor: '#07C160',
                        boxShadow: '0 4px 14px rgba(7,193,96,0.35)',
                        '&:hover': { bgcolor: '#06ad56', boxShadow: '0 6px 20px rgba(7,193,96,0.45)' },
                        transition: 'all 0.3s',
                      }}
                    >
                      {t('wechatFollowBtn')}
                    </Button>

                    <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary', fontSize: 12 }}>
                      {t('wechatCopyHint')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Box>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon color="error" />
            {t('deleteReport')}
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" variant="outlined" sx={{ mb: 1 }}>
              <DialogContentText sx={{ color: 'error.dark', fontWeight: 500 }}>
                {t('confirmDelete')}
              </DialogContentText>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteOpen(false)} variant="outlined">
              {t('cancel')}
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              {t('confirmDeleteBtn')}
            </Button>
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
