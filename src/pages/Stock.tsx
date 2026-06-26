import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/export-excel";
import { exportToPDF } from "@/lib/export-pdf";
import { StockFormDialog, type Stock } from "@/components/StockFormDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function StockPage() {
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Stock | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stocks").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this stock item?")) return;
    const { error } = await supabase.from("stocks").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Stock deleted" });
    load();
  };

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      i.category?.toLowerCase().includes(s) ||
      i.type?.toLowerCase().includes(s) ||
      i.user_name?.toLowerCase().includes(s);
    const matchCat = catFilter === "all" || i.category === catFilter;
    return matchSearch && matchCat;
  });

  const issued = items.filter((i) => i.given_date).length;
  const inStock = items.length - issued;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Stock</h1>
            <p className="text-[13px] text-muted-foreground">Inventory of items available and issued</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToExcel(filtered, "stock", "Stock")} className="h-9" disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportToPDF(filtered, [
              { header: "No", accessor: (r: any) => filtered.indexOf(r) + 1, align: "right" },
              { header: "Tanggal Pembelian", accessor: "purchase_date" },
              { header: "Category", accessor: "category" },
              { header: "Type", accessor: "type" },
              { header: "User", accessor: "user_name" },
              { header: "Tanggal Diberikan", accessor: "given_date" },
              { header: "Status", accessor: (r: any) => r.given_date ? "Issued" : "In Stock" },
            ], "stock", "Stock Report")} className="h-9" disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="h-9">
              <Plus className="h-4 w-4 mr-1.5" /> Add Stock
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: items.length, cls: "text-foreground" },
            { label: "In Stock", value: inStock, cls: "text-green-500" },
            { label: "Issued", value: issued, cls: "text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="border border-border rounded-md p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold mt-1 ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search category, type, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-[13px]"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[180px] text-[13px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-9 w-12">No</TableHead>
                <TableHead className="h-9">Tanggal Pembelian</TableHead>
                <TableHead className="h-9">Category</TableHead>
                <TableHead className="h-9">Type</TableHead>
                <TableHead className="h-9">User</TableHead>
                <TableHead className="h-9">Tanggal Diberikan</TableHead>
                <TableHead className="h-9">Status</TableHead>
                <TableHead className="h-9 w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No stock items found.</TableCell></TableRow>
              ) : filtered.map((s, idx) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="py-2 text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2">{s.purchase_date || "—"}</TableCell>
                  <TableCell className="py-2 font-medium">{s.category || "—"}</TableCell>
                  <TableCell className="py-2">{s.type || "—"}</TableCell>
                  <TableCell className="py-2">{s.user_name || "—"}</TableCell>
                  <TableCell className="py-2">{s.given_date || "—"}</TableCell>
                  <TableCell className="py-2">
                    {s.given_date ? (
                      <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30">Issued</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/15 text-green-500 border-green-500/30">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id!)}>
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

      <StockFormDialog open={dialogOpen} onOpenChange={setDialogOpen} stock={editing} onSaved={load} />
    </AppLayout>
  );
}
