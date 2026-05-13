/* eslint-disable @typescript-eslint/no-explicit-any */

export type AppRole = "guest" | "agent" | "manager" | "leader" | "headquarters" | "master";

export const ROLE_LABELS: Record<AppRole, string> = {
  guest: "게스트",
  agent: "설계사",
  manager: "지점장",
  leader: "사업부장",
  headquarters: "본부장",
  master: "마스터",
};

export const ROLE_PRIORITY: Record<AppRole, number> = {
  guest: 0,
  agent: 1,
  manager: 2,
  leader: 3,
  headquarters: 4,
  master: 5,
};

const HEADQUARTER_ACCOUNT = "jw20371035";
const HEADQUARTER_ADMIN_EMAIL = "jw20371035@gmail.com";
const MASTER_EMAIL = "qodbtjq@naver.com";

export const HEADQUARTER_OPTIONS = [
  "1본부",
  "2본부",
  "3본부",
  "4본부",
  "5본부",
  "6본부",
  "7본부",
  "8본부",
  "9본부",
  "10본부",
  "CJ onstyle",
];

export function userIdentifier(user: any): string {
  return [
    user?.email,
    user?.user_id,
    user?.username,
    user?.login_id,
    user?.id,
    user?.name,
  ].filter(Boolean).join(" ").toLowerCase().trim();
}

export function normalizeRole(user: any): AppRole {
  const identifier = userIdentifier(user);
  const values = [user?.role_level, user?.rank, user?.role].map((value) => String(value || "").toLowerCase().trim());
  const has = (...roles: string[]) => values.some((value) => roles.includes(value));

  if (identifier.includes(MASTER_EMAIL) || has("master")) return "master";
  if (identifier.includes(HEADQUARTER_ACCOUNT)) return "headquarters";
  if (has("headquarters", "headquarter", "head", "hq", "본부장")) return "headquarters";
  if (has("director", "leader", "department_head", "division_head", "business_head", "사업부장")) return "leader";
  if (has("manager", "branch_manager", "office_manager", "지점장")) return "manager";
  if (has("agent", "staff", "planner", "fc", "설계사")) return "agent";
  return "guest";
}

export function roleLabel(userOrRole: any): string {
  const role = typeof userOrRole === "string" ? normalizeRole({ role: userOrRole }) : normalizeRole(userOrRole);
  return ROLE_LABELS[role];
}

export function getDepartment(user: any): string {
  return user?.department || user?.department_name || user?.dept_name || user?.division || user?.business_unit || "";
}

export function getBranch(user: any): string {
  return user?.team || user?.branch_name || user?.branch || user?.office || user?.office_name || "";
}

export function getHeadquarter(user: any): string {
  return user?.headquarter || user?.headquarter_name || user?.hq || user?.hq_name || "";
}

export function isHeadquarterAccount(user: any): boolean {
  return userIdentifier(user).includes(HEADQUARTER_ACCOUNT);
}

export function isOrganizationAdminAccount(user: any): boolean {
  const identifier = userIdentifier(user);
  return normalizeRole(user) === "master" || identifier.includes(HEADQUARTER_ADMIN_EMAIL);
}

export function canEditMainNotice(user: any): boolean {
  const role = normalizeRole(user);
  return role === "master" || role === "headquarters";
}

export function isApprovedUser(user: any): boolean {
  const role = normalizeRole(user);
  return role === "master" || role === "headquarters" || role === "leader" || role === "manager" || user?.is_approved === true || user?.is_approved === "true";
}

export function canAccessCrm(user: any): boolean {
  return normalizeRole(user) === "master" || user?.crm_access === true || user?.crm_access === "true";
}

export function canSeeUser(viewer: any, target: any): boolean {
  const viewerRole = normalizeRole(viewer);
  const targetRole = normalizeRole(target);
  const viewerPriority = ROLE_PRIORITY[viewerRole];
  const targetPriority = ROLE_PRIORITY[targetRole];

  if (!viewer?.id || !target?.id) return false;
  if (viewer.id === target.id) return false;
  if (targetPriority >= viewerPriority) return false;

  if (viewerRole === "master") return true;
  if (isHeadquarterAccount(viewer)) return targetRole !== "master";
  const sameHeadquarter = !getHeadquarter(viewer) || !getHeadquarter(target) || getHeadquarter(viewer) === getHeadquarter(target);
  const sameDepartment = Boolean(getDepartment(viewer) && getDepartment(viewer) === getDepartment(target));
  const sameBranch = Boolean(getBranch(viewer) && getBranch(viewer) === getBranch(target));

  if (viewerRole === "headquarters") return getHeadquarter(viewer) ? getHeadquarter(viewer) === getHeadquarter(target) : sameDepartment || sameBranch;
  if (viewerRole === "leader") return sameHeadquarter && sameDepartment;
  if (viewerRole === "manager") return sameHeadquarter && sameDepartment && sameBranch;
  return false;
}

export function canManageRole(viewer: any, target: any): boolean {
  return ROLE_PRIORITY[normalizeRole(viewer)] > ROLE_PRIORITY[normalizeRole(target)];
}

export function canEditDepartmentSettings(viewer: any, headquarter: string, department: string): boolean {
  const sameHeadquarter = !getHeadquarter(viewer) || !headquarter || getHeadquarter(viewer) === headquarter;
  return normalizeRole(viewer) === "leader" && sameHeadquarter && getDepartment(viewer) === department;
}
