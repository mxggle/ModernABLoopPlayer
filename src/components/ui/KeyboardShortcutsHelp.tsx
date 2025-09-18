import { useMemo, useState } from 'react'
import { Keyboard } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from './dialog'
import { Button } from './button'
import { useTranslation } from 'react-i18next'

export const KeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()

  const shortcuts = useMemo(
    () => [
      { key: 'Space', description: t('shortcuts.items.playPause') },
      { key: ',', description: t('shortcuts.items.setLoopStart') },
      { key: '.', description: t('shortcuts.items.setLoopEnd') },
      { key: '/', description: t('shortcuts.items.toggleLoop') },
      { key: 'M', description: t('shortcuts.items.quickBookmark') },
      { key: '↑', description: t('shortcuts.items.increaseVolume') },
      { key: '↓', description: t('shortcuts.items.decreaseVolume') },
      { key: 'Shift + →', description: t('shortcuts.items.increaseSpeed') },
      { key: 'Shift + ←', description: t('shortcuts.items.decreaseSpeed') },
    ],
    [t]
  )
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label={t('shortcuts.ariaLabel')}
        >
          <Keyboard size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>
            {t('shortcuts.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut) => (
            <div 
              key={shortcut.key} 
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
