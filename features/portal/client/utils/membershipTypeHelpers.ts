/**
 * Membership Type Display Helpers
 *
 * Portal-specific utilities for displaying membership types,
 * including preview mode logic and skill group name resolution.
 */

// Skill group ID→name mapping (production IDs)
const SKILL_GROUP_MAP: Record<number, string> = {
  11: "Designated",
  12: "Silver",
  13: "Social",
  14: "Employee",
};

/**
 * Get the membership type value to display.
 * In preview mode, shows the previewed skill group's tier.
 * Otherwise, shows the actual member's tier or staff role.
 */
export function getMembershipTypeValue(params: {
  isPreviewMode: boolean;
  previewSkillGroupId?: number;
  isStaff: boolean;
  userRole?: string;
  membershipType?: string;
}): string {
  const { isPreviewMode, previewSkillGroupId, isStaff, userRole, membershipType } = params;

  // In preview mode, show the previewed skill group's membership type
  if (isPreviewMode && previewSkillGroupId) {
    const previewName = SKILL_GROUP_MAP[previewSkillGroupId];
    if (previewName) return previewName;
  }

  // For staff, show their role
  if (isStaff) {
    if (userRole === "admin") return "Admin";
    if (userRole === "employee") return "Employee";
    if (userRole) return userRole.replace(/_/g, " ").toUpperCase();
  }

  // For members, show their membership type
  return membershipType || "—";
}

/**
 * Get the membership type sub-label.
 * Indicates whether viewing as preview, staff, or member.
 */
export function getMembershipTypeSub(params: {
  isPreviewMode: boolean;
  previewSkillGroupId?: number;
  isStaff: boolean;
}): string {
  const { isPreviewMode, previewSkillGroupId, isStaff } = params;

  if (isPreviewMode && previewSkillGroupId && SKILL_GROUP_MAP[previewSkillGroupId]) {
    return "Preview";
  }
  if (isStaff) {
    return "Staff";
  }
  return "Member Type";
}
