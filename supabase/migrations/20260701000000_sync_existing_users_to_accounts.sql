-- Sync existing auth users to user_accounts table if not already present
INSERT INTO public.user_accounts (auth_user_id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  CASE 
    WHEN ur.role = 'admin' THEN 'admin'::app_role
    ELSE 'user'::app_role
  END
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id AND ur.role = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_accounts 
  WHERE auth_user_id = au.id
)
ON CONFLICT (auth_user_id) DO NOTHING;
