//#region node_modules/.nitro/vite/services/ssr/assets/taskClassification-DlB8HnWP.js
var PLANNER_MEETING_TYPE_LINE = "Type: Meeting";
function isPlannerMeetingTask(task) {
	return task.description?.split(/\r?\n/).some((line) => line.trim().toLowerCase() === "Type: Meeting".toLowerCase()) ?? false;
}
function isTaskItem(task) {
	return !isPlannerMeetingTask(task);
}
function dateKeyForTask(task) {
	return task.scheduled_date ?? task.due_date;
}
//#endregion
export { isTaskItem as i, dateKeyForTask as n, isPlannerMeetingTask as r, PLANNER_MEETING_TYPE_LINE as t };
