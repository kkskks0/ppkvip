import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import { useNavigate, useParams } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const steps = [
  { label: '图片预处理', desc: '压缩和优化图片质量', duration: 2000 },
  { label: 'AI视觉识别', desc: 'MiMo模型分析排出物特征', duration: 8000 },
  { label: '颜色与形态分析', desc: '识别11种颜色、11种形态类型', duration: 4000 },
  { label: '成分与质地判定', desc: '判断结石成分和质地特征', duration: 3000 },
  { label: '疾病风险评估', desc: '匹配病症数据库，评估风险等级', duration: 4000 },
  { label: '生成个性化建议', desc: '饮食、作息、运动、中医四维建议', duration: 3000 },
  { label: '生成分析报告', desc: '整合8页专业报告', duration: 2000 },
]

export default function AnalysisPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('正在初始化...')

  useEffect(() => {
    let step = 0
    let prog = 0
    const totalDuration = steps.reduce((s, st) => s + st.duration, 0)

    const interval = setInterval(() => {
      if (step >= steps.length) {
        setStatusText('分析完成，正在加载报告...')
        return
      }
      const stepProgress = (Date.now() % steps[step].duration) / steps[step].duration
      prog = (steps.slice(0, step).reduce((s, st) => s + st.duration, 0) + stepProgress * steps[step].duration) / totalDuration * 100
      setProgress(Math.min(prog, 95))
      setCurrentStep(step)
      setStatusText(steps[step].label + ' - ' + steps[step].desc)

      if (stepProgress > 0.9) step++
    }, 200)

    // Fetch report
    const checkReport = setInterval(() => {
      fetch(`${API_BASE}/report-direct/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data.code === 0 && data.data?.analysis?.comprehensiveAnalysis) {
            clearInterval(interval)
            clearInterval(checkReport)
            setProgress(100)
            setStatusText('分析完成！')
            setTimeout(() => navigate(`/report/${id}`), 800)
          }
        })
    }, 3000)

    return () => { clearInterval(interval); clearInterval(checkReport) }
  }, [id, navigate])

  return (
    <PageLayout title="AI分析中">
      <Box sx={{ maxWidth: 480, mx: 'auto', py: 4 }}>
        {/* Main Animation */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
            <CircularProgress size={80} thickness={3} sx={{ color: '#4CAF50' }} />
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Typography variant="h5" fontWeight="bold" color="primary">{Math.round(progress)}%</Typography>
            </Box>
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>AI 正在分析您的排出物</Typography>
          <Typography variant="body2" color="text.secondary">{statusText}</Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { borderRadius: 3, background: 'linear-gradient(90deg, #43A047, #1abc9c)' } }} />
        </Box>

        {/* Step List */}
        <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          {steps.map((step, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: i < steps.length - 1 ? '1px solid #f0f0f0' : 'none',
              opacity: i <= currentStep ? 1 : 0.4 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: i < currentStep ? '#4CAF50' : i === currentStep ? '#FF9800' : '#e0e0e0', color: 'white', fontSize: 11, fontWeight: 'bold' }}>
                {i < currentStep ? '✓' : i + 1}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={i === currentStep ? 'bold' : 'normal'} fontSize={13}>{step.label}</Typography>
                <Typography variant="caption" color="text.secondary" fontSize={11}>{step.desc}</Typography>
              </Box>
              {i === currentStep && <CircularProgress size={16} sx={{ color: '#FF9800' }} />}
            </Box>
          ))}
        </Box>
      </Box>
    </PageLayout>
  )
}
