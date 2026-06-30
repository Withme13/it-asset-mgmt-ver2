import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";
import { exportToPDF } from "@/lib/export-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Clarification = {
  id?: string;
  label: string;
  computer_name: string;
  division: string;
  user_name: string;
  lokasi: string;
  pc_type: string;
  sn_pc: string;
  memory_gb: number | null;
  operating_system: string;
  device: string;
  cek_fisik: string;
  cek_performance: string;
  cek_antivirus: string;
  cek_bitlocker: string;
  tanggal_cek: string | null;
  critical: string;
  non_critical: string;
  cia_confidentiality: string;
  cia_integrity: string;
  cia_availability: string;
  lokasi_fisik: string;
  status: string;
  keterangan: string;
};

const empty: Clarification = {
  label: "", computer_name: "", division: "", user_name: "", lokasi: "",
  pc_type: "", sn_pc: "", memory_gb: null, operating_system: "", device: "",
  cek_fisik: "", cek_performance: "", cek_antivirus: "", cek_bitlocker: "",
  tanggal_cek: null, critical: "", non_critical: "",
  cia_confidentiality: "", cia_integrity: "", cia_availability: "",
  lokasi_fisik: "", status: "", keterangan: "",
};

const fields: { key: keyof Clarification; label: string; type?: string }[] = [
  { key: "label", label: "Label" },
  { key: "computer_name", label: "Computer Name" },
  { key: "division", label: "Division" },
  { key: "user_name", label: "User" },
  { key: "lokasi", label: "Lokasi" },
  { key: "pc_type", label: "PC Type" },
  { key: "sn_pc", label: "SN PC" },
  { key: "memory_gb", label: "Memory Computer (GB)", type: "number" },
  { key: "operating_system", label: "Operating System" },
  { key: "device", label: "Device" },
  { key: "cek_fisik", label: "Pengecekan Fisik" },
  { key: "cek_performance", label: "Pengecekan Performance" },
  { key: "cek_antivirus", label: "Pengecekan Antivirus" },
  { key: "cek_bitlocker", label: "Pengecekan Bitlocker" },
  { key: "tanggal_cek", label: "Tanggal Cek", type: "date" },
  { key: "critical", label: "Critical" },
  { key: "non_critical", label: "Non Critical" },
  { key: "cia_confidentiality", label: "CIA - Confidentiality" },
  { key: "cia_integrity", label: "CIA - Integrity" },
  { key: "cia_availability", label: "CIA - Availability" },
  { key: "lokasi_fisik", label: "Lokasi Fisik" },
  { key: "status", label: "Status" },
  { key: "keterangan", label: "Keterangan" },
];

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("ok") || s.includes("aman") || s.includes("good")) return "bg-green-500/15 text-green-500 border-green-500/30";
  if (s.includes("warning") || s.includes("perhatian")) return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
  if (s.includes("critical") || s.includes("bahaya")) return "bg-destructive/15 text-destructive border-destructive/30";
  return "border-border text-muted-foreground";
}

export default function Clarifications() {
  const [items, setItems] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Clarification | null>(null);
  const [form, setForm] = useState<Clarification>(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("asset_clarifications" as any).select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setForm(editing ? { ...editing } : empty); }, [editing, open]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, memory_gb: form.memory_gb || null, tanggal_cek: form.tanggal_cek || null };
      if (editing?.id) {
        const { error } = await supabase.from("asset_clarifications" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Klarifikasi diperbarui" });
      } else {
        const { error } = await supabase.from("asset_clarifications" as any).insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast({ title: "Klarifikasi ditambahkan" });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus klarifikasi ini?")) return;
    const { error } = await supabase.from("asset_clarifications" as any).delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    return !s || i.computer_name?.toLowerCase().includes(s) || i.user_name?.toLowerCase().includes(s) || i.sn_pc?.toLowerCase().includes(s) || i.label?.toLowerCase().includes(s);
  });

  const exportRows = filtered.map((c, index) => ({
    No: index + 1,
    Label: c.label || "-",
    "Computer Name": c.computer_name || "-",
    Division: c.division || "-",
    User: c.user_name || "-",
    Lokasi: c.lokasi || "-",
    "PC Type": c.pc_type || "-",
    "SN PC": c.sn_pc || "-",
    "Memory Computer (GB)": c.memory_gb ?? "-",
    "Operating System": c.operating_system || "-",
    Device: c.device || "-",
    "Pengecekan Fisik": c.cek_fisik || "-",
    "Pengecekan Performance": c.cek_performance || "-",
    "Pengecekan Antivirus": c.cek_antivirus || "-",
    "Pengecekan Bitlocker": c.cek_bitlocker || "-",
    "Tanggal Cek": c.tanggal_cek || "-",
    Critical: c.critical || "-",
    "Non Critical": c.non_critical || "-",
    Confidentiality: c.cia_confidentiality || "-",
    Integrity: c.cia_integrity || "-",
    Availability: c.cia_availability || "-",
    "Lokasi Fisik": c.lokasi_fisik || "-",
    Status: c.status || "-",
    Keterangan: c.keterangan || "-",
  }));

  const exportColumns = [
    { header: "No", accessor: "No" as const, align: "right", width: 20 },
    { header: "Label", accessor: "Label" as const, width: 70 },
    { header: "Computer Name", accessor: "Computer Name" as const, width: 70 },
    { header: "Division", accessor: "Division" as const, width: 50 },
    { header: "User", accessor: "User" as const, width: 50 },
    { header: "Lokasi", accessor: "Lokasi" as const, width: 35 },
    { header: "PC Type", accessor: "PC Type" as const, width: 35 },
    { header: "SN PC", accessor: "SN PC" as const, width: 55 },
    { header: "Memory Computer (GB)", accessor: "Memory Computer (GB)" as const, width: 30, align: "right" },
    { header: "Operating System", accessor: "Operating System" as const, width: 50 },
    { header: "Device", accessor: "Device" as const, width: 35 },
    { header: "Pengecekan Fisik", accessor: "Pengecekan Fisik" as const, width: 35 },
    { header: "Pengecekan Performance", accessor: "Pengecekan Performance" as const, width: 35 },
    { header: "Pengecekan Antivirus", accessor: "Pengecekan Antivirus" as const, width: 35 },
    { header: "Pengecekan Bitlocker", accessor: "Pengecekan Bitlocker" as const, width: 35 },
    { header: "Tanggal Cek", accessor: "Tanggal Cek" as const, width: 45 },
    { header: "Critical", accessor: "Critical" as const, width: 30 },
    { header: "Non Critical", accessor: "Non Critical" as const, width: 30 },
    { header: "Confidentiality", accessor: "Confidentiality" as const, width: 30 },
    { header: "Integrity", accessor: "Integrity" as const, width: 30 },
    { header: "Availability", accessor: "Availability" as const, width: 30 },
    { header: "Lokasi Fisik", accessor: "Lokasi Fisik" as const, width: 40 },
    { header: "Status", accessor: "Status" as const, width: 30 },
    { header: "Keterangan", accessor: "Keterangan" as const, width: 70 },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Klarifikasi Asset</h1>
            <p className="text-[13px] text-muted-foreground">Pengecekan dan klasifikasi keamanan aset</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToExcel(exportRows, "klarifikasi-asset", "Clarifications")} className="h-9" disabled={!exportRows.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(exportRows, exportColumns, "klarifikasi-asset", "Klarifikasi Asset Report")} className="h-9" disabled={!exportRows.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Klarifikasi
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari label, computer, user, SN..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8 text-[13px]" />
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-[12.5px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead rowSpan={2} className="h-9 w-12 align-middle">No</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Label</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Computer Name</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Division</TableHead>
                  <TableHead rowSpan={2} className="align-middle">User</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Lokasi</TableHead>
                  <TableHead rowSpan={2} className="align-middle">PC Type</TableHead>
                  <TableHead rowSpan={2} className="align-middle">SN PC</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Memory (GB)</TableHead>
                  <TableHead rowSpan={2} className="align-middle">OS</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Device</TableHead>
                  <TableHead colSpan={4} className="text-center border-l border-border">Pengecekan</TableHead>
                  <TableHead rowSpan={2} className="align-middle border-l border-border">Tanggal Cek</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Critical</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Non Critical</TableHead>
                  <TableHead colSpan={3} className="text-center border-l border-border">Kategori CIA</TableHead>
                  <TableHead rowSpan={2} className="align-middle border-l border-border">Lokasi Fisik</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Status</TableHead>
                  <TableHead rowSpan={2} className="align-middle">Keterangan</TableHead>
                  <TableHead rowSpan={2} className="align-middle sticky right-0 bg-muted/40">Actions</TableHead>
                </TableRow>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-8 border-l border-border">Fisik</TableHead>
                  <TableHead className="h-8">Performance</TableHead>
                  <TableHead className="h-8">Antivirus</TableHead>
                  <TableHead className="h-8">Bitlocker</TableHead>
                  <TableHead className="h-8 border-l border-border">Confidentiality</TableHead>
                  <TableHead className="h-8">Integrity</TableHead>
                  <TableHead className="h-8">Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={23} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={23} className="h-24 text-center text-muted-foreground">Belum ada data klarifikasi.</TableCell></TableRow>
                ) : filtered.map((c, i) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="py-2 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap font-medium">{c.label || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.computer_name || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.division || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.user_name || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.lokasi || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.pc_type || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap font-mono text-[11.5px]">{c.sn_pc || "—"}</TableCell>
                    <TableCell className="py-2">{c.memory_gb ?? "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.operating_system || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.device || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap border-l border-border">{c.cek_fisik || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.cek_performance || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.cek_antivirus || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.cek_bitlocker || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap border-l border-border">{c.tanggal_cek || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.critical || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.non_critical || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap border-l border-border">{c.cia_confidentiality || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.cia_integrity || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{c.cia_availability || "—"}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap border-l border-border">{c.lokasi_fisik || "—"}</TableCell>
                    <TableCell className="py-2"><Badge variant="outline" className={statusBadge(c.status)}>{c.status || "—"}</Badge></TableCell>
                    <TableCell className="py-2 whitespace-nowrap max-w-[200px] truncate" title={c.keterangan}>{c.keterangan || "—"}</TableCell>
                    <TableCell className="py-2 sticky right-0 bg-background">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(c.id!)}>
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

        <p className="text-[12px] text-muted-foreground">{filtered.length} of {items.length} data</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Klarifikasi" : "Tambah Klarifikasi Asset"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-[12px]">{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  value={(form[f.key] as any) ?? ""}
                  onChange={(e) => {
                    const v = f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value;
                    setForm({ ...form, [f.key]: v as any });
                  }}
                  className="h-9 text-[13px]"
                />
              </div>
            ))}
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
