-- Assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  computer_name TEXT NOT NULL DEFAULT '',
  ex_computer_name TEXT NOT NULL DEFAULT '',
  division TEXT NOT NULL DEFAULT '',
  buy_year INTEGER,
  exp_warranty DATE,
  user_name TEXT NOT NULL DEFAULT '',
  ex_user TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  pc_type TEXT NOT NULL DEFAULT '',
  sn_pc TEXT NOT NULL DEFAULT '',
  asuransi TEXT NOT NULL DEFAULT '',
  memory_computer TEXT NOT NULL DEFAULT '',
  operating_system TEXT NOT NULL DEFAULT '',
  type_memory TEXT NOT NULL DEFAULT '',
  type_office TEXT NOT NULL DEFAULT '',
  license_office TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets viewable by authenticated" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update assets" ON public.assets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stocks table
CREATE TABLE public.stocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_date DATE,
  category TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  given_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stocks viewable by authenticated" ON public.stocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stocks" ON public.stocks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update stocks" ON public.stocks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete stocks" ON public.stocks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON public.stocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();