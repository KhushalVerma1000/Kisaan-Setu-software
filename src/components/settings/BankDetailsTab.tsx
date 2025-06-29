import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FpoProfile } from "@/server/features/fpo/core/entities/FpoProfile";
import { useEffect, useState } from "react";

type BankDetailForm = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  printBankDetails: boolean;
  printUpiQr: boolean;
};

export default function BankDetailsTab({
  profile,
  onProfileChange,
}: {
  profile: FpoProfile | null;
  onProfileChange: (field: keyof BankDetailForm, value: any) => void;
}) {
  const [form, setForm] = useState<BankDetailForm>({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    printBankDetails: false,
    printUpiQr: false,
  });

  useEffect(() => {
    if (profile && profile.bankDetails && profile.bankDetails.length >= 0) {
      const bankDetail = profile.bankDetails[0];
      console.log(bankDetail)
      setForm({
        accountHolderName: bankDetail.accountHolderName || "",
        bankName: bankDetail.bankName || "",
        accountNumber: bankDetail.accountNumber || "",
        ifscCode: bankDetail.ifscCode || "",
        upiId: bankDetail.upiId || "",
        printBankDetails: true,
        printUpiQr: true,
      });
    }
  }, [profile]);

  const handleChange = (field: keyof BankDetailForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    onProfileChange(field, value);
  };

  return (
    <Card>
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={form.printUpiQr}
              id="upi-qr"
              onCheckedChange={(checked) => handleChange("printUpiQr", !!checked)}
            />
            <Label htmlFor="upi-qr">Print UPI QR Code on invoice</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={form.printBankDetails}
              id="print-bank"
              onCheckedChange={(checked) => handleChange("printBankDetails", !!checked)}
            />
            <Label htmlFor="print-bank">Print this Bank Account Details on invoices</Label>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Account Holder Name</Label>
              <Input
                value={form.accountHolderName}
                placeholder="Enter Account Holder Name"
                onChange={(e) => handleChange("accountHolderName", e.target.value)}
              />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input
                value={form.bankName}
                placeholder="Enter Bank Name"
                onChange={(e) => handleChange("bankName", e.target.value)}
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={form.accountNumber}
                placeholder="Enter Account Number"
                onChange={(e) => handleChange("accountNumber", e.target.value)}
              />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input
                value={form.ifscCode}
                placeholder="Enter IFSC Code"
                onChange={(e) => handleChange("ifscCode", e.target.value)}
              />
            </div>
            <div className="col-span-full">
              <Label>UPI ID</Label>
              <Input
                value={form.upiId}
                placeholder="Enter UPI ID"
                onChange={(e) => handleChange("upiId", e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
