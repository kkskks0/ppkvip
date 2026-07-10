import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import DescriptionIcon from '@mui/icons-material/Description'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PageLayout from '../components/layout/PageLayout'
import { useLang, Lang } from '../i18n/LangContext'
import { langLabels } from '../i18n/translations'

const SITE_URL = 'https://www.shengkangyan.com/ppk/'

export default function HomePage() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(SITE_URL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }

  return (
    <PageLayout title="">
      <Box sx={{ bgcolor: '#f5f6fa', minHeight: '100vh' }}>
        {/* Language Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ToggleButtonGroup value={lang} exclusive onChange={(_, v) => v && setLang(v)} size="small">
            {(['zh', 'zhTW', 'en'] as Lang[]).map(l => (
              <ToggleButton key={l} value={l} sx={{ textTransform: 'none', fontSize: 12, px: 1.5, py: 0.3 }}>{langLabels[l]}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Hero */}
        <Box sx={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)', color: 'white', p: { xs: 3, md: 5 }, borderRadius: { xs: 0, md: 3 }, mb: 3, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(26,188,156,0.15)' }} />
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5, fontSize: { xs: 24, md: 32 } }}>{t('appName')}</Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, mb: 2, fontSize: 14 }}>{t('appDesc')}</Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/upload')}
            sx={{ bgcolor: '#1abc9c', color: 'white', fontWeight: 'bold', px: 4, py: 1.3, borderRadius: 3, boxShadow: '0 4px 20px rgba(26,188,156,0.4)', '&:hover': { bgcolor: '#16a085' } }}>
            {t('startAnalysis')}
          </Button>
        </Box>

        {/* Website Info */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
            <Typography variant="body2" fontWeight="bold" color="#1a5276" gutterBottom>{t('siteTitle')}</Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#f5f5f5', px: 1.5, py: 0.5, borderRadius: 1, mb: 1.5, cursor: 'pointer' }} onClick={handleCopy}>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{SITE_URL}</Typography>
              <ContentCopyIcon sx={{ fontSize: 14, color: '#999' }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <QRCodeSVG value={SITE_URL} size={100} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{t('scanToVisit')}</Typography>
          </CardContent>
        </Card>

        {/* Steps */}
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700, color: '#1a1a2e' }}>{t('threeSteps')}</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[{ icon: <CameraAltIcon sx={{ fontSize: 36, color: '#1abc9c' }} />, title: t('step1'), desc: t('step1Desc') },
            { icon: <AnalyticsIcon sx={{ fontSize: 36, color: '#3498db' }} />, title: t('step2'), desc: t('step2Desc') },
            { icon: <DescriptionIcon sx={{ fontSize: 36, color: '#e74c3c' }} />, title: t('step3'), desc: t('step3Desc') }
          ].map((step, i) => (
            <Grid item xs={4} key={i}>
              <Card sx={{ textAlign: 'center', py: 2, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <CardContent>
                  <Box sx={{ mb: 0.8 }}>{step.icon}</Box>
                  <Typography variant="body2" fontWeight="bold">{step.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{step.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Features */}
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700, color: '#1a1a2e' }}>{t('features')}</Typography>
        {[{ title: t('feat1'), desc: t('feat1Desc'), color: '#1abc9c' },
          { title: t('feat2'), desc: t('feat2Desc'), color: '#3498db' },
          { title: t('feat3'), desc: t('feat3Desc'), color: '#9b59b6' },
          { title: t('feat4'), desc: t('feat4Desc'), color: '#e67e22' },
          { title: t('feat5'), desc: t('feat5Desc'), color: '#e74c3c' },
          { title: t('feat6'), desc: t('feat6Desc'), color: '#f39c12' }
        ].map((f, i) => (
          <Card key={i} sx={{ mb: 1.5, borderRadius: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.04)', borderLeft: `4px solid ${f.color}` }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" fontWeight="bold" color={f.color}>{f.title}</Typography>
              <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
            </CardContent>
          </Card>
        ))}

        <Snackbar open={copied} autoHideDuration={2000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity="success" sx={{ width: '100%' }}>{t('copied')}</Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  )
}
