"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) return false;
  return !isNaN(date.getTime());
}

interface DatePickerProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  label = "Date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(date ?? undefined);
  const [value, setValue] = React.useState(formatDate(date ?? undefined));

  React.useEffect(() => {
    setValue(formatDate(date ?? undefined));
    setMonth(date ?? undefined);
  }, [date]);

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date" >
        {label}
      </Label>
      <div className="relative flex gap-2">
        <Input
          id="date"
          value={value}
          placeholder={placeholder}
          className="bg-background pr-10"
          onChange={(e) => {
            setValue(e.target.value);
            const parsed = new Date(e.target.value);
            if (isValidDate(parsed)) {
              setDate(parsed);
              setMonth(parsed);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              tabIndex={-1}
              type="button"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date ?? undefined}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={(selected) => {
                setDate(selected ?? null);
                setValue(formatDate(selected ?? undefined));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}