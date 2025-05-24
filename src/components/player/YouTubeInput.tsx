import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Search, Youtube } from 'lucide-react'
import { motion } from 'framer-motion'

interface YouTubeInputProps {
  onVideoIdSubmit: (videoId: string) => void
}

export const YouTubeInput = ({ onVideoIdSubmit }: YouTubeInputProps) => {
  const [inputValue, setInputValue] = useState('')

  const extractVideoId = (url: string): string | null => {
    // Handle different YouTube URL formats
    const regexPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/i,
      /youtube\.com\/embed\/([^&?/]+)/i,
      /youtube\.com\/v\/([^&?/]+)/i,
      /youtube\.com\/user\/[^/?]+\/?\?v=([^&?/]+)/i,
    ]

    for (const pattern of regexPatterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    // Check if the input is already a video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url
    }

    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim()) {
      toast.error('Please enter a YouTube URL or video ID')
      return
    }
    
    const videoId = extractVideoId(inputValue.trim())
    
    if (!videoId) {
      toast.error('Invalid YouTube URL or video ID')
      return
    }
    
    onVideoIdSubmit(videoId)
    toast.success('YouTube video loaded')
  }

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="flex gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex-1">
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter YouTube URL or video ID"
          className="input-field pl-10"
          whileFocus={{ scale: 1.01 }}
        />
        <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400" size={18} />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300" size={18} />
      </div>
      <motion.button
        type="submit"
        className="btn btn-primary"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        Load
      </motion.button>
    </motion.form>
  )
}
