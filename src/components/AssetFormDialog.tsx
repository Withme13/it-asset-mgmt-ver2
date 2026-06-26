import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Asset = {
  id?: string;
  computer_name: string;
  ex_computer_name: string;
  division: string;
  buy_year: number | null;
  exp_warranty: string | null;
  user_name: string;
  ex_user: string;
  location: string;
  pc_type: string;
  sn_pc: string;
  asuransi: string;
  memory_computer: string;
  operating_system: string;
  type_memory: string;
  type_office: string;
  license_office: string;
  device: string;
  tanggal_datang: string | null;
  status: string;
};

const empty: Asset = {
  computer_name: "", ex_computer_name: "", division: "", buy_year: null, exp_warranty: null,
  user_name: "", ex_user: "", location: "", pc_type: "", sn_pc: "", asuransi: "",
  memory_computer: "", operating_system: "", type_memory: "", type_office: "",
  license_office: "", device: "", tanggal_datang: null, status: "Active",
};

const fields: { key: keyof Asset; label: string; type?: string; options?: string[] }[] = [
  { key: "computer_name", label: "Computer Name" },
  { key: "ex_computer_name", label: "Ex Computer Name" },
  { key: "division", label: "Division" },
  { key: "buy_year", label: "Buy Year", type: "number" },
  { key: "exp_warranty", label: "Exp Warranty", type: "date" },
  { key: "user_name", label: "User" },
  { key: "ex_user", label: "Ex User" },
  { key: "location", label: "Location", type: "select", options: ["Cempaka", "Fachrudin"] },
  { key: "pc_type", label: "PC Type" },
  { key: "sn_pc", label: "SN PC" },
  { key: "asuransi", label: "Asuransi", type: "select", options: ["Yes", "No"] },
  { key: "memory_computer", label: "Memory Computer" },
  { key: "operating_system", label: "Operating System", type: "select", options: ["Windows 11 Pro", "Windows 10 Pro"] },
  { key: "type_memory", label: "Type Memory" },
  { key: "type_office", label: "Type Office", type: "select", options: ["Office 2016", "Office 2019", "Office 2021"] },
  { key: "license_office", label: "License Office" },
  { key: "device", label: "Device", type: "select", options: ["Notebook", "PC"] },
  { key: "tanggal_datang", label: "Tanggal Datang", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Backup", "Broken", "For sale", "Lost"] },
];

export function AssetFormDialog({
  open, onOpenChange, asset, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  asset?: Asset | null;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Asset>(empty);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setData(asset ? { ...asset } : empty);
  }, [asset, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...data, buy_year: data.buy_year || null, exp_warranty: data.exp_warranty || null };
      if (asset?.id) {
        const { error } = await supabase.from("assets").update(payload).eq("id", asset.id);
        if (error) throw error;
        toast({ title: "Asset updated" });
      } else {
        const { error } = await supabase.from("assets").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast({ title: "Asset created" });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset?.id ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-[12px]">{f.label}</Label>
              {f.type === "select" ? (
                <Select
                  value={(data[f.key] as any) ?? ""}
                  onValueChange={(v) => setData({ ...data, [f.key]: v as any })}
                >
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type || "text"}
                  value={(data[f.key] as any) ?? ""}
                  onChange={(e) => {
                    const v = f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value;
                    setData({ ...data, [f.key]: v as any });
                  }}
                  className="h-9 text-[13px]"
                />
              )}
            </div>
          ))}
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
