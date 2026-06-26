DROP POLICY IF EXISTS "Authenticated can create invitations" ON public.invitations;

CREATE POLICY "Authenticated can create invitations"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invited_by
    AND (
      role = 'user'::app_role
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );