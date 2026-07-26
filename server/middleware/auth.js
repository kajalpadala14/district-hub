import { supabaseAdmin } from "../config/supabase.js";
import { verifyJwt } from "../utils/jwt.js";
import { ApiError } from "../utils/http.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Missing bearer token");

    const token = header.slice("Bearer ".length);
    const payload = verifyJwt(token);
    const { data, error } = await supabaseAdmin
      .from("backend_users")
      .select("id,email,full_name,role,department,is_active")
      .eq("id", payload.sub)
      .maybeSingle();

    if (error) throw error;
    if (!data?.is_active) throw new ApiError(401, "User is inactive or not found");

    req.user = data;
    next();
  } catch (error) {
    next(error.status ? error : new ApiError(401, error.message || "Invalid token"));
  }
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, "Insufficient permissions"));
    next();
  };
}

export function canManageTasks(req, _res, next) {
  return requireRoles("admin", "manager")(req, _res, next);
}

export function canDeleteTasks(req, _res, next) {
  return requireRoles("admin")(req, _res, next);
}
