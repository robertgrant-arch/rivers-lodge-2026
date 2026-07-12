export { membershipRouter } from './server/router';
// DB table refs — for admin feature consumption only
export { members, membershipApplications, roles, resourceAccess } from './schema';
// RBAC and skill group types
export type {
  Role,
  InsertRole,
  ResourceAccess,
  InsertResourceAccess,
  SkillGroup,
  InsertSkillGroup,
  RoleSkillGroupAccess,
  InsertRoleSkillGroupAccess,
  RolePropertySkillGroupAccess,
  InsertRolePropertySkillGroupAccess,
  PropertySkillGroup,
  InsertPropertySkillGroup,
} from '@core/db/schema';
