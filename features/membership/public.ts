export { membershipRouter } from './server/router';
// DB table refs — for admin feature consumption only
export { members, membershipApplications, memberSkillGroups, skillGroups, skillGroupCalendarAccess, propertySkillGroupAccess, employees, employeeSkillGroups } from './schema';
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
