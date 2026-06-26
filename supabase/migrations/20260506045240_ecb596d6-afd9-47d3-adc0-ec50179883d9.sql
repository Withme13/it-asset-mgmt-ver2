
-- 1. Add tanggal_datang to assets
ALTER TABLE public.assets ADD COLUMN tanggal_datang date;

-- 2. Monthly bills
CREATE TABLE public.monthly_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori_tagihan text NOT NULL DEFAULT '',
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  jan numeric NOT NULL DEFAULT 0,
  feb numeric NOT NULL DEFAULT 0,
  mar numeric NOT NULL DEFAULT 0,
  apr numeric NOT NULL DEFAULT 0,
  may numeric NOT NULL DEFAULT 0,
  jun numeric NOT NULL DEFAULT 0,
  jul numeric NOT NULL DEFAULT 0,
  aug numeric NOT NULL DEFAULT 0,
  sep numeric NOT NULL DEFAULT 0,
  oct numeric NOT NULL DEFAULT 0,
  nov numeric NOT NULL DEFAULT 0,
  dec numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bills viewable by authenticated" ON public.monthly_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert bills" ON public.monthly_bills FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update bills" ON public.monthly_bills FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete bills" ON public.monthly_bills FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_monthly_bills_updated_at BEFORE UPDATE ON public.monthly_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Purchases (belanja)
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal_po date,
  nama_barang text NOT NULL DEFAULT '',
  request text NOT NULL DEFAULT '',
  group_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  jumlah numeric NOT NULL DEFAULT 0,
  harga_satuan numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchases viewable by authenticated" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update purchases" ON public.purchases FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete purchases" ON public.purchases FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Asset clarifications
CREATE TABLE public.asset_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  computer_name text NOT NULL DEFAULT '',
  division text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  lokasi text NOT NULL DEFAULT '',
  pc_type text NOT NULL DEFAULT '',
  sn_pc text NOT NULL DEFAULT '',
  memory_gb numeric,
  operating_system text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  cek_fisik text NOT NULL DEFAULT '',
  cek_performance text NOT NULL DEFAULT '',
  cek_antivirus text NOT NULL DEFAULT '',
  cek_bitlocker text NOT NULL DEFAULT '',
  tanggal_cek date,
  critical text NOT NULL DEFAULT '',
  non_critical text NOT NULL DEFAULT '',
  cia_confidentiality text NOT NULL DEFAULT '',
  cia_integrity text NOT NULL DEFAULT '',
  cia_availability text NOT NULL DEFAULT '',
  lokasi_fisik text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  keterangan text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_clarifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clarifications viewable by authenticated" ON public.asset_clarifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clarifications" ON public.asset_clarifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update clarifications" ON public.asset_clarifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete clarifications" ON public.asset_clarifications FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_asset_clarifications_updated_at BEFORE UPDATE ON public.asset_clarifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
