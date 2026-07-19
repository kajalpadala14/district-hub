import type { Profile, Task } from "@/hooks/useData";
import type { Database } from "@/integrations/supabase/types";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type Department = Database["public"]["Tables"]["departments"]["Row"];

const TASKS_KEY = "governance.local.tasks";
const PROFILES_KEY = "governance.local.profiles";
const DEPARTMENTS_KEY = "governance.local.departments";
const CHANGE_EVENT = "governance-local-tasks-change";
const PROFILES_CHANGE_EVENT = "governance-local-profiles-change";
const DEPARTMENTS_CHANGE_EVENT = "governance-local-departments-change";

export const LOCAL_USER_ID = "11111111-1111-4111-8111-111111111111";

export const localProfiles: Profile[] = [
  {
    id: LOCAL_USER_ID,
    email: "local.user@gov.local",
    full_name: "Local User",
    phone: null,
    address: null,
    department: "District Administration",
    job_title: "Task Manager",
    avatar_url: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  },
];

export const fallbackDepartmentNames = [
  "Agri and Allied",
  "Agriculture",
  "District Administration",
  "Education",
  "Health",
  "SBM",
  "Zila Panchayat",
];

export function isLocalTaskMode(userId: string | null | undefined) {
  return !userId || userId === LOCAL_USER_ID;
}

export function listLocalTasks() {
  return readTasks().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function listLocalProfiles() {
  const saved = readProfiles().filter((profile) => !isBuiltInLocalProfile(profile));
  const byId = new Map<string, Profile>();
  for (const profile of saved) byId.set(profile.id, profile);
  return Array.from(byId.values()).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
}

export function listLocalDepartments() {
  const now = new Date(0).toISOString();
  const fallback = fallbackDepartmentNames.map((name) => ({
    id: localDepartmentId(name),
    name,
    created_at: now,
    updated_at: now,
  }));
  const byName = new Map<string, Department>();
  for (const department of [...fallback, ...readDepartments()]) {
    byName.set(normalizeDepartmentName(department.name), department);
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function createLocalDepartment(name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const existing = listLocalDepartments().find((department) => normalizeDepartmentName(department.name) === normalizeDepartmentName(clean));
  if (existing) return existing;

  const now = new Date().toISOString();
  const department: Department = {
    id: crypto.randomUUID(),
    name: clean,
    created_at: now,
    updated_at: now,
  };
  saveDepartments([department, ...readDepartments()]);
  return department;
}

export function updateLocalDepartment(id: string, name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const now = new Date().toISOString();
  const departments = readDepartments();
  const existing = listLocalDepartments().find((department) => department.id === id);
  if (!existing) return null;

  const updated: Department = { ...existing, name: clean, updated_at: now };
  const next = [updated, ...departments.filter((department) => department.id !== id)];
  saveDepartments(next);
  return updated;
}

export function deleteLocalDepartment(id: string) {
  saveDepartments(readDepartments().filter((department) => department.id !== id));
}

export function createLocalProfile(input: Pick<Profile, "full_name" | "email" | "phone" | "job_title" | "department">) {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: crypto.randomUUID(),
    email: input.email || `${crypto.randomUUID()}@local.employee`,
    full_name: input.full_name || null,
    phone: input.phone || null,
    address: null,
    department: input.department || null,
    job_title: input.job_title || null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
  saveProfiles([profile, ...readProfiles()]);
  return profile;
}

export function updateLocalProfile(id: string, input: Partial<Pick<Profile, "full_name" | "email" | "phone" | "job_title" | "department">>) {
  const now = new Date().toISOString();
  const profiles = readProfiles();
  const existingBase = localProfiles.find((profile) => profile.id === id);
  const source = profiles.find((profile) => profile.id === id) ?? existingBase;
  if (!source) return null;

  const updated: Profile = {
    ...source,
    ...input,
    full_name: input.full_name === "" ? null : input.full_name ?? source.full_name,
    phone: input.phone === "" ? null : input.phone ?? source.phone,
    job_title: input.job_title === "" ? null : input.job_title ?? source.job_title,
    department: input.department === "" ? null : input.department ?? source.department,
    updated_at: now,
  };
  const next = [updated, ...profiles.filter((profile) => profile.id !== id)];
  saveProfiles(next);
  return updated;
}

export function deleteLocalProfile(id: string) {
  if (id === LOCAL_USER_ID) return false;
  saveProfiles(readProfiles().filter((profile) => profile.id !== id));
  return true;
}

export function createLocalTask(input: TaskInsert) {
  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    due_date: input.due_date ?? null,
    due_time: input.due_time ?? null,
    scheduled_date: input.scheduled_date ?? null,
    department: input.department ?? null,
    assignee_id: input.assignee_id ?? null,
    created_by: input.created_by,
    completed_at: input.completed_at ?? null,
    created_at: now,
    updated_at: now,
    calendar_sync_enabled: input.calendar_sync_enabled ?? false,
    google_calendar_event_id: input.google_calendar_event_id ?? null,
    calendar_event_html_link: input.calendar_event_html_link ?? null,
    calendar_sync_status: input.calendar_sync_status ?? "not_synced",
    calendar_last_synced_at: input.calendar_last_synced_at ?? null,
    calendar_sync_error: input.calendar_sync_error ?? null,
    calendar_retry_count: input.calendar_retry_count ?? 0,
  };

  saveTasks([task, ...readTasks()]);
  return task;
}

export function updateLocalTask(id: string, input: TaskUpdate) {
  const tasks = readTasks();
  const updated = tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          ...input,
          updated_at: new Date().toISOString(),
        }
      : task,
  ) as Task[];
  saveTasks(updated);
  return updated.find((task) => task.id === id) ?? null;
}

export function deleteLocalTask(id: string) {
  saveTasks(readTasks().filter((task) => task.id !== id));
}

export function subscribeLocalTasks(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export function subscribeLocalProfiles(callback: () => void) {
  window.addEventListener(PROFILES_CHANGE_EVENT, callback);
  return () => window.removeEventListener(PROFILES_CHANGE_EVENT, callback);
}

export function subscribeLocalDepartments(callback: () => void) {
  window.addEventListener(DEPARTMENTS_CHANGE_EVENT, callback);
  return () => window.removeEventListener(DEPARTMENTS_CHANGE_EVENT, callback);
}

export async function logLocalTaskAudit() {
  return;
}

function readTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(TASKS_KEY);
    return value ? (JSON.parse(value) as Task[]) : [];
  } catch {
    return [];
  }
}

function readProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(PROFILES_KEY);
    return value ? (JSON.parse(value) as Profile[]) : [];
  } catch {
    return [];
  }
}

function readDepartments(): Department[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(DEPARTMENTS_KEY);
    return value ? (JSON.parse(value) as Department[]) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function saveProfiles(profiles: Profile[]) {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  window.dispatchEvent(new Event(PROFILES_CHANGE_EVENT));
}

function saveDepartments(departments: Department[]) {
  window.localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
  window.dispatchEvent(new Event(DEPARTMENTS_CHANGE_EVENT));
}

function localDepartmentId(name: string) {
  return `local-department-${normalizeDepartmentName(name).replace(/[^a-z0-9]+/g, "-")}`;
}

function normalizeDepartmentName(name: string) {
  return name.trim().toLowerCase();
}

function isBuiltInLocalProfile(profile: Profile) {
  return profile.id === LOCAL_USER_ID || profile.email.toLowerCase() === "local.user@gov.local";
}
