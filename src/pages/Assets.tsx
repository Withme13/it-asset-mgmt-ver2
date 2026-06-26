import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Search, Pencil, Trash2, Loader2, Laptop, Monitor, Apple, HardDrive,
  Server, Cpu, MapPin, User as UserIcon, Building2, Calendar, Shield, Hash,
  Briefcase, FileKey, Clock, Activity, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";
import { exportToPDF } from "@/lib/export-pdf";
import { AssetFormDialog, type Asset } from "@/components/AssetFormDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function warrantyStatus(exp: string | null) {
  if (!exp) return { label: "No data", cls: "border-border text-muted-foreground bg-muted/40" };
  const days = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", cls: "bg-destructive/15 text-destructive border-destructive/30" };
  if (days < 30) return { label: `${days}d left`, cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" };
  return { label: "Active", cls: "bg-green-500/15 text-green-500 border-green-500/30" };
}

function deviceIcon(asset: Asset) {
  const t = `${asset.pc_type || ""} ${asset.device || ""} ${asset.operating_system || ""}`.toLowerCase();
  if (t.includes("mac") || t.includes("apple") || t.includes("osx") || t.includes("os x")) return Apple;
  if (t.includes("laptop") || t.includes("notebook")) return Laptop;
  if (t.includes("server")) return Server;
  if (t.includes("desktop") || t.includes("pc") || t.includes("workstation")) return Monitor;
  return HardDrive;
}

function Field({ icon: Icon, label, value, mono }: { icon?: any; label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className="text-[11px] text-muted-foreground w-[110px] shrink-0">{label}</span>
      <span className={cn("text-[12.5px] text-foreground truncate flex-1", mono && "font-mono text-[11.5px]")}>
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 backdrop-blur-sm hover:border-border transition-colors">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[11px] uppercase tracking-wider text-foreground/80 font-medium">{title}</h3>
      </div>
      <div className="p-1.5 space-y-0.5">{children}</div>
    </div>
  );
}

export default function Assets() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [divFilter, setDivFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [detail, setDetail] = useState<Asset | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Asset deleted" });
    setDetail(null);
    load();
  };

  const divisions = Array.from(new Set(items.map((i) => i.division).filter(Boolean)));

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      i.computer_name?.toLowerCase().includes(s) ||
      i.sn_pc?.toLowerCase().includes(s) ||
      i.user_name?.toLowerCase().includes(s) ||
      i.location?.toLowerCase().includes(s);
    const matchDiv = divFilter === "all" || i.division === divFilter;
    const status = warrantyStatus(i.exp_warranty).label;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && status === "Active") ||
      (statusFilter === "expired" && status === "Expired") ||
      (statusFilter === "soon" && status.includes("d left"));
    return matchSearch && matchDiv && matchStatus;
  });

  // stats
  const total = items.length;
  const active = items.filter(i => warrantyStatus(i.exp_warranty).label === "Active").length;
  const soon = items.filter(i => warrantyStatus(i.exp_warranty).label.includes("d left")).length;
  const expired = items.filter(i => warrantyStatus(i.exp_warranty).label === "Expired").length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Assets</h1>
            <p className="text-[13px] text-muted-foreground">IT asset inventory & monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToExcel(filtered, "assets", "Assets")} className="h-9" disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(filtered, [
              { header: "No", accessor: (r: any) => filtered.indexOf(r) + 1, align: "right" },
              { header: "Computer Name", accessor: "computer_name" },
              { header: "Division", accessor: "division" },
              { header: "User", accessor: "user_name" },
              { header: "Location", accessor: "location" },
              { header: "PC Type", accessor: "pc_type" },
              { header: "SN PC", accessor: "sn_pc" },
              { header: "OS", accessor: "operating_system" },
              { header: "Device", accessor: "device" },
              { header: "Buy Year", accessor: "buy_year", align: "right" },
              { header: "Warranty", accessor: "exp_warranty" },
              { header: "Status", accessor: "status" },
            ], "assets", "Assets Report")} className="h-9" disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Add Asset
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Assets", value: total, cls: "text-foreground" },
            { label: "Active Warranty", value: active, cls: "text-green-500" },
            { label: "Expiring Soon", value: soon, cls: "text-yellow-500" },
            { label: "Expired", value: expired, cls: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="border border-border rounded-md p-3 bg-card/40">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-semibold mt-1", s.cls)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, SN, user, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-[13px]"
            />
          </div>
          <Select value={divFilter} onValueChange={setDivFilter}>
            <SelectTrigger className="h-9 w-[160px] text-[13px]"><SelectValue placeholder="Division" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All divisions</SelectItem>
              {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px] text-[13px]"><SelectValue placeholder="Warranty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="soon">Expiring soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compact table */}
        <div className="border border-border rounded-md overflow-hidden bg-card/20">
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-border">
                <TableHead className="h-10 w-14 text-[11px] uppercase tracking-wider">No</TableHead>
                <TableHead className="h-10 text-[11px] uppercase tracking-wider">Computer Name</TableHead>
                <TableHead className="h-10 text-[11px] uppercase tracking-wider">Division</TableHead>
                <TableHead className="h-10 text-[11px] uppercase tracking-wider">User</TableHead>
                <TableHead className="h-10 text-[11px] uppercase tracking-wider">Location</TableHead>
                <TableHead className="h-10 text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="h-10 text-[11px] uppercase tracking-wider">Warranty</TableHead>
                <TableHead className="h-10 w-20 text-right text-[11px] uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No assets found.</TableCell></TableRow>
              ) : filtered.map((a, idx) => {
                const st = warrantyStatus(a.exp_warranty);
                const Icon = deviceIcon(a);
                return (
                  <TableRow
                    key={a.id}
                    className="border-border/60 hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => setDetail(a)}
                  >
                    <TableCell className="py-2.5 text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-muted/60 border border-border flex items-center justify-center group-hover:border-primary/40 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-foreground/80" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {a.computer_name || "—"}
                          </p>
                          {a.pc_type && <p className="text-[11px] text-muted-foreground truncate">{a.pc_type}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      {a.division ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11.5px] bg-muted/60 border border-border/60 text-foreground/80">
                          {a.division}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="py-2.5 whitespace-nowrap">{a.user_name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="py-2.5 whitespace-nowrap text-muted-foreground">{a.location || "—"}</TableCell>
                    <TableCell className="py-2.5">
                      {a.status === "Backup" ? (
                        <Badge variant="outline" className="bg-blue-500/15 text-blue-500 border-blue-500/30">Backup</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/15 text-green-500 border-green-500/30">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5"><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
                    <TableCell className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id!)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-[12px] text-muted-foreground">{filtered.length} of {items.length} assets</p>
      </div>

      <AssetFormDialog open={dialogOpen} onOpenChange={setDialogOpen} asset={editing} onSaved={load} />

      {/* Detail dialog - landscape */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-[min(1280px,95vw)] p-0 gap-0 border-border/60 bg-background/95 backdrop-blur-xl max-h-[92vh] overflow-hidden flex flex-col">
          {detail && (() => {
            const Icon = deviceIcon(detail);
            const st = warrantyStatus(detail.exp_warranty);
            return (
              <>
                <DialogTitle className="sr-only">{detail.computer_name || "Asset detail"}</DialogTitle>
                <DialogDescription className="sr-only">Asset details</DialogDescription>
                <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-card/60 to-transparent">
                  <div className="h-11 w-11 rounded-lg bg-muted/60 border border-border flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold truncate">{detail.computer_name || "Unnamed asset"}</h2>
                      <Badge variant="outline" className={cn("text-[10.5px]", st.cls)}>{st.label}</Badge>
                      {detail.status === "Backup" ? (
                        <Badge variant="outline" className="text-[10.5px] bg-blue-500/15 text-blue-500 border-blue-500/30">Backup</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10.5px] bg-green-500/15 text-green-500 border-green-500/30">Active</Badge>
                      )}
                      {detail.device && <Badge variant="outline" className="text-[10.5px]">{detail.device}</Badge>}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                      {detail.pc_type || "Asset"} · {detail.division || "No division"} · {detail.location || "No location"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditing(detail); setDialogOpen(true); setDetail(null); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(detail.id!)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      { icon: UserIcon, label: "User", value: detail.user_name || "Unassigned" },
                      { icon: Cpu, label: "Memory", value: detail.memory_computer || "—" },
                      { icon: HardDrive, label: "OS", value: detail.operating_system || "—" },
                      { icon: Calendar, label: "Buy Year", value: detail.buy_year || "—" },
                    ].map((c) => (
                      <div key={c.label} className="rounded-md border border-border/60 bg-card/30 px-3 py-2 hover:border-primary/40 transition-colors">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <c.icon className="h-3 w-3" />
                          <span className="text-[10.5px] uppercase tracking-wider">{c.label}</span>
                        </div>
                        <p className="text-[13px] font-medium mt-0.5 truncate">{c.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <Section icon={Briefcase} title="Assignment">
                      <Field icon={UserIcon} label="Current User" value={detail.user_name} />
                      <Field icon={UserIcon} label="Previous User" value={detail.ex_user} />
                      <Field icon={Building2} label="Division" value={detail.division} />
                      <Field icon={MapPin} label="Location" value={detail.location} />
                    </Section>

                    <Section icon={Cpu} title="Hardware">
                      <Field icon={Hash} label="Serial Number" value={detail.sn_pc} mono />
                      <Field icon={Monitor} label="PC Type" value={detail.pc_type} />
                      <Field icon={HardDrive} label="Device" value={detail.device} />
                      <Field icon={Cpu} label="Memory" value={detail.memory_computer} />
                      <Field label="Memory Type" value={detail.type_memory} />
                      <Field label="Operating System" value={detail.operating_system} />
                    </Section>

                    <Section icon={FileKey} title="Software">
                      <Field label="Office Type" value={detail.type_office} />
                      <Field label="Office License" value={detail.license_office} mono />
                    </Section>

                    <Section icon={Shield} title="Warranty & Insurance">
                      <Field icon={Calendar} label="Buy Year" value={detail.buy_year} />
                      <Field icon={Calendar} label="Arrival Date" value={detail.tanggal_datang} />
                      <Field icon={Shield} label="Warranty Expiry" value={detail.exp_warranty} />
                      <Field icon={Shield} label="Insurance" value={detail.asuransi} />
                    </Section>

                    <Section icon={Clock} title="History">
                      <Field label="Previous Name" value={detail.ex_computer_name} />
                      <Field label="Previous User" value={detail.ex_user} />
                    </Section>

                    <Section icon={Activity} title="Current Status">
                      <Field icon={Activity} label="Status" value={detail.status} />
                      <Field icon={Shield} label="Warranty" value={st.label} />
                    </Section>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
