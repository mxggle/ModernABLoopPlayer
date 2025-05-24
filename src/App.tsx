import { useEffect } from 'react'
import { Theme } from '@radix-ui/themes'
import { Toaster } from 'react-hot-toast'
import { usePlayerStore } from './stores/playerStore'
import { PlayerLayout } from './components/layout/PlayerLayout'
import '@radix-ui/themes/styles.css'
import './index.css'

function App() {
  const { theme } = usePlayerStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  // Parse URL parameters for shared loop settings
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const start = params.get('start')
    const end = params.get('end')
    
    if (start && end) {
      const { setLoopPoints, setIsLooping } = usePlayerStore.getState()
      setLoopPoints(parseFloat(start), parseFloat(end))
      setIsLooping(true)
    }
    
    // Note: YouTube ID handling is implemented in the PlayerLayout component
  }, [])

  return (
    <Theme appearance={theme} accentColor="purple">
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <PlayerLayout />
      </div>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#2D3748' : '#FFFFFF',
            color: theme === 'dark' ? '#FFFFFF' : '#1A202C',
            border: theme === 'dark' ? '1px solid #4A5568' : '1px solid #E2E8F0'
          }
        }}
      />
    </Theme>
  )
}

export default App
