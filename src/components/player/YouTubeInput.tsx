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
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-full mb-3">
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter YouTube URL or video ID"
          className="w-full h-12 px-12 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none text-sm"
          whileFocus={{ scale: 1.01 }}
        />
        <Youtube className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400" size={20} />
      </div>
      <motion.button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Search size={18} />
        Load Video
      </motion.button>
    </motion.form>
  )
}
