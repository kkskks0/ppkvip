import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

export default function Header({ title }: { title: string }) {
  return (
    <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
      </Toolbar>
    </AppBar>
  )
}
