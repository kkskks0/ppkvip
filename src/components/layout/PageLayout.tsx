import Box from '@mui/material/Box'
import Header from './Header'
import BottomNav from './BottomNav'

export default function PageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ pb: 8 }}>
      <Header title={title} />
      <Box sx={{ p: 2 }}>{children}</Box>
      <BottomNav />
    </Box>
  )
}
