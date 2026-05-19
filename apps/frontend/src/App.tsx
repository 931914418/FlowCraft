import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import EditorPage from '@/pages/EditorPage'
import ListView from '@/pages/ListView'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListView />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-neutral-300">404</h1>
      <p className="mt-2 text-neutral-500">Page not found</p>
      <a href="/" className="mt-4 text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800">
        Go back home
      </a>
    </div>
  )
}
