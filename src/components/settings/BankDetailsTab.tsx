import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function BankDetailsTab() {
  return (
    <Card>
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="upi-qr" />
            <Label htmlFor="upi-qr">Print UPI QR Code on invoice</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="print-bank" defaultChecked />
            <Label htmlFor="print-bank">Print this Bank Account Details on invoices</Label>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Account Holder Name</Label>
              <Input placeholder="Enter Account Holder Name" />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input placeholder="Enter Bank Name" />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input placeholder="Enter Account Number" />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input placeholder="Enter IFSC Code" />
            </div>
            <div className="col-span-full">
              <Label>UPI ID</Label>
              <Input placeholder="Enter UPI ID" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
