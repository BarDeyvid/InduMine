// RBAC Helper Functions for Frontend

/**
 * Role information for display
 */
export const RolePermissions = {
  admin: {
    name: 'Administrator',
    description: 'Full system access',
    permissions: {
      view: ['motors', 'drives', 'softstarters', 'panels', 'generators', 'transformers'],
      edit: ['motors', 'drives', 'softstarters', 'panels', 'generators', 'transformers'],
      delete: ['motors', 'drives', 'softstarters', 'panels', 'generators', 'transformers'],
      manage_users: true,
      export_data: true
    }
  },
  engineer: {
    name: 'Engineer',
    description: 'Full technical access',
    permissions: {
      view: ['motors', 'drives', 'softstarters'],
      edit: ['motors', 'drives', 'softstarters'],
      delete: [],
      manage_users: false,
      export_data: true
    }
  },
  sales: {
    name: 'Sales',
    description: 'Commercial access',
    permissions: {
      view: ['motors', 'drives', 'panels'],
      edit: [],
      delete: [],
      manage_users: false,
      export_data: false
    }
  },
  guest: {
    name: 'Visitor',
    description: 'Limited access',
    permissions: {
      view: ['motors'],
      edit: [],
      delete: [],
      manage_users: false,
      export_data: false
    }
  }
};

/**
 * Demo users for quick login
 */
export const demoUsers = {
  admin: {
    email: 'admin@weg.com',
    password: '1234',
    role: 'admin'
  },
  engineer: {
    email: 'engineer@weg.com',
    password: 'engineer123',
    role: 'engineer'
  },
  sales: {
    email: 'sales@weg.com',
    password: 'sales123',
    role: 'sales'
  },
  guest: {
    email: 'guest@weg.com',
    password: 'guest123',
    role: 'guest'
  }
};

/**
 * Check if user has permission to view a category
 */
export const canViewCategory = (userRole, category) => {
  const role = RolePermissions[userRole];
  if (!role) return false;
  
  return role.permissions.view.includes(category.toLowerCase());
};

/**
 * Get accessible categories for a role
 */
export const getAccessibleCategories = (userRole) => {
  const role = RolePermissions[userRole];
  if (!role) return [];
  
  return role.permissions.view;
};

/**
 * Get role information
 */
export const getRoleInfo = (role) => {
  return RolePermissions[role] || RolePermissions.guest;
};

/**
 * Check if user can manage users
 */
export const canManageUsers = (userRole) => {
  const role = RolePermissions[userRole];
  return role ? role.permissions.manage_users : false;
};

/**
 * Check if user can export data
 */
export const canExportData = (userRole) => {
  const role = RolePermissions[userRole];
  return role ? role.permissions.export_data : false;
};

/**
 * Validate user permissions
 */
export const validatePermission = (user, action, resource = null) => {
  if (!user || !user.role) {
    return { valid: false, message: 'User not authenticated' };
  }
  
  const role = RolePermissions[user.role];
  if (!role) {
    return { valid: false, message: 'Invalid user role' };
  }
  
  switch (action) {
    case 'view':
      if (resource && !role.permissions.view.includes(resource.toLowerCase())) {
        return { 
          valid: false, 
          message: `You don't have permission to view ${resource}` 
        };
      }
      break;
      
    case 'edit':
      if (resource && !role.permissions.edit.includes(resource.toLowerCase())) {
        return { 
          valid: false, 
          message: `You don't have permission to edit ${resource}` 
        };
      }
      break;
      
    case 'manage_users':
      if (!role.permissions.manage_users) {
        return { valid: false, message: 'You don\'t have permission to manage users' };
      }
      break;
      
    case 'export_data':
      if (!role.permissions.export_data) {
        return { valid: false, message: 'You don\'t have permission to export data' };
      }
      break;
      
    default:
      return { valid: false, message: 'Action not recognized' };
  }
  
  return { valid: true, message: 'Permission granted' };
};