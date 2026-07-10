import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { useAuthStore } from '../store/authStore'
import { sendCode } from '../services/auth'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  const handleSendCode = async () => {
    await sendCode(phone)
    setCodeSent(true)
  }

  const handleLogin = async () => {
    await login(phone, code)
    navigate('/')
  }

  return (
    <PageLayout title="登录">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
        <TextField fullWidth label="手机号" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField fullWidth label="验证码" value={code} onChange={(e) => setCode(e.target.value)} disabled={!codeSent} />
        <Button variant="outlined" onClick={handleSendCode} disabled={!phone || codeSent}>
          {codeSent ? '已发送' : '获取验证码'}
        </Button>
        <Button variant="contained" fullWidth onClick={handleLogin} disabled={!phone || !code}>
          登录
        </Button>
      </Box>
    </PageLayout>
  )
}
