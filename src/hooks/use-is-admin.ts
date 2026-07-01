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
      console.log("useIsAdmin: no user");
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      console.log("useIsAdmin: checking admin for user", user.id);
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
      console.log("useIsAdmin: legacyRole.data =", legacyRole.data, "accountRole.data =", accountRole.data);
      if (!cancelled) {
        const adminStatus = !!legacyRole.data || !!accountRole.data;
        console.log("useIsAdmin: isAdmin =", adminStatus);
        setIsAdmin(adminStatus);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
