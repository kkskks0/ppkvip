import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

export default function SizeAnalysis({ data }: { data: { category: string; estimatedRangeMm: string; referenceObject: string } }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>大小分析</Typography>
        <Typography fontWeight="bold">{data.category}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>估算范围：{data.estimatedRangeMm}</Typography>
        <Typography variant="body2" color="text.secondary">参照物：{data.referenceObject}</Typography>
      </CardContent>
    </Card>
  )
}
