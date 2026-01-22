import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from './ThemeProvider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ThemeToggle({ variant = 'default' }) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />
    }
    return resolvedTheme === 'dark' 
      ? <Moon className="h-4 w-4" /> 
      : <Sun className="h-4 w-4" />
  }

  const getLabel = () => {
    if (theme === 'light') return 'Light mode'
    if (theme === 'dark') return 'Dark mode'
    return 'System theme'
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              className="h-9 w-9 rounded-lg"
            >
              {getIcon()}
              <span className="sr-only">{getLabel()}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getLabel()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleTheme}
      className="h-9 gap-2"
    >
      {getIcon()}
      <span className="text-xs font-medium">{getLabel()}</span>
    </Button>
  )
}
