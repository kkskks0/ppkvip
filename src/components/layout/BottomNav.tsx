import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import HistoryIcon from '@mui/icons-material/History'
import PersonIcon from '@mui/icons-material/Person'

const tabs = [
  { label: '首页', path: '/', icon: <HomeIcon /> },
  { label: '分析', path: '/upload', icon: <CameraAltIcon /> },
  { label: '报告', path: '/profile', icon: <HistoryIcon /> },
  { label: '我的', path: '/profile', icon: <PersonIcon /> },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [value, setValue] = useState(tabs.findIndex((t) => t.path === location.pathname) || 0)

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
