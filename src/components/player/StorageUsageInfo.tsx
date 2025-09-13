import { useState, useEffect } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { getStorageUsage, clearAllMediaFiles } from '../../utils/mediaStorage'
import { HardDrive, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { toast } from 'react-hot-toast'

export const StorageUsageInfo = () => {
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const { clearMediaHistory } = usePlayerStore()
  
  // Format bytes to readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Load storage info
  const loadStorageInfo = async () => {
    try {
      const usage = await getStorageUsage()
      setStorageInfo(usage)
    } catch (error) {
      console.error('Failed to get storage usage:', error)
    }
  }
  
  // Clear all media storage and history
  const [confirmOpen, setConfirmOpen] = useState(false)
  const handleClearStorage = async () => {
    setIsLoading(true)
    try {
      await clearAllMediaFiles()
      await clearMediaHistory()
      toast.success('Media storage cleared')
      loadStorageInfo()
    } catch (error) {
      console.error('Failed to clear storage:', error)
      toast.error('Failed to clear storage')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Load storage info on mount
  useEffect(() => {
    loadStorageInfo()
  }, [])
  
  if (!storageInfo) {
    return null
  }
  
  return (
    <>
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Storage: {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={isLoading || storageInfo.used === 0}
          title="Clear all stored media"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 px-2"
        >
          <Trash2 size={14} className="mr-1" />
          <span className="text-xs">Clear storage</span>
        </Button>
      </div>
      
      {/* Storage usage bar */}
      <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            storageInfo.percentage > 80
              ? 'bg-red-500'
              : storageInfo.percentage > 60
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
        ></div>
      </div>
      
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
        {storageInfo.percentage.toFixed(1)}% used
      </p>
    </div>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear All Stored Media</DialogTitle>
          <DialogDescription>
            This removes all media files from browser storage. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setConfirmOpen(false); handleClearStorage(); }}>Clear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
