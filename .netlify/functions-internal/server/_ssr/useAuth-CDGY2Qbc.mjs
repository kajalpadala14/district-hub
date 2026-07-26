import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useAuth-CDGY2Qbc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useAuth() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [role, setRole] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		const loadRole = async (uid) => {
			const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
			if (!mounted) return;
			const roles = (data ?? []).map((r) => r.role);
			const highest = roles.includes("admin") ? "admin" : roles.includes("manager") ? "manager" : roles.includes("employee") ? "employee" : null;
			setRole(highest);
		};
		const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
			if (session?.user) loadRole(session.user.id);
			else setRole(null);
		});
		supabase.auth.getSession().then(({ data }) => {
			if (!mounted) return;
			setUser(data.session?.user ?? null);
			if (data.session?.user) loadRole(data.session.user.id);
			setLoading(false);
		});
		return () => {
			mounted = false;
			sub.subscription.unsubscribe();
		};
	}, []);
	return {
		user,
		role,
		loading
	};
}
//#endregion
export { useAuth as t };
