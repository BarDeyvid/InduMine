# Admin Panel Documentation

## Overview
The Admin Panel is an exclusive section of the application that allows administrators to manage users, roles, and permissions. Only users with the `admin` role can access this feature.

## Access & Security

### How to Access
1. **Header Navigation**: If you're an admin, you'll see a "Admin" link with a Shield icon in the header navigation
2. **Direct URL**: Navigate to `http://localhost:5173/admin`
3. **Role-Based Access**: Only users with `role: "admin"` can access this page

### Protection Mechanism
- **AdminRoute Component**: A dedicated route protection component verifies the user's role before rendering the page
- **Backend Validation**: All API endpoints check for admin role on the backend using `check_admin_role` dependency
- **Automatic Redirect**: Non-admin users are automatically redirected to the home page

## Features

### 1. Dashboard Stats
The admin dashboard displays key metrics:
- **Total Users**: All registered users in the system
- **Admin Count**: Number of users with admin role
- **Active Users**: Users with `is_active: true`
- **Inactive Users**: Users with `is_active: false`

### 2. User Management Table
- **Search**: Filter users by username or email in real-time
- **Columns**:
  - Username
  - Email (hidden on mobile)
  - Role (badge with color coding)
  - Categories Count (hidden on tablet)
  - Status (hidden on mobile)
  - Actions (Edit/Delete buttons)

### 3. Edit User
Click the "Edit" button to open the user edit dialog where you can:

#### Change User Role
- Options: `user`, `moderator`, `admin`
- Restrictions: Cannot demote the last admin (backend protection)

#### Manage Categories
- Toggle checkboxes to allow/disallow specific categories
- Shows count of selected categories
- Categories are scrollable if there are many

#### Toggle User Status
- Options: `Active` (user can log in) or `Inactive` (user cannot log in)
- Status persists across sessions

### 4. Delete User
- Click the "Delete" button to trigger a confirmation dialog
- Restrictions: Cannot delete the last admin (backend protection)
- Action is permanent and logs indicate the deletion

## API Endpoints

### List Users
```
GET /users?skip=0&limit=10&role=admin
```
Returns paginated list of users with optional role filter

### Get User Stats
```
GET /users/counts/stats
```
Returns: 
```json
{
  "total_users": 10,
  "active_users": 8,
  "admin_users": 2,
  "inactive_users": 2
}
```

### Get User Details
```
GET /users/{user_id}
```

### Update User Role
```
PATCH /users/{user_id}/role
Body: { "role": "admin" | "user" | "moderator" }
```

### Update User Categories
```
PATCH /users/{user_id}/categories
Body: { "allowed_categories": ["category1", "category2"] }
```

### Toggle User Status
```
PATCH /users/{user_id}/status
Body: { "is_active": true | false }
```

### Delete User
```
DELETE /users/{user_id}
```

## Mobile Responsiveness

The admin panel is fully responsive:

### Desktop (1024px+)
- All columns visible
- Dropdown menus for actions

### Tablet (768px - 1023px)
- Email column hidden
- Category count hidden
- Compact action buttons

### Mobile (< 768px)
- Status and email columns hidden
- Icon-only action buttons with tooltips
- Single column layout for stats
- Horizontal scroll for table

## Backend Implementation

### User Model Fields
```python
class User(Base):
    id: int
    username: str
    email: str
    password_hash: str
    role: str  # "user", "admin", "moderator"
    is_active: bool
    allowed_categories: List[str]
    created_at: datetime
    updated_at: datetime
    updated_by: int  # Track who made changes
```

### Admin Dependency
```python
def check_admin_role(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="...")
    return current_user
```

## Frontend Components

### AdminRoute
Located in `src/components/PrivateRoute.tsx`
- Checks if user is authenticated
- Verifies user role is "admin"
- Shows loading spinner while checking
- Redirects non-admins to home page

### Admin Page
Located in `src/pages/Admin.tsx`
- Main admin interface
- Manages state for users, categories, editing
- Handles all CRUD operations

### API Functions
Located in `src/lib/api.ts`
- `listUsers(skip, limit, role?)`
- `getUserStats()`
- `getUser(userId)`
- `updateUserRole(userId, role)`
- `updateUserCategories(userId, categories)`
- `updateUserStatus(userId, isActive)`
- `deleteUser(userId)`

## Security Best Practices

1. **Role Checking**: Every endpoint checks admin role
2. **Last Admin Protection**: Cannot demote or delete the last admin
3. **Token Validation**: All requests require valid Bearer token
4. **Session Expiration**: If token expires, user is redirected to login
5. **Input Validation**: Backend validates all inputs before processing

## Common Tasks

### Promote User to Admin
1. Go to Admin Panel
2. Find the user in the table
3. Click "Edit"
4. Change "Role" to "Admin"
5. Click "Save Changes"

### Deactivate User
1. Find the user in the table
2. Click "Edit"
3. Change "Account Status" to "Inactive"
4. Click "Save Changes"
5. User will be unable to log in

### Adjust User Categories
1. Click "Edit" on the user
2. In "Allowed Categories" section, toggle checkboxes
3. Click "Save Changes"
4. User will only see selected categories

### Remove User
1. Click "Delete" button
2. Confirm in the dialog
3. User is permanently removed from system

## Troubleshooting

### "Acesso Negado" (Access Denied)
- Your role is not set to "admin"
- Contact system administrator to upgrade your account

### "Não é possível remover o último administrador"
- This is the only admin account
- Create another admin first, then you can modify this one

### Changes Not Saving
- Check network connection
- Verify you have admin role
- Check browser console for errors (F12 → Console tab)

### User Lists Showing Empty
- Check if any users exist in the system
- Verify your internet connection
- Try refreshing the page (F5)
