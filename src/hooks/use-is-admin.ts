import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      const [legacyRole, accountRole] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
        supabase
          .from("user_accounts")
          .select("role")
          .eq("auth_user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
      ]);
      if (!cancelled) {
        setIsAdmin(!!legacyRole.data || !!accountRole.data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
