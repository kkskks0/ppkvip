import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { PRICING } from '../utils/constants'
import { createOrder } from '../services/payment'
import api from '../services/api'

export default function PaymentPage() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState('PER_REPORT')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeUrl, setCodeUrl] = useState<string | null>(null)
  const [tradeNo, setTradeNo] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await createOrder(plan)
      if (res.code === 0) {
        const data = res.data as any
        if (data.demoMode) {
          // Demo mode: show simulate button
          setDemoMode(true)
          setTradeNo(data.tradeNo)
        } else if (data.payUrl) {
          window.location.href = data.payUrl
        } else if (data.codeUrl) {
          setCodeUrl(data.codeUrl)
        }
      }
    } catch {
      alert('创建订单失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoPay = async () => {
    if (!tradeNo) return
    setLoading(true)
    try {
      const res = await api.post('/payment/demo-pay', { tradeNo })
      console.log('[DemoPay] Response:', res.data)
      if (res.data.code === 0) {
        const uploadData = sessionStorage.getItem('uploadData')
        console.log('[DemoPay] Upload data:', uploadData)
        if (uploadData) {
          const { previewUrl, filePath } = JSON.parse(uploadData)
          const reportRes = await api.post('/report/generate', {
            imageUrl: previewUrl,
            imageKey: filePath,
            userName: name || undefined,
            userAge: age ? parseInt(age) : undefined,
          })
          console.log('[DemoPay] Report result:', reportRes.data)
          if (reportRes.data.code === 0) {
            navigate(`/analysis/${reportRes.data.data.reportId}`)
          } else {
            alert('分析失败：' + reportRes.data.message)
          }
        } else {
          console.warn('[DemoPay] No upload data, navigating to upload')
          navigate('/upload')
        }
      } else {
        alert('支付失败：' + res.data.message)
      }
    } catch (err: any) {
      console.error('[DemoPay] Error:', err)
      alert('模拟支付失败：' + (err.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  // QR code display
  if (codeUrl) {
    return (
      <PageLayout title="扫码支付">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>请使用微信扫码支付</Typography>
          <Card sx={{ display: 'inline-block', p: 2, mb: 2 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codeUrl)}`}
              alt="支付二维码"
              width={200}
              height={200}
            />
          </Card>
          <Typography variant="body2" color="text.secondary">支付完成后页面将自动跳转</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setCodeUrl(null)}>返回</Button>
        </Box>
      </PageLayout>
    )
  }

  // Demo mode
  if (demoMode) {
    return (
      <PageLayout title="支付测试">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Card sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>演示模式</Typography>
            <Typography variant="body2" color="text.secondary">
              当前未配置微信支付密钥，使用模拟支付流程测试
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              订单号：{tradeNo}
            </Typography>
            <Typography variant="body2">
              金额：¥{PRICING[plan as keyof typeof PRICING].price}
            </Typography>
          </Card>
          <Button
            variant="contained"
            size="large"
            onClick={handleDemoPay}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? '处理中...' : '模拟支付成功'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            点击后将模拟支付成功并进入AI分析
          </Typography>
        </Box>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="选择方案">
      <RadioGroup value={plan} onChange={(e) => setPlan(e.target.value)}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <FormControlLabel value="PER_REPORT" control={<Radio />} label={`${PRICING.PER_REPORT.label} ¥${PRICING.PER_REPORT.price}`} />
          </CardContent>
        </Card>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <FormControlLabel value="ANNUAL_MEMBER" control={<Radio />} label={`${PRICING.ANNUAL_MEMBER.label} ¥${PRICING.ANNUAL_MEMBER.price}`} />
          </CardContent>
        </Card>
      </RadioGroup>

      <TextField fullWidth label="姓名" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
      <TextField fullWidth label="年龄" type="number" value={age} onChange={(e) => setAge(e.target.value)} sx={{ mb: 2 }} />

      <Button variant="contained" fullWidth size="large" onClick={handlePay} disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}>
        {loading ? '创建订单中...' : '确认支付'}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        演示模式：支付密钥未配置，将使用模拟支付
      </Typography>
    </PageLayout>
  )
}
