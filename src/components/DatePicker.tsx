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
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-xl p-4"
          style={{
            backgroundColor: 'var(--color-surface, #ffffff)',
            color: 'var(--color-text, #1a1a1a)',
            border: '2px solid var(--color-border, #e5e5e5)',
            boxShadow:
              'var(--shadow-lg, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            minWidth: '300px',
          }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate}
            fromMonth={minDate}
            toMonth={today}
            disabled={[{ before: minDate }, { after: today }]}
            showOutsideDays={false}
            classNames={{
              root: 'text-sm',
              months: 'flex flex-col',
              month: 'space-y-3',
              caption: 'flex justify-center pt-1 relative items-center mb-2',
              caption_label: 'text-sm font-semibold',
              nav: 'flex items-center gap-1',
              nav_button:
                'p-1 rounded-md transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed',
              nav_button_previous: 'absolute left-0',
              nav_button_next: 'absolute right-0',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell:
                'w-9 h-9 flex items-center justify-center text-xs font-medium text-muted-foreground',
              row: 'flex mt-1',
              cell: 'w-9 h-9 text-center p-0 relative',
              day: cn(
                'w-9 h-9 rounded-lg font-medium transition-colors',
                'hover:bg-accent text-foreground',
              ),
              day_selected: '!bg-primary !text-primary-foreground',
              day_today: 'font-bold !ring-2 !ring-primary !ring-offset-1',
              day_outside: 'opacity-30',
              day_disabled:
                'opacity-30 cursor-not-allowed hover:bg-transparent',
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
          <div
            className="flex justify-between mt-2 pt-2"
            style={{ borderTop: '1px solid var(--color-border, #e5e5e5)' }}
          >
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
