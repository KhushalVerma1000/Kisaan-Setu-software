import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateRangePickerProps {
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onDateRangeChange?: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
  onDateRangeChangeISO?: (range: {
    from: string | undefined;
    to: string | undefined;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
  showQuickFilters?: boolean;
  showFinancialYears?: boolean;
  showStandardFilters?: boolean;
  customQuickFilters?: Array<{
    label: string;
    getValue: () => { from: Date; to: Date };
  }>;
  buttonVariant?: "default" | "outline" | "ghost";
  buttonSize?: "sm" | "md" | "lg";
  numberOfMonths?: 1 | 2;
  showResetButton?: boolean;
  resetToCurrentMonth?: boolean;
  resetLabel?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  onDateRangeChangeISO,
  placeholder = "Pick date range",
  className,
  disabled = false,
  minDate,
  maxDate,
  disabledDates,
  showQuickFilters = true,
  showFinancialYears = true,
  showStandardFilters = true,
  customQuickFilters = [],
  buttonVariant = "outline",
  buttonSize = "md",
  numberOfMonths = 2,
  showResetButton = true,
  resetToCurrentMonth = true,
  resetLabel = "Reset to current month"
}) => {
  const [month, setMonth] = useState<Date>(dateRange?.from || new Date());
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    if (onDateRangeChange) {
      onDateRangeChange(range);
    }
    if (onDateRangeChangeISO) {
      onDateRangeChangeISO({
        from: range.from ? range.from.toISOString() : undefined,
        to: range.to ? range.to.toISOString() : undefined
      });
    }
  }, [onDateRangeChange, onDateRangeChangeISO]);

  const getFinancialYearRanges = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const ranges = [];

    const createFY = (startYear: number) => {
      const fyStart = new Date(startYear, 3, 1);
      const fyEnd = new Date(startYear + 1, 2, 31);
      return {
        start: fyStart,
        end: fyEnd,
        label: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`
      };
    };

    let currentFYStart = currentMonth >= 3 ? currentYear : currentYear - 1;

    ranges.push({
      ...createFY(currentFYStart),
      key: 'current',
      displayLabel: 'Current FY'
    });

    for (let i = 1; i <= 3; i++) {
      ranges.push({
        ...createFY(currentFYStart - i),
        key: `previous${i}`,
        displayLabel: i === 1 ? 'Previous FY' : `Previous ${i} FY`
      });
    }

    return ranges;
  };

  const getStandardQuickFilters = () => {
    const today = new Date();
    return [
      {
        label: "Today",
        getValue: () => ({ from: today, to: today })
      },
      {
        label: "Last 7 days",
        getValue: () => {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return { from: weekAgo, to: today };
        }
      },
      {
        label: "Last 30 days",
        getValue: () => {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return { from: monthAgo, to: today };
        }
      },
      {
        label: "This month",
        getValue: () => {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return { from: start, to: end };
        }
      },
      {
        label: "Last month",
        getValue: () => {
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const end = new Date(today.getFullYear(), today.getMonth(), 0);
          return { from: start, to: end };
        }
      },
      {
        label: "This year",
        getValue: () => {
          const start = new Date(today.getFullYear(), 0, 1);
          return { from: start, to: today };
        }
      },
      {
        label: "Last year",
        getValue: () => {
          const start = new Date(today.getFullYear() - 1, 0, 1);
          const end = new Date(today.getFullYear() - 1, 11, 31);
          return { from: start, to: end };
        }
      }
    ];
  };

  const handleReset = () => {
    if (resetToCurrentMonth) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      handleDateRangeChange({ from: startOfMonth, to: endOfMonth });
    } else {
      handleDateRangeChange({ from: undefined, to: undefined });
    }
    setFromInput("");
    setToInput("");
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    if (disabledDates && disabledDates(date)) return true;
    return false;
  };

  const handleInputChange = (value: string, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromInput(value);
    } else {
      setToInput(value);
    }

    // Try to parse the date - prioritize Indian format (DD/MM/YYYY)
    const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
    let parsedDate: Date | null = null;

    for (const fmt of formats) {
      try {
        const parsed = parse(value, fmt, new Date());
        if (isValid(parsed)) {
          parsedDate = parsed;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (parsedDate && isValid(parsedDate)) {
      if (type === 'from') {
        handleDateRangeChange({ from: parsedDate, to: dateRange?.to });
        setMonth(parsedDate);
      } else {
        handleDateRangeChange({ from: dateRange?.from, to: parsedDate });
      }
    }
  };

  const sizeClasses = {
    sm: "h-8 text-xs",
    md: "h-9 text-sm",
    lg: "h-10 text-base"
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          disabled={disabled}
          className={cn(
            sizeClasses[buttonSize],
            "justify-start text-left font-normal min-w-[200px]",
            !dateRange?.from && !dateRange?.to && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {dateRange?.from ? (
              dateRange.to ? (
                `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
              ) : (
                format(dateRange.from, "MMM dd, yyyy")
              )
            ) : (
              placeholder
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-w-5xl" align="start">
        <div className="flex flex-col lg:flex-row">
          {/* Left Side - Filters */}
          <div className="p-4 space-y-4 lg:border-r lg:w-80">
            {/* Date Input Fields */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Date Entry</p>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="From (DD/MM/YYYY)"
                  value={fromInput || (dateRange?.from ? format(dateRange.from, "dd/MM/yyyy") : "")}
                  onChange={(e) => handleInputChange(e.target.value, 'from')}
                  className="h-8 text-xs"
                />
                <Input
                  type="text"
                  placeholder="To (DD/MM/YYYY)"
                  value={toInput || (dateRange?.to ? format(dateRange.to, "dd/MM/yyyy") : "")}
                  onChange={(e) => handleInputChange(e.target.value, 'to')}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Quick Filters */}
            {showStandardFilters && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">Quick Filters</p>
                <div className="grid grid-cols-1 gap-2">
                  {getStandardQuickFilters().map((filter) => (
                    <Button
                      key={filter.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const range = filter.getValue();
                        handleDateRangeChange(range);
                        setFromInput("");
                        setToInput("");
                      }}
                      className="h-8 text-xs justify-start"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Years */}
            {showFinancialYears && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">Financial Years</p>
                <div className="grid grid-cols-1 gap-2">
                  {getFinancialYearRanges().map((fy) => (
                    <Button
                      key={fy.key}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleDateRangeChange({ from: fy.start, to: fy.end });
                        setFromInput("");
                        setToInput("");
                      }}
                      className="h-8 text-xs justify-start"
                      title={`${fy.label}: ${format(fy.start, 'dd MMM yyyy')} - ${format(fy.end, 'dd MMM yyyy')}`}
                    >
                      {fy.displayLabel}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Filters */}
            {customQuickFilters.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">Custom Filters</p>
                <div className="grid grid-cols-1 gap-2">
                  {customQuickFilters.map((filter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const range = filter.getValue();
                        handleDateRangeChange(range);
                        setFromInput("");
                        setToInput("");
                      }}
                      className="h-8 text-xs justify-start"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Reset Button */}
            {showResetButton && (dateRange?.from || dateRange?.to) && (
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="w-full h-8"
                >
                  {resetLabel}
                </Button>
              </div>
            )}
          </div>

          {/* Right Side - Calendar */}
          <div className="p-4">
            {/* Month/Year Selection */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newMonth = new Date(month);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setMonth(newMonth);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex gap-2 flex-1">
                <Select
                  value={month.getMonth().toString()}
                  onValueChange={(value) => {
                    const newMonth = new Date(month);
                    newMonth.setMonth(parseInt(value));
                    setMonth(newMonth);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={month.getFullYear().toString()}
                  onValueChange={(value) => {
                    const newMonth = new Date(month);
                    newMonth.setFullYear(parseInt(value));
                    setMonth(newMonth);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newMonth = new Date(month);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setMonth(newMonth);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar */}
            <Calendar
              mode="range"
              month={month}
              onMonthChange={setMonth}
              selected={{
                from: dateRange?.from,
                to: dateRange?.to
              }}
              onSelect={(range) => {
                if (range) {
                  handleDateRangeChange({
                    from: range.from,
                    to: range.to
                  });
                  setFromInput("");
                  setToInput("");
                }
              }}
              numberOfMonths={numberOfMonths}
              disabled={isDateDisabled}
              className="rounded-md border-0"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
export default DateRangePicker