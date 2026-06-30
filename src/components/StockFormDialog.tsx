import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export type Stock = {
  id?: string;
  purchase_date: string | null;
  category: string;
  type: string;
  user_name: string;
  given_date: string | null;
};

const empty: Stock = { purchase_date: null, category: "", type: "", user_name: "", given_date: null };
const categoryOptions = ["Keyboard", "Converter", "Converter VGA to HDMI", "Mouse", "Flashdisk"];

interface FormFieldProps {
  k: keyof Stock;
  label: string;
  type?: string;
  options?: string[];
  value: any;
  onChange: (key: keyof Stock, value: string) => void;
}

function FormField({ k, label, type = "text", options, value, onChange }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={k} className="text-[12px]">{label}</Label>
      <Input
        id={k}
        type={type}
        list={options && k === "category" ? "stock-category-options" : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(k, e.target.value)}
        className="h-9 text-[13px]"
      />
      {options && k === "category" && (
        <datalist id="stock-category-options">
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export function StockFormDialog({
  open, onOpenChange, stock, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stock?: Stock | null;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Stock>(empty);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setData(stock ? { ...stock } : empty);
  }, [stock, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        purchase_date: data.purchase_date || null,
        category: data.category,
        type: data.type,
        user_name: data.user_name,
        given_date: data.given_date || null,
      };
      if (stock?.id) {
        const { error } = await supabase.from("stocks").update(payload).eq("id", stock.id);
        if (error) throw error;
        toast({ title: "Stock updated" });
      } else {
        const { error } = await supabase.from("stocks").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast({ title: "Stock added" });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (key: keyof Stock, value: string) => {
    setData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stock?.id ? "Edit Stock" : "Add New Stock"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <FormField k="purchase_date" label="Tanggal Pembelian" type="date" value={data.purchase_date} onChange={handleFieldChange} />
          <FormField k="category" label="Category" options={categoryOptions} value={data.category} onChange={handleFieldChange} />
          <FormField k="type" label="Type" value={data.type} onChange={handleFieldChange} />
          <FormField k="user_name" label="User" value={data.user_name} onChange={handleFieldChange} />
          <FormField k="given_date" label="Tanggal Diberikan" type="date" value={data.given_date} onChange={handleFieldChange} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
