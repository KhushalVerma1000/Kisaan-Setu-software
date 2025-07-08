"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Item } from "@/server/features/items/core/entities/Item";
import { Category } from "@/server/features/items/core/entities/Category";
import { Unit } from "@/server/features/items/core/entities/Unit";
import { Gst } from "@/server/features/items/core/entities/Gst";

interface Props {
  mode: "add" | "edit";
  initialData?: Partial<Item>;
  categories: Category[];
  units: Unit[];
  gstRates: Gst[];
  onSubmit: (data: Partial<Item>) => void;
}

export default function ItemForm({
  mode,
  initialData = {},
  categories,
  units,
  gstRates,
  onSubmit
}: Props) {
  const [form, setForm] = useState<Partial<Item>>(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  function update(key: keyof Item, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function isValid() {
    if (!form.name?.trim()) return false;
    if (!form.type) return false;
    if (!form.category_id) return false;
    if (!form.unit) return false;
    if (form.type === "product" && (!form.salePrice || !form.purchasePrice)) return false;
    if (form.type === "service" && !form.salePrice) return false;
    return true;
  }

  return (
    <form
      className="max-w-2xl mx-auto p-4 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValid()) return alert("Please fill all required fields.");
        onSubmit(form);
      }}
    >
      <div>
        <Label>Item Type *</Label>
        <Select value={form.type || ""} onValueChange={(val) => update("type", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Name *</Label>
        <Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} required />
      </div>

      <div>
        <Label>Category *</Label>
        <Select value={form.category_id || ""} onValueChange={(val) => update("category_id", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Unit *</Label>
        <Select value={form.unit || ""} onValueChange={(val) => update("unit", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.type === "product" && (
        <>
          <div>
            <Label>Sale Price *</Label>
            <Input type="number" value={form.salePrice || ""} onChange={(e) => update("salePrice", +e.target.value)} />
          </div>

          <div>
            <Label>Purchase Price *</Label>
            <Input type="number" value={form.purchasePrice || ""} onChange={(e) => update("purchasePrice", +e.target.value)} />
          </div>

          <div>
            <Label>HSN Code</Label>
            <Input value={form.hsn || ""} onChange={(e) => update("hsn", e.target.value)} />
          </div>

          <div>
            <Label>GST Rate</Label>
            <Select value={String(form.gstTaxPercent || "")} onValueChange={(val) => update("gstTaxPercent", +val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select GST" />
              </SelectTrigger>
              <SelectContent>
                {gstRates.map((gst) => (
                  <SelectItem key={gst.percent} value={String(gst.percent)}>{gst.percent}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {form.type === "service" && (
        <>
          <div>
            <Label>Service Rate *</Label>
            <Input type="number" value={form.salePrice || ""} onChange={(e) => update("salePrice", +e.target.value)} />
          </div>

          <div>
            <Label>SAC Code</Label>
            <Input value={form.sac || ""} onChange={(e) => update("sac", e.target.value)} />
          </div>

          <div>
            <Label>GST Rate</Label>
            <Select value={String(form.gstTaxPercent || "")} onValueChange={(val) => update("gstTaxPercent", +val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select GST" />
              </SelectTrigger>
              <SelectContent>
                {gstRates.map((gst) => (
                  <SelectItem key={gst.percent} value={String(gst.percent)}>{gst.percent}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div>
        <Label>Description</Label>
        <Textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} />
      </div>

      <Button type="submit" className="w-full">
        {mode === "edit" ? "Update Item" : "Add Item"}
      </Button>
    </form>
  );
}
