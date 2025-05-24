import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { usePlayerStore } from '../../stores/playerStore'
import { Music, FileAudio } from 'lucide-react'
import { motion } from 'framer-motion'

export const FileUploader = () => {
  const { setCurrentFile } = usePlayerStore()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Check if file is audio or video
    if (!file.type.includes('audio') && !file.type.includes('video')) {
      toast.error('Please upload an audio or video file')
      return
    }
    
    // Create object URL for the file
    const url = URL.createObjectURL(file)
    
    // Set the current file in the store
    setCurrentFile({
      name: file.name,
      type: file.type,
      size: file.size,
      url
    })
    
    toast.success(`Loaded: ${file.name}`)
  }, [setCurrentFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac'],
      'video/*': ['.mp4', '.webm', '.ogv']
    },
    maxFiles: 1
  })

  return (
    <div 
      {...getRootProps()} 
      className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-200
        ${isDragActive 
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
          : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
        }`}
    >
      <input {...getInputProps()} />
      <div className="flex justify-center space-x-3">
        <FileAudio className="h-10 w-10 text-purple-500 dark:text-purple-400" />
        <Music className="h-10 w-10 text-purple-400 dark:text-purple-500" />
      </div>
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <p className="mt-4 text-sm font-medium text-gray-800 dark:text-gray-100">
          {isDragActive
            ? "Drop the files here..."
            : "Drag & drop audio/video files here, or click to select files"
          }
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
          Supports MP3, WAV, OGG, FLAC, AAC, MP4, WebM
        </p>
      </motion.div>
    </div>
  )
}
