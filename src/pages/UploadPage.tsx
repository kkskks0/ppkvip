import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import UploadZone from '../components/upload/UploadZone'
import QuickInfo from '../components/upload/QuickInfo'
import PhotoGuide from '../components/upload/PhotoGuide'
import { compressImage } from '../utils/helpers'
import { useLang, Lang } from '../i18n/LangContext'
import { langLabels } from '../i18n/translations'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

interface ImageItem { file: File; preview: string }

const steps = ['uploadProgress', 'aiRecognition', 'colorShape', 'textureComp', 'riskAssess', 'genAdvice', 'genReport']

export default function UploadPage() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const [images, setImages] = useState<ImageItem[]>([])
  const [userName, setUserName] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [snackOpen, setSnackOpen] = useState(false)

  const quotes = ['quote1', 'quote2', 'quote3', 'quote4', 'quote5', 'quote6', 'quote7', 'quote8']

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [images])

  useEffect(() => {
    if (!analyzing) return
    const iv = setInterval(() => setQuoteIdx(i => (i + 1) % quotes.length), 4000)
    return () => clearInterval(iv)
  }, [analyzing])

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg)
    setSnackOpen(true)
  }, [])

  const handleUpload = useCallback(async () => {
    if (images.length === 0) return
    setAnalyzing(true)
    setCurrentStep(0)
    setProgress(0)
    try {
      // Phase 1: Upload single image
      setCurrentStep(0); setProgress(5)
      const img = images[0]
      const compressed = await compressImage(img.file)
      const formData = new FormData()
      formData.append('image', new File([compressed], 'photo.jpg'))
      const uploadRes = await fetch(`${API_BASE}/upload-direct`, {
        method: 'POST', body: formData, signal: AbortSignal.timeout(30000),
      })
      const uploadData = await uploadRes.json()
      if (uploadData.code !== 0) {
        showError(uploadData.message || t('errorUploadFailed'))
        setAnalyzing(false); return
      }

      // Phase 2: Free quick analysis
      setProgress(15); setCurrentStep(1)
      const reportRes = await fetch(`${API_BASE}/quick-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadData.data.previewUrl,
          imageKey: uploadData.data.filePath,
          userName: userName || t('defaultValue'),
          gender: gender || '未填写',
          age: age ? parseInt(age, 10) : undefined,
          medicalHistory: medicalHistory || undefined,
          lang,
        }),
        signal: AbortSignal.timeout(60000),
      })
      const reportData = await reportRes.json()
      if (reportData.code === 0) {
        let step = 1
        const iv = setInterval(() => {
          step++
          if (step < steps.length) {
            setCurrentStep(step)
            setProgress(Math.min(15 + (step / steps.length) * 80, 98))
          }
        }, 2500)
        setTimeout(() => {
          clearInterval(iv)
          setProgress(100); setCurrentStep(steps.length - 1)
          setTimeout(() => navigate(`/report/${reportData.data.reportId}`), 400)
        }, 3000)
      } else if (reportData.code === 4001) {
        showError(reportData.message || '该图片不属于排出物，请重新上传')
        setAnalyzing(false)
      } else {
        showError(reportData.message || t('errorAnalysisFailed'))
        setAnalyzing(false)
      }
    } catch (err: unknown) {
      const e = err as Error & { name?: string }
      const msg = e?.name === 'TimeoutError'
        ? '请求超时，请检查网络后重试'
        : e?.name === 'AbortError'
          ? '请求已取消'
          : t('errorNetwork')
      showError(msg)
      setAnalyzing(false)
    }
  }, [images, userName, gender, age, medicalHistory, lang, navigate, showError, t])

  return (
    <PageLayout title="">
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        {/* Language Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ToggleButtonGroup value={lang} exclusive onChange={(_, v) => v && setLang(v)} size="small">
            {(['zh', 'zhTW', 'en'] as Lang[]).map(l => (
              <ToggleButton key={l} value={l} sx={{
                textTransform: 'none', fontSize: 12, px: 1.5, py: 0.3,
                color: '#636E72', borderColor: '#D0D8E0',
                '&.Mui-selected': { color: '#0984E3', bgcolor: '#EBF3FB' },
              }}>
                {langLabels[l]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Analysis Progress */}
        {analyzing && (
          <Card sx={{
            mb: 3, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            overflow: 'hidden', border: '1px solid #EBEFF3',
          }}>
            <Box sx={{
              background: 'linear-gradient(160deg, #0C1B33 0%, #1A3A5C 100%)',
              p: 2.5, color: 'white',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={32} sx={{ color: '#00B894' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600} fontSize={15}>{t('analyzing')}</Typography>
                  <Typography fontSize={12} sx={{ opacity: 0.75 }}>{t(steps[currentStep])}</Typography>
                </Box>
                <Typography fontWeight={600} fontSize={16}>{Math.round(progress)}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  mt: 2, height: 3, borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.12)',
                  '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: '#00B894' },
                }}
              />
            </Box>
            <CardContent sx={{ p: 2 }}>
              {steps.map((step, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.2, py: 0.6,
                  opacity: i <= currentStep ? 1 : 0.3,
                  transition: 'opacity 0.3s',
                }}>
                  <Box sx={{
                    width: 20, height: 20, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    bgcolor: i < currentStep ? '#00B894' : i === currentStep ? '#0984E3' : '#D0D8E0',
                    color: 'white',
                  }}>
                    {i < currentStep ? '✓' : i + 1}
                  </Box>
                  <Typography fontSize={13} fontWeight={i === currentStep ? 600 : 400} color="#1A1A2E">
                    {t(step)}
                  </Typography>
                </Box>
              ))}
              {/* Quotes */}
              <Box sx={{
                mt: 2, p: 1.5, bgcolor: '#F8F9FA', borderRadius: 2,
                border: '1px solid #EBEFF3',
                minHeight: 40, display: 'flex', alignItems: 'center',
              }}>
                <Typography sx={{
                  fontSize: 12, color: '#636E72', fontStyle: 'italic',
                  transition: 'opacity 0.4s', lineHeight: 1.6,
                }}>
                  {t(quotes[quoteIdx])}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Upload Form */}
        {!analyzing && (
          <>
            {/* Photo Upload Zone — primary action */}
            <UploadZone images={images} onImagesChange={setImages} />

            {/* Quick Info — collapsible, optional */}
            <QuickInfo
              userName={userName}
              gender={gender}
              age={age}
              medicalHistory={medicalHistory}
              onUserNameChange={setUserName}
              onGenderChange={setGender}
              onAgeChange={setAge}
              onMedicalHistoryChange={setMedicalHistory}
            />

            {/* Photo Guide — icon cards */}
            <PhotoGuide />

            {/* Submit Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={images.length === 0}
              onClick={handleUpload}
              sx={{
                py: 1.5,
                borderRadius: 3,
                fontWeight: 600,
                fontSize: 16,
                textTransform: 'none',
                letterSpacing: '0.01em',
                bgcolor: '#0984E3',
                boxShadow: '0 4px 20px rgba(9,132,227,0.3)',
                '&:hover': {
                  bgcolor: '#0773C5',
                  boxShadow: '0 6px 28px rgba(9,132,227,0.4)',
                },
                '&.Mui-disabled': {
                  bgcolor: '#D0D8E0',
                  color: '#9EA8B0',
                },
                transition: 'all 0.25s ease',
              }}
            >
              {t('startAnalysis')}
            </Button>
          </>
        )}

        {/* Error Snackbar */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={6000}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackOpen(false)}
            severity="error"
            variant="filled"
            sx={{ width: '100%', maxWidth: 400, borderRadius: 2 }}
          >
            {errorMsg}
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  )
}
