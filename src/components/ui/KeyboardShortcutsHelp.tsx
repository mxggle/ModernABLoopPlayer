import { useState } from 'react'
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

export const KeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false)
  
  const shortcuts = [
    { key: 'Space', description: 'Play/Pause' },
    { key: ',', description: 'Set loop start point (A) to current time' },
    { key: '.', description: 'Set loop end point (B) to current time' },
    { key: '/', description: 'Toggle looping on/off' },
    { key: 'M', description: 'Quick add bookmark from current loop or time' },
    { key: '↑', description: 'Increase volume' },
    { key: '↓', description: 'Decrease volume' },
    { key: 'Shift + →', description: 'Increase playback rate' },
    { key: 'Shift + ←', description: 'Decrease playback rate' },
  ]
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to control the player more efficiently.
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
