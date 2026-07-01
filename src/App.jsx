import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import FloatingDock from './components/FloatingDock'
import Home from './pages/Home'
import Blog from './pages/Blog'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import MyGallery from './pages/MyGallery'

function AppContent() {
  const { user } = useAuth()
  const location = useLocation()
  const showNavbar = !user || location.pathname === '/'

  return (
    <div className="min-h-screen bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text">
      {/* Show standard navbar when user is logged out OR on the Home page */}
      {showNavbar && <Navbar />}

      {/* Floating dock handles its own visibility based on route & auth internally */}
      <FloatingDock />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/my-gallery" element={<MyGallery />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
