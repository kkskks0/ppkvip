import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LangProvider } from './i18n/LangContext'
import AppRoutes from './routes'

const theme = createTheme({
  palette: {
    primary: { main: '#4CAF50' },
    secondary: { main: '#FFC107' },
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LangProvider>
        <BrowserRouter basename="/ppk">
          <AppRoutes />
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  )
}
