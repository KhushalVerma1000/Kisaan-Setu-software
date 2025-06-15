import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function InvoiceTab() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="show-prefix" defaultChecked />
            <Label htmlFor="show-prefix">Enable Invoice Prefix</Label>
          </div>
          <div>
            <Label htmlFor="invoice-prefix">Invoice Prefix</Label>
            <Input id="invoice-prefix" placeholder="e.g. INV" defaultValue="INV" />
          </div>
          <div>
            <Label htmlFor="start-number">Start Invoice Number</Label>
            <Input id="start-number" type="number" defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="footer-note">Invoice Footer Note</Label>
            <Input id="footer-note" placeholder="Thank you for your business!" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
