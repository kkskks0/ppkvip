import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import MaleIcon from '@mui/icons-material/Male'
import FemaleIcon from '@mui/icons-material/Female'
import PersonIcon from '@mui/icons-material/Person'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockIcon from '@mui/icons-material/Lock'
import PageLayout from '../components/layout/PageLayout'
import { useLang } from '../i18n/LangContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { t } = useLang()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])

  // Form state — only essential fields, no PII (birthday/email/address/emergencyContact removed)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [healthGoal, setHealthGoal] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [dietaryPreference, setDietaryPreference] = useState('')
  const [notes, setNotes] = useState('')
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (!userId) return
    loadProfile()
    loadReports()
  }, [userId])

  const showMsg = (msg: string, severity: 'success' | 'error' = 'success') => {
    setSnackMsg(msg)
    setSnackSeverity(severity)
    setSnackOpen(true)
  }

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/profile`)
      const data = await res.json()
      if (data.code === 0) {
        const u = data.data.user
        const p = data.data.profile
        setName(u.name || '')
        setAge(u.age?.toString() || '')
        setGender(u.gender || '')
        setHealthGoal(u.healthGoal || '')
        setMedicalHistory(p.medicalHistory || '')
        setDietaryPreference(p.dietaryPreference || '')
        setNotes(p.notes || '')
        setProfile(data.data)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const loadReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/reports`)
      const data = await res.json()
      if (data.code === 0) setReports(data.data)
    } catch { /* ignore */ }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, age: age ? parseInt(age) : undefined, gender,
          healthGoal, medicalHistory, dietaryPreference, notes,
        }),
      })
      const data = await res.json()
      showMsg(data.code === 0 ? (t('profileSaved') || '档案保存成功') : (data.message || t('saveFailed') || '保存失败'), data.code === 0 ? 'success' : 'error')
    } catch {
      showMsg(t('errorNetwork'), 'error')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <PageLayout title="">
        <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress size={40} /></Box>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="">
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">{t('goBack') || '返回'}</Button>
          <Typography variant="h6" fontWeight="bold">{t('profileTitle')}</Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{t('profileDesc')}</Typography>

        {/* Member Status */}
        {profile?.user && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: profile.user.memberType === 'ANNUAL' ? '#e8f5e9' : '#fff3e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color={profile.user.memberType === 'ANNUAL' ? 'success' : 'warning'} />
              <Box>
                <Typography fontWeight="bold" fontSize={14}>
                  {t('memberStatus')}：{profile.user.memberType === 'ANNUAL' ? t('annualMemberLabel') : t('freeMemberLabel')}
                </Typography>
                {profile.user.memberExpireAt && (
                  <Typography variant="caption" color="text.secondary">
                    {t('memberExpiry')}：{new Date(profile.user.memberExpireAt).toLocaleDateString('zh-CN')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        )}

        {/* Basic Info — no PII fields */}
        <Card sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight="bold" sx={{ mb: 2 }}>{t('basicInfo')}</Typography>
            <TextField fullWidth label={t('name')} value={name} onChange={e => setName(e.target.value)} sx={{ mb: 1.5 }} size="small" />
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={6}>
                <TextField fullWidth label={t('age')} type="number" value={age} onChange={e => setAge(e.target.value)} size="small" inputProps={{ min: 1, max: 150 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label={t('healthGoal')} value={healthGoal} onChange={e => setHealthGoal(e.target.value)} size="small" placeholder={t('healthGoalPlaceholder')} />
              </Grid>
            </Grid>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{t('gender')}</Typography>
              <ToggleButtonGroup value={gender} exclusive onChange={(_, v) => setGender(v)} size="small" fullWidth>
                <ToggleButton value="male" sx={{ textTransform: 'none' }}>
                  <MaleIcon sx={{ mr: 0.5, color: '#2196F3' }} fontSize="small" /> {t('male')}
                </ToggleButton>
                <ToggleButton value="female" sx={{ textTransform: 'none' }}>
                  <FemaleIcon sx={{ mr: 0.5, color: '#E91E63' }} fontSize="small" /> {t('female')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </CardContent>
        </Card>

        {/* Health Info — medical history, diet, notes only */}
        <Card sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight="bold" sx={{ mb: 2 }}>{t('healthInfo')}</Typography>
            <TextField fullWidth label={t('medicalHistory')} value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} sx={{ mb: 1.5 }} size="small" multiline rows={2} placeholder={t('medicalHistoryPlaceholder')} />
            <TextField fullWidth label={t('dietaryPreference')} value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value)} sx={{ mb: 1.5 }} size="small" placeholder={t('dietaryPreferencePlaceholder')} />
            <TextField fullWidth label={t('notes')} value={notes} onChange={e => setNotes(e.target.value)} size="small" multiline rows={2} />
          </CardContent>
        </Card>

        {/* Report History — user's own records only */}
        <Card sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight="bold" sx={{ mb: 1.5 }}>{t('reportHistory')}（{reports.length}{t('reportCount')}）</Typography>
            {reports.length === 0 ? (
              <Typography color="text.secondary" fontSize={14}>{t('noReports')}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {reports.map((r: any) => (
                  <Chip
                    key={r.id}
                    label={new Date(r.createdAt).toLocaleDateString('zh-CN')}
                    icon={!r.isUnlocked ? <LockIcon sx={{ fontSize: 14 }} /> : undefined}
                    onClick={() => navigate(`/report/${r.id}`)}
                    color={r.isUnlocked ? 'primary' : 'default'}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Button variant="contained" fullWidth size="large" onClick={handleSave} disabled={saving}
          sx={{ borderRadius: 2, py: 1.5, fontWeight: 'bold', fontSize: 16, background: 'linear-gradient(135deg, #43A047, #2E7D32)' }}>
          {saving ? (t('saving') || '保存中...') : t('saveProfile')}
        </Button>

        <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackSeverity} variant="filled" onClose={() => setSnackOpen(false)}>{snackMsg}</Alert>
        </Snackbar>
      </Box>
    </PageLayout>
  )
}
