import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";
import { exportToPDF } from "@/lib/export-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Bill = {
  id?: string;
  kategori_tagihan: string;
  year: number;
  jan: number; feb: number; mar: number; apr: number; may: number; jun: number;
  jul: number; aug: number; sep: number; oct: number; nov: number; dec: number;
};

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const;
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Des"];

const empty: Bill = {
  kategori_tagihan: "", year: new Date().getFullYear(),
  jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
};

const total = (b: Bill) => MONTHS.reduce((s, m) => s + Number(b[m] || 0), 0);
const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export default function Bills() {
  const [items, setItems] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState<Bill>(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("monthly_bills" as any).select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setForm(editing ? { ...editing } : empty); }, [editing, open]);

  const save = async () => {
    setSaving(true);
    try {
      if (editing?.id) {
        const { error } = await supabase.from("monthly_bills" as any).update(form).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Tagihan diperbarui" });
      } else {
        const { error } = await supabase.from("monthly_bills" as any).insert({ ...form, created_by: user?.id });
        if (error) throw error;
        toast({ title: "Tagihan ditambahkan" });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus tagihan ini?")) return;
    const { error } = await supabase.from("monthly_bills" as any).delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  const grand = items.reduce((s, b) => s + total(b), 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Bayar Bulanan</h1>
            <p className="text-[13px] text-muted-foreground">Catatan tagihan bulanan per kategori</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToExcel(items.map(b => ({ ...b, total: total(b) })), "bayar-bulanan", "Bills")} className="h-9" disabled={!items.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(items, [
              { header: "No", accessor: (r: any) => items.indexOf(r) + 1, align: "right" },
              { header: "Kategori", accessor: "kategori_tagihan" },
              { header: "Tahun", accessor: "year", align: "right" },
              ...MONTHS.map((m, i) => ({ header: MONTH_LABELS[i], accessor: (r: any) => Number(r[m]) ? fmt(Number(r[m])) : "—", align: "right" as const })),
              { header: "Total", accessor: (r: any) => fmt(total(r)), align: "right" as const },
            ], "bayar-bulanan", "Bayar Bulanan Report")} className="h-9" disabled={!items.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Tagihan
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-[12.5px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9 w-12">No</TableHead>
                  <TableHead className="h-9">Kategori Tagihan</TableHead>
                  {MONTH_LABELS.map((m) => <TableHead key={m} className="h-9 text-right">{m}</TableHead>)}
                  <TableHead className="h-9 text-right font-semibold">Total</TableHead>
                  <TableHead className="h-9 sticky right-0 bg-muted/40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={16} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={16} className="h-24 text-center text-muted-foreground">Belum ada data tagihan.</TableCell></TableRow>
                ) : items.map((b, i) => (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell className="py-2 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-2 font-medium whitespace-nowrap">{b.kategori_tagihan || "—"}</TableCell>
                    {MONTHS.map((m) => (
                      <TableCell key={m} className="py-2 text-right tabular-nums">{Number(b[m]) ? fmt(Number(b[m])) : "—"}</TableCell>
                    ))}
                    <TableCell className="py-2 text-right font-semibold tabular-nums">{fmt(total(b))}</TableCell>
                    <TableCell className="py-2 sticky right-0 bg-background">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(b); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(b.id!)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-between text-[12px] text-muted-foreground">
          <span>{items.length} kategori</span>
          <span>Grand Total: <span className="font-semibold text-foreground tabular-nums">{fmt(grand)}</span></span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Tagihan" : "Tambah Tagihan"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[12px]">Kategori Tagihan</Label>
                <Input className="h-9 text-[13px]" value={form.kategori_tagihan} onChange={(e) => setForm({ ...form, kategori_tagihan: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px]">Tahun</Label>
                <Input type="number" className="h-9 text-[13px]" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MONTHS.map((m, idx) => (
                <div key={m} className="space-y-1">
                  <Label className="text-[12px]">{MONTH_LABELS[idx]}</Label>
                  <Input type="number" className="h-9 text-[13px]" placeholder="Rp 0,00" value={form[m] || ""} onChange={(e) => setForm({ ...form, [m]: Number(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
            <div className="text-right text-[13px] text-muted-foreground">
              Total: <span className="font-semibold text-foreground tabular-nums">{fmt(total(form))}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
