import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client.server-BPQmgJNv.js
function getSupabaseServerEnv(requireServiceRole = false) {
	const env = {
		supabaseUrl: process.env.SUPABASE_URL,
		supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
		supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
		supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
	};
	const missing = [
		...!env.supabaseUrl ? ["SUPABASE_URL"] : [],
		...!env.supabasePublishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : [],
		...requireServiceRole && !env.supabaseServiceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []
	];
	if (missing.length > 0) throw new Error(`Missing server environment variable(s): ${missing.join(", ")}. Check .env and deployment secrets.`);
	return env;
}
function isNewSupabaseApiKey(value) {
	return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}
function createSupabaseFetch(supabaseKey) {
	return (input, init) => {
		const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : void 0);
		if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
		if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) headers.delete("Authorization");
		headers.set("apikey", supabaseKey);
		return fetch(input, {
			...init,
			headers
		});
	};
}
function createSupabaseAdminClient() {
	const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseServerEnv(true);
	return createClient(supabaseUrl, supabaseServiceRoleKey, {
		global: { fetch: createSupabaseFetch(supabaseServiceRoleKey) },
		auth: {
			storage: void 0,
			persistSession: false,
			autoRefreshToken: false
		}
	});
}
var _supabaseAdmin;
var supabaseAdmin = new Proxy({}, { get(_, prop, receiver) {
	if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
	return Reflect.get(_supabaseAdmin, prop, receiver);
} });
//#endregion
export { supabaseAdmin };
