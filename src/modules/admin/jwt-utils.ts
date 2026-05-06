import { Permission } from "./security/permissions";
import { Role, ROLES } from "./security/roles";
import { getPermissionsForRoles } from "./security/access-control";

// I trust this function more than the one below.
// This was the original code so never delect it in case the one below doesn't work.
// export function getAdminPermissions(roles: Role[]): Permission[] {
//   return getPermissionsForRoles(roles);
// }

export function getAdminPermissions(roles: string[]): Permission[] {
  // Convert string roles back to Role type
  const typedRoles = roles.filter((role): role is Role => {
    // Check if the role is a valid Role
    // console.log("Role:", role);
    return Object.values(ROLES).includes(role as Role);
  });

  // console.log("Typed roles:", typedRoles);

  return getPermissionsForRoles(typedRoles);
}
