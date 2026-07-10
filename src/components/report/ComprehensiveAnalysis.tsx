import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

export default function ComprehensiveAnalysis({ data }: { data: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>综合分析</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{data}</Typography>
      </CardContent>
    </Card>
  )
}
