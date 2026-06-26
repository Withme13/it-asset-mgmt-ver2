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

  const F = ({ k, label, type = "text" }: { k: keyof Stock; label: string; type?: string }) => (
    <div className="space-y-1">
      <Label className="text-[12px]">{label}</Label>
      <Input
        type={type}
        value={(data[k] as any) ?? ""}
        onChange={(e) => setData({ ...data, [k]: e.target.value || (type === "date" ? null : "") } as any)}
        className="h-9 text-[13px]"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stock?.id ? "Edit Stock" : "Add New Stock"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <F k="purchase_date" label="Tanggal Pembelian" type="date" />
          <F k="category" label="Category" />
          <F k="type" label="Type" />
          <F k="user_name" label="User" />
          <F k="given_date" label="Tanggal Diberikan" type="date" />
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
