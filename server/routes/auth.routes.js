import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { asyncHandler, ApiError } from "../utils/http.js";
import { signJwt } from "../utils/jwt.js";
import { verifyPassword } from "../utils/password.js";
import { loginSchema } from "../validators/taskSchemas.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid login payload", parsed.error.flatten());

    const { email, password } = parsed.data;
    const { data: user, error } = await supabaseAdmin
      .from("backend_users")
      .select("id,email,password_hash,full_name,role,department,is_active")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!user?.is_active || !verifyPassword(password, user.password_hash)) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
      },
    });
  }),
);
