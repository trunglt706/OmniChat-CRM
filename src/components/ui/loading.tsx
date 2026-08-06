import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps extends React.SVGAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
}

export function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps) {
  return (
    <Loader2 
      className={cn('animate-spin text-muted-foreground', sizeMap[size], className)} 
      {...props} 
    />
  )
}

interface LoadingBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl'
  spinnerClassName?: string
}

export function LoadingBlock({ spinnerSize = 'lg', spinnerClassName, className, ...props }: LoadingBlockProps) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)} {...props}>
      <LoadingSpinner size={spinnerSize} className={spinnerClassName} />
    </div>
  )
}
