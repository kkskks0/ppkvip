import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'

export default function LifestyleAdvice({ data }: { data: string[] }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>生活方式建议</Typography>
        <List dense>
          {data.map((item, i) => (
            <ListItem key={i}>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}
