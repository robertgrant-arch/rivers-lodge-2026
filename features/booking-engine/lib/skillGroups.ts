/**
 * Skill Group System — Calendar & Portal Access Control
 *
 * A skill group is a unique identifier representing a combination of:
 * - Member tier (Designated, Silver, Social)
 * - Optional staff role (Admin, Employee)
 *
 * A user can belong to multiple skill groups simultaneously:
 * - A Designated member belongs to the "Designated" skill group
 * - A staff admin also belongs to the "Admin" skill group
 * - A Designated member who is also an admin belongs to both "Designated" and "Admin"
 */

export type SkillGroup = "Designated" | "Silver" | "Social" | "Admin" | "Employee";

export const TIER_SKILL_GROUPS = ["Designated", "Silver", "Social"] as const;
export const STAFF_SKILL_GROUPS = ["Admin", "Employee"] as const;
export const ALL_SKILL_GROUPS: SkillGroup[] = [...TIER_SKILL_GROUPS, ...STAFF_SKILL_GROUPS];

/**
 * Compute a user's skill groups based on their membership tier and staff role.
 * Returns an array of skill groups the user belongs to.
 *
 * @param memberTier - The member's tier (Designated, Silver, Social, or null)
 * @param staffRole - The user's staff role (Admin, Employee, or null/undefined)
 * @returns Array of skill groups
 */
export function getUserSkillGroups(
  memberTier: string | null | undefined,
  staffRole: string | null | undefined
): SkillGroup[] {
  const groups: SkillGroup[] = [];

  // Add tier-based skill group
  if (memberTier === "Designated") groups.push("Designated");
  else if (memberTier === "Silver") groups.push("Silver");
  else if (memberTier === "Social") groups.push("Social");

  // Add staff role-based skill group
  if (staffRole === "admin") groups.push("Admin");
  else if (staffRole === "employee") groups.push("Employee");

  return groups;
}

/**
 * Check if a user has access to a feature based on their skill groups.
 * User has access if ANY of their skill groups are in the allowed list.
 *
 * @param userSkillGroups - Array of skill groups the user belongs to
 * @param allowedSkillGroups - Array of skill groups that have access
 * @returns true if user has access, false otherwise
 */
export function hasSkillGroupAccess(
  userSkillGroups: SkillGroup[],
  allowedSkillGroups: SkillGroup[]
): boolean {
  return userSkillGroups.some((group) => allowedSkillGroups.includes(group));
}

/**
 * Convert legacy tier/role access settings to skill group format.
 * This is a one-time migration helper.
 *
 * @param tierRoleSettings - Legacy settings like { Designated: true, Silver: false, Admin: true }
 * @returns Array of skill groups that have access
 */
export function legacyToSkillGroupAccess(
  tierRoleSettings: Record<string, boolean>
): SkillGroup[] {
  return Object.entries(tierRoleSettings)
    .filter(([_key, hasAccess]) => hasAccess)
    .map(([key]) => key as SkillGroup);
}

/**
 * Convert skill group access back to tier/role format for storage.
 * Returns an object mapping each skill group to true if in allowed list, false otherwise.
 *
 * @param skillGroups - Array of skill groups that have access
 * @returns Record mapping each skill group to boolean
 */
export function skillGroupToLegacyFormat(skillGroups: SkillGroup[]): Record<SkillGroup, boolean> {
  const result: Record<SkillGroup, boolean> = {
    Designated: false,
    Silver: false,
    Social: false,
    Admin: false,
    Employee: false,
  };

  skillGroups.forEach((group) => {
    result[group] = true;
  });

  return result;
}
