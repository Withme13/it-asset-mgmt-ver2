import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";
import { exportToPDF } from "@/lib/export-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Purchase = {
  id?: string;
  tanggal_po: string | null;
  nama_barang: string;
  request: string;
  group_name: string;
  category: string;
  vendor: string;
  jumlah: number;
  harga_satuan: number;
};

const empty: Purchase = {
  tanggal_po: null, nama_barang: "", request: "", group_name: "",
  category: "", vendor: "", jumlah: 0, harga_satuan: 0,
};

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const lineTotal = (p: Purchase) => Number(p.jumlah || 0) * Number(p.harga_satuan || 0);

export default function Purchases() {
  const [items, setItems] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState<Purchase>(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("purchases" as any).select("*").order("tanggal_po", { ascending: false, nullsFirst: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setForm(editing ? { ...editing } : empty); }, [editing, open]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, tanggal_po: form.tanggal_po || null };
      if (editing?.id) {
        const { error } = await supabase.from("purchases" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Belanja diperbarui" });
      } else {
        const { error } = await supabase.from("purchases" as any).insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast({ title: "Belanja ditambahkan" });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus data belanja ini?")) return;
    const { error } = await supabase.from("purchases" as any).delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    return !s || i.nama_barang?.toLowerCase().includes(s) || i.vendor?.toLowerCase().includes(s) || i.category?.toLowerCase().includes(s);
  });
  const grand = filtered.reduce((s, p) => s + lineTotal(p), 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Belanja</h1>
            <p className="text-[13px] text-muted-foreground">Pencatatan pembelian / Purchase Order</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToExcel(items.map(p => ({ ...p, total: lineTotal(p) })), "belanja", "Purchases")} className="h-9" disabled={!items.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(filtered, [
              { header: "No", accessor: (r: any) => filtered.indexOf(r) + 1, align: "right" },
              { header: "Tanggal PO", accessor: "tanggal_po" },
              { header: "Nama Barang", accessor: "nama_barang" },
              { header: "Request", accessor: "request" },
              { header: "Group", accessor: "group_name" },
              { header: "Category", accessor: "category" },
              { header: "Vendor", accessor: "vendor" },
              { header: "Jumlah", accessor: (r: any) => fmt(Number(r.jumlah)), align: "right" },
              { header: "Harga Satuan", accessor: (r: any) => fmt(Number(r.harga_satuan)), align: "right" },
              { header: "Total", accessor: (r: any) => fmt(lineTotal(r)), align: "right" },
            ], "belanja", "Belanja Report")} className="h-9" disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Belanja
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari nama barang, vendor, kategori..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-[13px]" />
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-[12.5px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9 w-12">No</TableHead>
                  <TableHead className="h-9">Tanggal PO</TableHead>
                  <TableHead className="h-9">Nama Barang</TableHead>
                  <TableHead className="h-9">Request</TableHead>
                  <TableHead className="h-9">Group</TableHead>
                  <TableHead className="h-9">Category</TableHead>
                  <TableHead className="h-9">Vendor</TableHead>
                  <TableHead className="h-9 text-right">Jumlah</TableHead>
                  <TableHead className="h-9 text-right">Harga Satuan</TableHead>
                  <TableHead className="h-9 text-right">Total</TableHead>
                  <TableHead className="h-9 sticky right-0 bg-muted/40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="h-24 text-center text-muted-foreground">Belum ada data belanja.</TableCell></TableRow>
                ) : filtered.map((p, i) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="py-2 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{p.tanggal_po || "—"}</TableCell>
                    <TableCell className="py-2 font-medium whitespace-nowrap">{p.nama_barang || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{p.request || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{p.group_name || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{p.category || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{p.vendor || "—"}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{fmt(Number(p.jumlah))}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{fmt(Number(p.harga_satuan))}</TableCell>
                    <TableCell className="py-2 text-right font-semibold tabular-nums">{fmt(lineTotal(p))}</TableCell>
                    <TableCell className="py-2 sticky right-0 bg-background">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(p.id!)}>
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
          <span>{filtered.length} item</span>
          <span>Grand Total: <span className="font-semibold text-foreground tabular-nums">{fmt(grand)}</span></span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Belanja" : "Tambah Belanja"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <Field label="Tanggal PO" type="date" value={form.tanggal_po ?? ""} onChange={(v) => setForm({ ...form, tanggal_po: v || null })} />
            <Field label="Nama Barang" value={form.nama_barang} onChange={(v) => setForm({ ...form, nama_barang: v })} />
            <Field label="Request" value={form.request} onChange={(v) => setForm({ ...form, request: v })} />
            <Field label="Group" value={form.group_name} onChange={(v) => setForm({ ...form, group_name: v })} />
            <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
            <Field label="Vendor" value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} />
            <Field label="Jumlah" type="number" value={String(form.jumlah)} onChange={(v) => setForm({ ...form, jumlah: Number(v) })} />
            <Field label="Harga Satuan" type="number" value={String(form.harga_satuan)} onChange={(v) => setForm({ ...form, harga_satuan: Number(v) })} />
            <div className="md:col-span-2 text-right text-[13px] text-muted-foreground">
              Total: <span className="font-semibold text-foreground tabular-nums">{fmt(lineTotal(form))}</span>
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

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px]">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px]" />
    </div>
  );
}
