import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function TaxTab() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="gst-enabled" defaultChecked />
            <Label htmlFor="gst-enabled">Enable GST</Label>
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" placeholder="Enter GST Number" defaultValue="09AALCB3588J1Z2" />
          </div>
          <div>
            <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
            <Input id="tax-rate" type="number" defaultValue={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
