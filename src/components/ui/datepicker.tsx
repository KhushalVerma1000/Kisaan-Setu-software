"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

// Helper to parse various date formats, prioritizing DD/MM/YYYY formats
function parseUserInput(input: string): Date | null {
  if (!input.trim()) return null
  
  const cleaned = input.replace(/\s+/g, '').replace(/[\/\-\.]/g, '')
  
  // Handle DDMMYYYY format (8 digits)
  if (/^\d{8}$/.test(cleaned)) {
    const day = parseInt(cleaned.substring(0, 2))
    const month = parseInt(cleaned.substring(2, 4))
    const year = parseInt(cleaned.substring(4, 8))
    
    const parsed = new Date(year, month - 1, day)
    if (isValidDate(parsed) && 
        parsed.getDate() === day &&
        parsed.getMonth() === month - 1 &&
        year > 1900 && year < 2100) {
      return parsed
    }
  }
  
  // Handle DDMMYY format (6 digits)
  if (/^\d{6}$/.test(cleaned)) {
    const day = parseInt(cleaned.substring(0, 2))
    const month = parseInt(cleaned.substring(2, 4))
    let year = parseInt(cleaned.substring(4, 6))
    
    // Assume 20xx for years 00-50, 19xx for 51-99
    year = year <= 50 ? 2000 + year : 1900 + year
    
    const parsed = new Date(year, month - 1, day)
    if (isValidDate(parsed) && 
        parsed.getDate() === day &&
        parsed.getMonth() === month - 1) {
      return parsed
    }
  }
  
  // Try DD/MM/YYYY with separators
  const ddmmyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/
  let match = cleaned.length > 0 ? input.match(ddmmyyyyPattern) : null
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2])
    const year = parseInt(match[3])
    
    const parsed = new Date(year, month - 1, day)
    if (isValidDate(parsed) && 
        parsed.getDate() === day &&
        parsed.getMonth() === month - 1 &&
        year > 1900 && year < 2100) {
      return parsed
    }
  }
  
  // Try DD/MM/YY with separators
  const ddmmyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/
  match = input.match(ddmmyyPattern)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2])
    let year = parseInt(match[3])
    
    // Assume 20xx for years 00-50, 19xx for 51-99
    year = year <= 50 ? 2000 + year : 1900 + year
    
    const parsed = new Date(year, month - 1, day)
    if (isValidDate(parsed) && 
        parsed.getDate() === day &&
        parsed.getMonth() === month - 1) {
      return parsed
    }
  }
  
  // Try YYYY-MM-DD format (ISO format)
  const isoPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
  match = input.match(isoPattern)
  if (match) {
    const year = parseInt(match[1])
    const month = parseInt(match[2])
    const day = parseInt(match[3])
    
    const parsed = new Date(year, month - 1, day)
    if (isValidDate(parsed) && 
        parsed.getDate() === day &&
        parsed.getMonth() === month - 1 &&
        year > 1900 && year < 2100) {
      return parsed
    }
  }
  
  // Last resort: try native Date parsing
  const parsed = new Date(input)
  if (isValidDate(parsed) && 
      parsed.getFullYear() > 1900 && 
      parsed.getFullYear() < 2100) {
    return parsed
  }
  
  return null
}

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export function DatePicker({ 
  date: controlledDate, 
  onDateChange,
  label = "Subscription Date",
  placeholder = "DD/MM/YYYY or DDMMYYYY",
  required = false,
  disabled = false
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Use controlled date if provided, otherwise use internal state
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    controlledDate || new Date("2025-06-01")
  )
  
  const date = controlledDate !== undefined ? controlledDate : internalDate
  const setDate = onDateChange || setInternalDate
  
  const [month, setMonth] = React.useState<Date | undefined>(date)
  const [inputValue, setInputValue] = React.useState(formatDate(date))
  const [isTyping, setIsTyping] = React.useState(false)

  // Update display when controlled date changes externally
  React.useEffect(() => {
    if (controlledDate !== undefined && !isTyping) {
      setInputValue(formatDate(controlledDate))
      setMonth(controlledDate)
    }
  }, [controlledDate, isTyping])

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setIsTyping(true)
  }

  const handleInputBlur = () => {
    setIsTyping(false)
    
    // Try to parse the input when user finishes typing
    const parsedDate = parseUserInput(inputValue)
    
    if (parsedDate) {
      setDate(parsedDate)
      setMonth(parsedDate)
      setInputValue(formatDate(parsedDate)) // Format it nicely
    } else if (inputValue.trim() === "") {
      // If empty, clear the date
      setDate(undefined)
      setInputValue("")
    } else {
      // Invalid input - revert to last valid date
      setInputValue(formatDate(date))
    }
  }

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    setInputValue(formatDate(selectedDate))
    setMonth(selectedDate)
    setOpen(false)
    setIsTyping(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date" className="px-1">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative flex gap-2">
        <Input
          id="date"
          value={inputValue}
          placeholder={placeholder}
          className="bg-background pr-10"
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onFocus={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
            if (e.key === "Enter") {
              e.currentTarget.blur() // Trigger validation
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(!open)
              }}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0 z-50"
            align="end"
            alignOffset={-8}
            sideOffset={10}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Don't close if clicking on the input
              if (e.target instanceof HTMLElement && e.target.id === 'date') {
                e.preventDefault()
              }
            }}
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleCalendarSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}