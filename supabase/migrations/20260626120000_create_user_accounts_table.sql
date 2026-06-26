-- Create a dedicated table for app users with admin/user roles
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account" ON public.user_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own account" ON public.user_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own account" ON public.user_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can manage all accounts" ON public.user_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.sync_user_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_accounts (auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_accounts ON auth.users;
CREATE TRIGGER on_auth_user_created_accounts
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_account();

CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON public.user_accounts(role);
CREATE INDEX IF NOT EXISTS idx_user_accounts_is_active ON public.user_accounts(is_active);
