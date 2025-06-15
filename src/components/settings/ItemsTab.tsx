import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function ItemsTab() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="track-inventory" defaultChecked />
            <Label htmlFor="track-inventory">Enable Inventory Tracking</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="allow-negative-stock" />
            <Label htmlFor="allow-negative-stock">Allow Negative Stock</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="enable-variants" />
            <Label htmlFor="enable-variants">Enable Item Variants</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
