import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FrontendProfile } from "@/types/FrontendProfile";
import { useEffect, useState } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

type InvoiceSettingsForm = {
  invoicePrefix: string;
  startNumber: number;
  defaultTerms: string;
  signatureUrl?: string;
  showPrefix: boolean;
  signatureFile?: File;
};

export default function InvoiceTab({ profile , onProfileChange }: { profile: FrontendProfile | null , onProfileChange: (field: string, value: any) => void }) {
  const [form, setForm] = useState<InvoiceSettingsForm>({
    invoicePrefix: "INV",
    startNumber: 1,
    defaultTerms: "Thank you for your business!",
    signatureUrl: "",
    showPrefix: true,
    signatureFile: undefined,
  });

  useEffect(() => {
    if (profile && profile.invoiceSettings) {
      const settings = profile.invoiceSettings;
      setForm({
        invoicePrefix: settings.invoicePrefix || "INV",
        startNumber: settings.startNumber || 1,
        defaultTerms: settings.defaultTerms || "",
        signatureUrl: settings.signatureUrl || "",
        showPrefix: settings.showPrefix !== undefined ? settings.showPrefix : true,
        signatureFile: settings.signatureFile || undefined,
      });
    }
  }, [profile]);

  const handleChange = (field: keyof InvoiceSettingsForm, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    onProfileChange(field,value);
    console.log("changing values from invoicetab",field,value)
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleChange("signatureFile", e.target.files[0]);
      handleChange("signatureUrl", e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: handle save logic here (API call)
    // You can access form.signatureFile for the file
    // and other fields from form
    alert("Invoice settings saved!");
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4 md:flex gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={form.showPrefix}
                id="show-prefix"
                onCheckedChange={(checked) => handleChange("showPrefix", !!checked)}
              />
              <Label htmlFor="show-prefix">Enable Invoice Prefix</Label>
            </div>
            <div>
              <Label className="mb-2" htmlFor="invoice-prefix">Invoice Prefix</Label>
              <Input
                value={form.invoicePrefix}
                id="invoice-prefix"
                placeholder="e.g. INV"
                onChange={e => handleChange("invoicePrefix", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2" htmlFor="start-number">Start Invoice Number</Label>
              <Input
                value={form.startNumber}
                id="start-number"
                type="number"
                onChange={e => handleChange("startNumber", Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="mb-2" htmlFor="footer-note">Set Default Terms and Conditions</Label>
              <Textarea
                value={form.defaultTerms}
                className="w-full"
                id="footer-note"
                placeholder="Thank you for your business!"
                onChange={e => handleChange("defaultTerms", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2" htmlFor="signature-url">Signature (Upload)</Label>
            <Input
              type="file"
              id="signature-url"
              accept="image/*"
              onChange={handleFileChange}
            />
            {form.signatureUrl && (
              <div className="text-xs mt-2 text-gray-500">Current: {form.signatureUrl}</div>
            )}
            <Button className="mt-4" type="submit" variant="default">Submit</Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}