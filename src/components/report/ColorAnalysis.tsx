import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

export default function ColorAnalysis({ data }: { data: { name: string; hexColor: string; formationTime: string; interpretation: string } }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>颜色分析</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: data.hexColor, border: '1px solid #ccc' }} />
          <Typography fontWeight="bold">{data.name}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">形成时间：{data.formationTime}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>{data.interpretation}</Typography>
      </CardContent>
    </Card>
  )
}
