import { supabaseAdmin } from "../config/supabase.js";
import { hashPassword } from "../utils/password.js";

const [, , email, password, role = "admin", fullName = "Admin User"] = process.argv;

if (!email || !password) {
  console.error("Usage: npm run api:create-user -- email@example.com password admin \"Full Name\"");
  process.exit(1);
}

const { data, error } = await supabaseAdmin
  .from("backend_users")
  .upsert({
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    role,
    full_name: fullName,
    is_active: true,
  }, { onConflict: "email" })
  .select("id,email,role,full_name")
  .single();

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Backend user ready: ${data.email} (${data.role})`);
