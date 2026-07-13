import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Collapse from '@mui/material/Collapse'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import MaleIcon from '@mui/icons-material/Male'
import FemaleIcon from '@mui/icons-material/Female'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import { useLang } from '../../i18n/LangContext'

interface QuickInfoProps {
  userName: string
  gender: string
  age: string
  medicalHistory: string
  onUserNameChange: (v: string) => void
  onGenderChange: (v: string) => void
  onAgeChange: (v: string) => void
  onMedicalHistoryChange: (v: string) => void
}

export default function QuickInfo({ userName, gender, age, medicalHistory, onUserNameChange, onGenderChange, onAgeChange, onMedicalHistoryChange }: QuickInfoProps) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState(false)
  const [ageError, setAgeError] = useState('')

  const handleAgeChange = (v: string) => {
    // 仅允许数字输入
    if (v !== '' && !/^\d+$/.test(v)) return
    const num = parseInt(v, 10)
    if (v !== '' && (num < 1 || num > 120)) {
      setAgeError('年龄需在 1-120 之间')
    } else {
      setAgeError('')
    }
    onAgeChange(v)
  }

  const filledCount = [userName, gender, age, medicalHistory].filter(Boolean).length

  return (
    <Box sx={{ mb: 3 }}>
      {/* Collapsed trigger */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2,
          bgcolor: expanded ? '#F0F6FC' : '#FAFBFC',
          borderRadius: 2.5,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: expanded ? '#C5DDF6' : '#EBEFF3',
          transition: 'all 0.2s ease',
          '&:hover': { bgcolor: '#F0F6FC' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonOutlineIcon sx={{ fontSize: 18, color: expanded ? '#0984E3' : '#636E72' }} />
          <Typography sx={{
            fontSize: 13,
            fontWeight: 500,
            color: expanded ? '#0984E3' : '#636E72',
          }}>
            {t('quickInfoLabel')}
          </Typography>
          {filledCount > 0 && (
            <Typography sx={{
              fontSize: 11,
              color: '#00B894',
              bgcolor: '#E6FAF2',
              px: 1,
              py: 0.2,
              borderRadius: 1,
            }}>
              {filledCount >= 4 ? '✓ 已填写' : `✓ 已填 ${filledCount}/4`}
            </Typography>
          )}
        </Box>
        {expanded ? (
          <ExpandLessIcon sx={{ fontSize: 18, color: '#0984E3' }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 18, color: '#B2BEC3' }} />
        )}
      </Box>

      {/* Expanded form */}
      <Collapse in={expanded}>
        <Box sx={{ pt: 2, px: 1 }}>
          <TextField
            fullWidth
            label={t('name')}
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            placeholder={t('namePlaceholder')}
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              sx: {
                borderRadius: 2,
                bgcolor: 'white',
                fontSize: 14,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D0D8E0' },
              },
            }}
            InputLabelProps={{ sx: { fontSize: 13 } }}
          />
          <Box>
            <Typography variant="body2" sx={{ mb: 0.8, fontSize: 13, color: '#636E72' }}>
              {t('gender')}
            </Typography>
            <ToggleButtonGroup
              value={gender}
              exclusive
              onChange={(_, v) => onGenderChange(v)}
              fullWidth
              size="small"
            >
              <ToggleButton
                value="male"
                sx={{
                  borderRadius: '8px 0 0 8px',
                  textTransform: 'none',
                  borderColor: '#D0D8E0',
                  fontSize: 13,
                  py: 1,
                  '&.Mui-selected': { bgcolor: '#EBF5FD', color: '#0984E3' },
                }}
              >
                <MaleIcon sx={{ mr: 0.5, fontSize: 18, color: '#0984E3' }} /> {t('male')}
              </ToggleButton>
              <ToggleButton
                value="female"
                sx={{
                  borderRadius: '0 8px 8px 0',
                  textTransform: 'none',
                  borderColor: '#D0D8E0',
                  fontSize: 13,
                  py: 1,
                  '&.Mui-selected': { bgcolor: '#FFF0F3', color: '#E17055' },
                }}
              >
                <FemaleIcon sx={{ mr: 0.5, fontSize: 18, color: '#E17055' }} /> {t('female')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Age */}
          <TextField
            fullWidth
            label={t('uploadAge')}
            type="tel"
            inputMode="numeric"
            value={age}
            onChange={(e) => handleAgeChange(e.target.value)}
            placeholder={t('uploadAgeHint')}
            size="small"
            error={!!ageError}
            helperText={ageError}
            sx={{ mt: 2 }}
            InputProps={{
              sx: {
                borderRadius: 2,
                bgcolor: 'white',
                fontSize: 14,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: ageError ? '#E17055' : '#D0D8E0' },
              },
            }}
            InputLabelProps={{ sx: { fontSize: 13 } }}
          />

          {/* Medical History */}
          <TextField
            fullWidth
            label={t('uploadMedicalHistory')}
            value={medicalHistory}
            onChange={(e) => onMedicalHistoryChange(e.target.value.slice(0, 500))}
            placeholder={t('uploadMedicalHistoryHint')}
            size="small"
            multiline
            minRows={2}
            maxRows={4}
            sx={{ mt: 2 }}
            InputProps={{
              sx: {
                borderRadius: 2,
                bgcolor: 'white',
                fontSize: 14,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D0D8E0' },
              },
            }}
            InputLabelProps={{ sx: { fontSize: 13 } }}
          />
          <Typography sx={{ fontSize: 11, color: '#B2BEC3', mt: 0.5, textAlign: 'right' }}>
            {medicalHistory.length}/500
          </Typography>
        </Box>
      </Collapse>
    </Box>
  )
}
