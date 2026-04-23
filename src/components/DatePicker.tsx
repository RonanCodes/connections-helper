import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  min: string
  max?: string // Optional, we always use today as max
}

export function DatePicker({ value, onChange, min }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedDate = new Date(value + 'T00:00:00')
  const minDate = new Date(min + 'T00:00:00')
  // Always use today as the max date
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => document.removeEventListener('click', handleClick)
  }, [isOpen])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      onChange(`${yyyy}-${mm}-${dd}`)
      setIsOpen(false)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[160px]"
      >
        <Calendar className="w-4 h-4 mr-2" />
        {formatDisplayDate(value)}
      </Button>

      {isOpen && (
        <div
          style={{
            background: 'var(--color-background, #ffffff)',
            color: 'var(--color-foreground, #121212)',
            borderColor: 'var(--color-border, #e5e5e5)',
          }}
          className={cn(
            'absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50',
            'min-w-[300px] p-4 rounded-xl border-2 shadow-xl',
            'animate-in fade-in slide-in-from-bottom-2',
          )}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate}
            startMonth={minDate}
            endMonth={today}
            disabled={[{ before: minDate }, { after: today }]}
            showOutsideDays={false}
            classNames={{
              root: 'rdp text-sm mx-auto w-fit',
              months: 'flex flex-col',
              month: 'space-y-3',
              month_caption: 'flex items-center justify-start pt-1 mb-2 pl-1',
              caption_label: 'text-sm font-semibold',
              nav: 'flex items-center gap-1 absolute right-4 top-4',
              button_previous: cn(
                'p-1 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
              ),
              button_next: cn(
                'p-1 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
              ),
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday:
                'w-9 h-9 flex items-center justify-center text-xs font-medium text-muted-foreground',
              week: 'flex mt-1',
              day: 'w-9 h-9 text-center p-0 relative',
              day_button: cn(
                'w-9 h-9 rounded-md font-medium transition-colors',
                'text-foreground hover:bg-accent hover:text-accent-foreground',
              ),
              selected: cn(
                '[&>button]:!bg-foreground [&>button]:!text-background',
                '[&>button]:hover:!bg-foreground/90 [&>button]:font-semibold',
              ),
              today:
                '[&>button]:font-bold [&>button]:ring-2 [&>button]:ring-foreground/60 [&>button]:ring-inset',
              outside: 'opacity-30',
              disabled:
                '[&>button]:opacity-30 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent [&>button]:hover:text-foreground',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                ),
            }}
          />
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleSelect(new Date())}>
              Today
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
