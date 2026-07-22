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
import Video from './pages/Video'
import MyVideo from './pages/MyVideo'
import Watch from './pages/Watch'
import Audio from './pages/Audio'
import MyAudio from './pages/MyAudio'
import Listen from './pages/Listen'
import Unauthorized from './pages/Unauthorized'
import Forbidden from './pages/Forbidden'

function AppContent() {
  const { user } = useAuth()
  const location = useLocation()
  // Hide Navbar and FloatingDock on error pages and player pages (errors handled inline there)
  const hideChromeRoutes = ['/401', '/403']
  const isErrorPage = hideChromeRoutes.includes(location.pathname)
  const isPlayerPage = location.pathname.startsWith('/watch/') || location.pathname.startsWith('/listen/')
  
  // Check if viewing another user's page (not owner)
  const userPageMatch = location.pathname.match(/^\/([^/]+)\/(gallery|video|audio)$/)
  const isOtherUserPage = userPageMatch && user && userPageMatch[1] !== user.username
  
  const showNavbar = !isErrorPage && !isPlayerPage && !isOtherUserPage && (!user || location.pathname === '/')

  return (
    <div className="min-h-screen bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text">
      {/* Show standard navbar when user is logged out OR on the Home page */}
      {showNavbar && <Navbar />}

      {/* Floating dock handles its own visibility based on route & auth internally */}
      {!isErrorPage && !isPlayerPage && !isOtherUserPage && <FloatingDock />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/:username/gallery" element={<MyGallery />} />
        <Route path="/video" element={<Video />} />
        <Route path="/:username/video" element={<MyVideo />} />
        <Route path="/watch/:shortId" element={<Watch />} />
        <Route path="/audio" element={<Audio />} />
        <Route path="/:username/audio" element={<MyAudio />} />
        <Route path="/listen/:id" element={<Listen />} />
        <Route path="/401" element={<Unauthorized />} />
        <Route path="/403" element={<Forbidden />} />
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
