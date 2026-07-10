import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

export default function PatternAnalysis({ data }: { data: { type: string; description: string } }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>排出模式</Typography>
        <Typography fontWeight="bold">{data.type}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>{data.description}</Typography>
      </CardContent>
    </Card>
  )
}
