import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Blog from './pages/Blog'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
