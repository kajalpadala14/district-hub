//#region node_modules/.nitro/vite/services/ssr/assets/profileClassification-qLmYHp_o.js
var AUTH_USERNAME_DOMAIN = "district.gov.in";
function isDashboardUserProfile(profile, role) {
	const email = profile.email.toLowerCase();
	const title = (profile.job_title ?? "").toLowerCase();
	return email.endsWith(`@district.gov.in`) || email === "local.user@gov.local" || role === "admin" || role === "manager" || title.includes("administrator") || title === "task manager";
}
function usernameFromProfile(profile) {
	const email = profile.email.toLowerCase();
	if (email.endsWith(`@district.gov.in`)) return email.slice(0, -`@${AUTH_USERNAME_DOMAIN}`.length);
	return profile.email.split("@")[0] || "--";
}
//#endregion
export { isDashboardUserProfile as n, usernameFromProfile as r, AUTH_USERNAME_DOMAIN as t };
