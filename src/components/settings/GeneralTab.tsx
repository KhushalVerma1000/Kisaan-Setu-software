"use client"
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GeneralTab() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Company Name *</Label>
            <Input defaultValue="BHOO-KRANTI HASANGANJ KRISHAK FARMER PRODUCER COMP" />
          </div>
          <div>
            <Label>Owner Name *</Label>
            <Input defaultValue="BHOO-KRANTI HASANGANJ KRISHAK FARMER PRODUCER COMP" />
          </div>
          <div>
            <Label>Company Incorporation Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea defaultValue="C/O CHANDRA KANT PATHAK PILKHANA RASIDPUR HASANGANJ, Unnao, UNNAO, Uttar Pradesh, India, 209881" />
          </div>
          <div>
            <Label>City</Label>
            <Input defaultValue="Hasanganj" />
          </div>
          <div>
            <Label>State *</Label>
            <Select defaultValue="Uttar Pradesh">
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Phone No</Label>
            <Input defaultValue="9936397773" />
          </div>
          <div>
            <Label>Invoice Email</Label>
            <Input placeholder="Enter invoice email" />
          </div>
          <div>
            <Label>GST Number</Label>
            <Input defaultValue="09AALCB3588J1Z2" />
          </div>
          <div>
            <Label>Logo</Label>
            <Input type="file" />
            <a href="#" className="text-sm text-green-600 hover:underline mt-1 inline-block">Download Image</a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
