export { membershipRouter } from './server/router';
// Member-number assignment + uniqueness (server-only helpers)
export { insertMemberWithUniqueNumber, assertMemberNumberAvailable, normalizeMemberNumber, isMemberNumberConflict, memberNumberConflictError } from './server/memberNumbers';
// DB table refs — for admin feature consumption only
export { members, membershipApplications, memberSkillGroups, skillGroups, skillGroupCalendarAccess, propertySkillGroupAccess, employees, employeeSkillGroups } from './schema';
// Member File tables — STAFF-ONLY. Import only from the admin Member File router
// (features/admin/server/memberFile.ts). Never select these in member-facing code.
export { memberProfiles, memberChildren, memberStaffNotes, socialParentOrganizations } from './schema';
export type { MemberProfile, MemberChild, MemberStaffNote, ActivityInterest } from './schema';
// Skill group access types
export type {
  SkillGroup,
  InsertSkillGroup,
  MemberSkillGroup,
  InsertMemberSkillGroup,
  SkillGroupCalendarAccess,
  InsertSkillGroupCalendarAccess,
  PropertySkillGroupAccess,
  InsertPropertySkillGroupAccess,
  Member,
  InsertMember,
  Employee,
  InsertEmployee,
  EmployeeSkillGroup,
  InsertEmployeeSkillGroup,
} from '@core/db/schema';
