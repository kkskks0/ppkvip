import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import UploadPage from '../pages/UploadPage'
import AnalysisPage from '../pages/AnalysisPage'
import ReportPage from '../pages/ReportPage'
import ProfilePage from '../pages/ProfilePage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/analysis/:id" element={<AnalysisPage />} />
      <Route path="/report/:id" element={<ReportPage />} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
    </Routes>
  )
}
