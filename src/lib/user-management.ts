export type AppRole = "admin" | "user";

export const normalizeRole = (role?: string | null): AppRole => {
  return role === "admin" ? "admin" : "user";
};

export const roleOptions: AppRole[] = ["user", "admin"];
