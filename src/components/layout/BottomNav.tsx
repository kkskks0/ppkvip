import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import HistoryIcon from '@mui/icons-material/History'
import PersonIcon from '@mui/icons-material/Person'
import { useLang } from '../../i18n/LangContext'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLang()
  const [value, setValue] = useState(() => {
    const path = location.pathname === '/profile' ? '/profile' : location.pathname
    const idx = [{ path: '/' }, { path: '/upload' }, { path: '/profile' }, { path: '/profile' }].findIndex(t => t.path === path)
    return idx >= 0 ? idx : 0
  })

  const tabs = [
    { label: t('navHome'), path: '/', icon: <HomeIcon /> },
    { label: t('navAnalyze'), path: '/upload', icon: <CameraAltIcon /> },
    { label: t('navReports'), path: '/profile', icon: <HistoryIcon /> },
    { label: t('navProfile'), path: '/profile', icon: <PersonIcon /> },
  ]

  return (
    <BottomNavigation
      value={value}
      onChange={(_, newValue) => {
        setValue(newValue)
        navigate(tabs[newValue].path)
      }}
      showLabels
      sx={{ position: 'fixed', bottom: 0, width: '100%' }}
    >
      {tabs.map((tab) => (
        <BottomNavigationAction key={tab.label} label={tab.label} icon={tab.icon} />
      ))}
    </BottomNavigation>
  )
}
