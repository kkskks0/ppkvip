import { useState, useRef, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import DeleteIcon from '@mui/icons-material/Delete'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import MaleIcon from '@mui/icons-material/Male'
import FemaleIcon from '@mui/icons-material/Female'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { compressImage } from '../utils/helpers'
import { useLang, Lang } from '../i18n/LangContext'
import { langLabels } from '../i18n/translations'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

interface ImageItem { file: File; preview: string }

const steps = ['uploadProgress', 'aiRecognition', 'colorShape', 'textureComp', 'riskAssess', 'genAdvice', 'genReport']

export default function UploadPage() {
  const navigate = useNavigate()
  const { lang, setLang, t } = useLang()
  const fileRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<ImageItem[]>([])
  const [userName, setUserName] = useState('')
  const [gender, setGender] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [snackOpen, setSnackOpen] = useState(false)

  const quotes = ['quote1', 'quote2', 'quote3', 'quote4', 'quote5', 'quote6', 'quote7', 'quote8']

  // Cleanup blob URLs on unmount to prevent memory leaks
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

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImages(prev => {
      const remaining = 3 - prev.length
      const newItems: ImageItem[] = files.slice(0, remaining).map(f => ({ file: f, preview: URL.createObjectURL(f) }))
      return [...prev, ...newItems].slice(0, 3)
    })
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleRemove = useCallback((index: number) => {
    setImages(prev => {
      const img = prev[index]
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleUpload = useCallback(async () => {
    if (images.length === 0) return
    setAnalyzing(true)
    setCurrentStep(0)
    setProgress(0)
    try {
      // Phase 1: Upload images
      setCurrentStep(0); setProgress(5)
      const uploadedFiles: { imageUrl: string; imageKey: string }[] = []
      for (const img of images) {
        const compressed = await compressImage(img.file)
        const formData = new FormData()
        formData.append('image', new File([compressed], 'photo.jpg'))
        const uploadRes = await fetch(`${API_BASE}/upload-direct`, { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadData.code !== 0) {
          showError(uploadData.message || t('errorUploadFailed'))
          setAnalyzing(false); return
        }
        uploadedFiles.push({ imageUrl: uploadData.data.previewUrl, imageKey: uploadData.data.filePath })
      }

      // Phase 2: Free quick analysis
      setProgress(15); setCurrentStep(1)
      const reportRes = await fetch(`${API_BASE}/quick-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedFiles,
          imageUrl: uploadedFiles[0].imageUrl,
          imageKey: uploadedFiles[0].imageKey,
          userName: userName || t('defaultValue'),
          gender: gender || '未填写',
          lang,
        }),
      })
      const reportData = await reportRes.json()
      if (reportData.code === 0) {
        let step = 1
        const iv = setInterval(() => { step++; if (step < steps.length) { setCurrentStep(step); setProgress(Math.min(15 + (step / steps.length) * 80, 98)) } }, 2500)
        setTimeout(() => {
          clearInterval(iv)
          setProgress(100); setCurrentStep(steps.length - 1)
          setTimeout(() => navigate(`/report/${reportData.data.reportId}`), 400)
        }, 3000)
      } else {
        showError(reportData.message || t('errorAnalysisFailed'))
        setAnalyzing(false)
      }
    } catch {
      showError(t('errorNetwork'))
      setAnalyzing(false)
    }
  }, [images, userName, gender, lang, navigate, showError, t])

  return (
    <PageLayout title="">
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />

        {/* Language Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ToggleButtonGroup value={lang} exclusive onChange={(_, v) => v && setLang(v)} size="small">
            {(['zh', 'zhTW', 'en'] as Lang[]).map(l => (
              <ToggleButton key={l} value={l} sx={{ textTransform: 'none', fontSize: 12, px: 1.5, py: 0.3 }}>{langLabels[l]}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Analysis Progress */}
        {analyzing && (
          <Card sx={{ mb: 2, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <Box sx={{ background: 'linear-gradient(135deg, #1a5276, #2e86c1)', p: 2, color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={28} color="inherit" />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight="bold" fontSize={14}>{t('analyzing')}</Typography>
                  <Typography fontSize={12} sx={{ opacity: 0.85 }}>{t(steps[currentStep])}</Typography>
                </Box>
                <Typography fontWeight="bold">{Math.round(progress)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: '#1abc9c' } }} />
            </Box>
            <CardContent sx={{ p: 1.5 }}>
              {steps.map((step, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, opacity: i <= currentStep ? 1 : 0.35 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', bgcolor: i < currentStep ? '#4CAF50' : i === currentStep ? '#FF9800' : '#e0e0e0', color: 'white' }}>
                    {i < currentStep ? '✓' : i + 1}
                  </Box>
                  <Typography fontSize={12} fontWeight={i === currentStep ? 'bold' : 'normal'}>{t(step)}</Typography>
                </Box>
              ))}
              {/* Rotating quotes */}
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, minHeight: 50, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontSize={12} sx={{ fontStyle: 'italic', transition: 'opacity 0.5s' }}>
                  {t(quotes[quoteIdx])}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        {!analyzing && (
          <>
            <TextField fullWidth label={t('name')} value={userName} onChange={(e) => setUserName(e.target.value)}
              placeholder={t('namePlaceholder')} sx={{ mb: 1.5 }} InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 16 } }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: 13 }}>{t('gender')}</Typography>
              <ToggleButtonGroup value={gender} exclusive onChange={(_, v) => setGender(v)} fullWidth size="small">
                <ToggleButton value="male" sx={{ borderRadius: '8px 0 0 8px', textTransform: 'none', borderColor: '#e0e0e0', fontSize: 14 }}>
                  <MaleIcon sx={{ mr: 0.5, color: '#2196F3' }} fontSize="small" /> {t('male')}
                </ToggleButton>
                <ToggleButton value="female" sx={{ borderRadius: '0 8px 8px 0', textTransform: 'none', borderColor: '#e0e0e0', fontSize: 14 }}>
                  <FemaleIcon sx={{ mr: 0.5, color: '#E91E63' }} fontSize="small" /> {t('female')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: 13 }}>{t('imageCount')}</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: images.length < 3 ? `repeat(${images.length + 1}, 1fr)` : 'repeat(3, 1fr)', gap: 1, mb: 1.5 }}>
              {images.map((img, i) => (
                <Card key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '1' }}>
                  <Box component="img" src={img.preview} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton onClick={() => handleRemove(i)} size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" sx={{ position: 'absolute', bottom: 4, left: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', px: 0.5, borderRadius: 0.5, fontSize: 11 }}>{i + 1}</Typography>
                </Card>
              ))}
              {images.length < 3 && (
                <Card onClick={() => fileRef.current?.click()} sx={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, border: '2px dashed #ccc', cursor: 'pointer', '&:hover': { borderColor: '#4CAF50', bgcolor: '#f1f8e9' } }}>
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <AddPhotoAlternateIcon sx={{ fontSize: 32, color: '#4CAF50' }} />
                    <Typography variant="caption" color="text.secondary" display="block" fontSize={11}>{t('add')}</Typography>
                  </CardContent>
                </Card>
              )}
            </Box>

            <Card sx={{ mb: 2, borderRadius: 2, bgcolor: '#fff8e1', border: '1px solid #ffe082' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <LightbulbIcon sx={{ fontSize: 16, color: '#f9a825' }} />
                  <Typography fontWeight="bold" color="#f57f17" fontSize={13}>{t('tips')}</Typography>
                </Box>
                <Typography variant="caption" color="#555" sx={{ display: 'block', lineHeight: 1.8, fontSize: 12 }}>
                  · {t('tip1')}<br/>
                  · {t('tip2')}<br/>
                  · {t('tip3')}<br/>
                  · {t('tip4')}<br/>
                  · {t('tip5')}
                </Typography>
              </CardContent>
            </Card>

            <Button variant="contained" fullWidth size="large" disabled={images.length === 0} onClick={handleUpload}
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold', fontSize: 16, background: 'linear-gradient(135deg, #43A047, #2E7D32)', boxShadow: '0 4px 16px rgba(76,175,80,0.4)' }}>
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
            sx={{ width: '100%', maxWidth: 400 }}
          >
            {errorMsg}
          </Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  )
}
