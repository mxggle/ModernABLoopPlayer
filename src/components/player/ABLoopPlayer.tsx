import { useState, useEffect } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { YouTubePlayer } from './YouTubePlayer'
import { MediaPlayer } from './MediaPlayer'
import { ABLoopControls as LoopControls } from '../controls/ABLoopControls'
import { PlaybackControls as PlayerControls } from '../controls/PlaybackControls'
import { BookmarkManager } from './BookmarkManager'
import { FileUploader } from './FileUploader'
import { YouTubeInput } from './YouTubeInput'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../ui/tabs'
import { 
  Card, 
  CardContent 
} from '../ui/card'
import { 
  Maximize2, 
  Minimize2,
  Info,
  Share2
} from 'lucide-react'
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp'
import { Button } from '../ui/button'
import { parseShareableUrl } from '../../utils/shareableUrl'
import { toast } from 'react-hot-toast'

export const ABLoopPlayer = () => {
  const [activeTab, setActiveTab] = useState<string>('youtube')
  
  const {
    currentFile,
    currentYouTube,
    // Removing unused variables: isPlaying, isLooping
    videoSize,
    setVideoSize,
  } = usePlayerStore()

  // Parse URL params for loop points, youtube ID, and bookmark data on initial load
  useEffect(() => {
    try {
      const urlData = parseShareableUrl(window.location.href)
      const store = usePlayerStore.getState()
      
      // Handle loop points if present
      if (urlData.loopStart !== undefined && urlData.loopEnd !== undefined) {
        store.setLoopPoints(urlData.loopStart, urlData.loopEnd)
        store.setIsLooping(true)
      }
      
      // Handle YouTube ID if present
      if (urlData.youtubeId) {
        store.setCurrentYouTube({ id: urlData.youtubeId })
        setActiveTab('youtube')
      }
      
      // Handle playback rate if present
      if (urlData.playbackRate) {
        store.setPlaybackRate(urlData.playbackRate)
      }
      
      // Handle bookmark data if present
      if (urlData.bookmark) {
        toast.success(`Loaded shared bookmark: ${urlData.bookmark.name || 'Unnamed'}`, {
          duration: 3000,
          icon: '🔖'
        })
      }
    } catch (error) {
      console.error('Error parsing URL parameters:', error)
    }
  }, [])

  // Set document title based on media
  useEffect(() => {
    if (currentYouTube?.title) {
      document.title = `AB Loop Player - ${currentYouTube.title}`
    } else if (currentFile?.name) {
      document.title = `AB Loop Player - ${currentFile.name}`
    } else {
      document.title = 'AB Loop Player'
    }
  }, [currentFile, currentYouTube])
  
  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only if we have media loaded
      if (!currentFile && !currentYouTube) return
      
      const store = usePlayerStore.getState()
      
      switch (e.key.toLowerCase()) {
        // Play/Pause - Spacebar
        case ' ':
          if (!e.target || (e.target as HTMLElement).tagName !== 'INPUT') {
            e.preventDefault()
            store.togglePlay()
          }
          break
          
        // Loop control - Set A point (start) - , key (comma)
        case ',': 
          e.preventDefault()
          store.setLoopPoints(store.currentTime, store.loopEnd)
          break
          
        // Loop control - Set B point (end) - . key (period)
        case '.':
          e.preventDefault()
          store.setLoopPoints(store.loopStart, store.currentTime)
          break
          
        // Toggle loop on/off - / key (forward slash)
        case '/':
          e.preventDefault()
          store.toggleLooping()
          break
          
        // Volume up - ArrowUp
        case 'arrowup':
          e.preventDefault()
          store.setVolume(Math.min(1, store.volume + 0.05))
          break
          
        // Volume down - ArrowDown
        case 'arrowdown':
          e.preventDefault()
          store.setVolume(Math.max(0, store.volume - 0.05))
          break
          
        // Playback rate faster - ArrowRight
        case 'arrowright':
          if (e.shiftKey) {
            e.preventDefault()
            const newRate = Math.min(4, store.playbackRate + 0.25)
            store.setPlaybackRate(newRate)
          }
          break
          
        // Playback rate slower - ArrowLeft
        case 'arrowleft':
          if (e.shiftKey) {
            e.preventDefault()
            const newRate = Math.max(0.25, store.playbackRate - 0.25)
            store.setPlaybackRate(newRate)
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentFile, currentYouTube])

  // Toggle video size function
  const toggleVideoSize = () => {
    const sizes: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl']
    const currentIndex = sizes.indexOf(videoSize)
    const nextIndex = (currentIndex + 1) % sizes.length
    setVideoSize(sizes[nextIndex])
  }
  
  // Share current settings function
  const handleShareSettings = () => {
    const store = usePlayerStore.getState()
    const { loopStart, loopEnd, currentYouTube, playbackRate } = store
    
    // Only share if we have a video and loop points
    if (!currentYouTube && !loopStart && !loopEnd) {
      toast.error('Set loop points or load a video before sharing')
      return
    }
    
    // Create URL params
    const params = new URLSearchParams()
    
    if (loopStart !== null) params.set('start', loopStart.toString())
    if (loopEnd !== null) params.set('end', loopEnd.toString())
    if (currentYouTube?.id) params.set('yt', currentYouTube.id)
    if (playbackRate !== 1) params.set('rate', playbackRate.toString())
    
    // Add the current URL
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Shareable link copied to clipboard'))
      .catch(() => toast.error('Failed to copy link'))
  }

  // Get video size class
  const getVideoSizeClass = () => {
    switch (videoSize) {
      case 'sm': return 'max-w-md mx-auto'
      case 'md': return 'max-w-2xl mx-auto'
      case 'lg': return 'max-w-4xl mx-auto'
      case 'xl': return 'max-w-full'
      default: return 'max-w-2xl mx-auto'
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AB Loop Player</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              onClick={() => {}}
              aria-label="Player info"
            >
              <Info size={14} />
              <span>Use keyboard shortcuts for better control</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareSettings}
            className="flex items-center gap-1"
            aria-label="Share current settings"
          >
            <Share2 size={16} />
            <span>Share</span>
          </Button>
          <KeyboardShortcutsHelp />
        </div>
      </div>
      <div className="space-y-4">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
            <TabsTrigger value="local">Local Media</TabsTrigger>
          </TabsList>
          
          <TabsContent value="youtube" className="space-y-4">
            <YouTubeInput 
              onVideoIdSubmit={(videoId) => {
                usePlayerStore.getState().setCurrentYouTube({ id: videoId });
              }} 
            />
          </TabsContent>
          
          <TabsContent value="local" className="space-y-4">
            <FileUploader />
          </TabsContent>
        </Tabs>

        {/* Player section */}
        <div className={`${getVideoSizeClass()} transition-all duration-300`}>
          <Card>
            <CardContent className="p-2 sm:p-4">
              {/* Media Display */}
              <div className="relative rounded-lg overflow-hidden">
                {currentYouTube ? (
                  <YouTubePlayer videoId={currentYouTube.id} />
                ) : (
                  <MediaPlayer />
                )}
                
                {/* Size control button */}
                <button 
                  onClick={toggleVideoSize}
                  className="absolute top-2 right-2 p-2 bg-black/70 text-white rounded-full hover:bg-black/90"
                  aria-label="Toggle video size"
                >
                  {videoSize === 'xl' ? (
                    <Minimize2 size={18} />
                  ) : (
                    <Maximize2 size={18} />
                  )}
                </button>
              </div>
              
              {/* Player Controls */}
              {(currentFile || currentYouTube) && (
                <div className="mt-2 space-y-4">
                  <PlayerControls />
                  <LoopControls />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bookmarks section */}
        {(currentFile || currentYouTube) && (
          <div className={getVideoSizeClass()}>
            <BookmarkManager />
          </div>
        )}
      </div>
    </div>
  )
}
