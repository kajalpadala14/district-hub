import { n as __exportAll$1 } from "../_runtime.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-Cisra8gy.js
var client_Cisra8gy_exports = /* @__PURE__ */ __exportAll$1({
	n: () => supabase,
	t: () => client_exports
});
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var publicEnvKeys = {
	supabaseUrl: "VITE_SUPABASE_URL",
	supabasePublishableKey: "VITE_SUPABASE_PUBLISHABLE_KEY"
};
function getPublicEnv() {
	const env = {
		supabaseUrl: "https://folangdyguznszcmyzrl.supabase.co",
		supabasePublishableKey: "sb_publishable_bjpwtw4O8TvpLea8cZib2Q_qJyFSyyO"
	};
	assertEnv(env, publicEnvKeys, "public frontend");
	assertNoServerSecretsInClient();
	return env;
}
function assertEnv(env, labels, scope) {
	const missing = Object.entries(env).filter(([, value]) => !value).map(([key]) => labels[key]);
	if (missing.length > 0) throw new Error(`Missing ${scope} environment variable(s): ${missing.join(", ")}. Check .env and .env.example.`);
}
function assertNoServerSecretsInClient() {
	const accidentalSecrets = [
		"VITE_SUPABASE_SERVICE_ROLE_KEY",
		"VITE_GOOGLE_CLIENT_SECRET",
		"VITE_GOOGLE_CLIENT_ID"
	].filter((key) => Boolean({
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_bjpwtw4O8TvpLea8cZib2Q_qJyFSyyO",
		"VITE_SUPABASE_URL": "https://folangdyguznszcmyzrl.supabase.co"
	}[key]));
	if (accidentalSecrets.length > 0) throw new Error(`Unsafe frontend environment variable(s): ${accidentalSecrets.join(", ")}. Secrets must not use the VITE_ prefix.`);
}
var client_exports = /* @__PURE__ */ __exportAll({ supabase: () => supabase });
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
function createSupabaseClient() {
	const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
	return createClient(supabaseUrl, supabasePublishableKey, {
		global: { fetch: createSupabaseFetch(supabasePublishableKey) },
		auth: {
			storage: typeof window !== "undefined" ? localStorage : void 0,
			persistSession: true,
			autoRefreshToken: true
		}
	});
}
var _supabase;
var supabase = new Proxy({}, { get(_, prop, receiver) {
	if (!_supabase) _supabase = createSupabaseClient();
	return Reflect.get(_supabase, prop, receiver);
} });
//#endregion
export { supabase as n, client_Cisra8gy_exports as t };
