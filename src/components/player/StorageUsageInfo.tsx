import { useState, useEffect } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { getStorageUsage, clearAllMediaFiles, setStorageLimit } from '../../utils/mediaStorage'
import { HardDrive, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export const StorageUsageInfo = () => {
  const { t } = useTranslation()
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null)
  const [pendingLimit, setPendingLimit] = useState<string>('')
  const [isSavingLimit, setIsSavingLimit] = useState(false)
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
      setPendingLimit(Math.round(usage.total / (1024 * 1024)).toString())
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
      toast.success(t('storage.clearStorageSuccess'))
      loadStorageInfo()
    } catch (error) {
      console.error('Failed to clear storage:', error)
      toast.error(t('storage.clearStorageError'))
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

  const usedMB = storageInfo.used / (1024 * 1024)

  const handleSaveLimit = async () => {
    if (!pendingLimit) {
      toast.error(t('storage.limitInvalid', { min: Math.ceil(usedMB) }))
      return
    }

    const limitMB = parseInt(pendingLimit, 10)
    if (isNaN(limitMB) || limitMB < 50) {
      toast.error(t('storage.limitInvalid', { min: 50 }))
      return
    }

    const shouldWarn = limitMB * 1024 * 1024 < storageInfo.used
    if (shouldWarn) {
      const confirmReduce = window.confirm(
        t('storage.limitReduceConfirm')
      )
      if (!confirmReduce) {
        return
      }
    }

    try {
      setIsSavingLimit(true)
      await setStorageLimit(limitMB * 1024 * 1024)
      toast.success(t('storage.limitUpdated', { max: limitMB }))
      await loadStorageInfo()
    } catch (error) {
      console.error('Failed to update storage limit:', error)
      toast.error(t('storage.limitUpdateError'))
    } finally {
      setIsSavingLimit(false)
    }
  }

  return (
    <>
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('storage.storage')}: {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={isLoading || storageInfo.used === 0}
          title={t('storage.clearAllStoredMediaTitle')}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 px-2"
        >
          <Trash2 size={14} className="mr-1" />
          <span className="text-xs">{t('storage.clearStorage')}</span>
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {t('storage.limitLabel')}
          </span>
          <span>{t('storage.limitHelp')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={50}
            step={50}
            value={pendingLimit}
            onChange={(event) => setPendingLimit(event.target.value)}
            className="h-8 w-28 text-right"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">MB</span>
          <Button
            variant="outline"
            size="sm"
            disabled={isSavingLimit}
            onClick={handleSaveLimit}
          >
            {t('storage.limitUpdate')}
          </Button>
        </div>
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
        {t('storage.percentUsed', { percent: storageInfo.percentage.toFixed(1) })}
      </p>
    </div>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('storage.clearAllStoredMedia')}</DialogTitle>
          <DialogDescription>
            {t('storage.clearStorageDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setConfirmOpen(false); handleClearStorage(); }}>{t('player.clear')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
