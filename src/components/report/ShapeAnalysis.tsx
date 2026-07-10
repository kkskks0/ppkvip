import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

export default function ShapeAnalysis({ data }: { data: { type: string; description: string; significance: string } }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>形态分析</Typography>
        <Typography fontWeight="bold">{data.type}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>{data.description}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>意义：{data.significance}</Typography>
      </CardContent>
    </Card>
  )
}
