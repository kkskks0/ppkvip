import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

export default function CompositionAnalysis({ data }: { data: { type: string; confidence: string; reasoning: string } }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>成分分析</Typography>
        <Typography fontWeight="bold">{data.type}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>置信度：{data.confidence}</Typography>
        <Typography variant="body2" color="text.secondary">{data.reasoning}</Typography>
      </CardContent>
    </Card>
  )
}
