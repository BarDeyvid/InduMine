import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Users,
  Shield,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  listUsers,
  getUserStats,
  updateUserRole,
  updateUserCategories,
  updateUserStatus,
  deleteUser,
  getCategories,
} from "@/lib/api";
import { useNavigate } from "react-router-dom";
import type { CategorySummary } from "@/types";
import { t } from "@/i8n";

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  allowed_categories: string[];
  created_at: string;
  last_login: string | null;
}

interface Stats {
  total_users: number;
  active_users: number;
  admin_users: number;
  inactive_users: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editData, setEditData] = useState({
    role: "user",
    allowed_categories: [] as string[],
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [roleFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, statsData, categoriesData] = await Promise.all([
        listUsers(0, 50, roleFilter !== "all" ? roleFilter : undefined),
        getUserStats(),
        getCategories(),
      ]);
      setUsers(usersData);
      setStats(statsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar dados");
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditData({
      role: user.role,
      allowed_categories: user.allowed_categories,
      is_active: user.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError(null);

      if (editData.role !== selectedUser.role) {
        await updateUserRole(selectedUser.id, editData.role);
      }

      if (JSON.stringify(editData.allowed_categories) !== JSON.stringify(selectedUser.allowed_categories)) {
        await updateUserCategories(selectedUser.id, editData.allowed_categories);
      }

      if (editData.is_active !== selectedUser.is_active) {
        await updateUserStatus(selectedUser.id, editData.is_active);
      }

      setIsEditDialogOpen(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar usuário");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsSaving(true);
      setError(null);
      await deleteUser(userToDelete.id);
      setIsDeleteDialogOpen(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar usuário");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "moderator":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "primary",
  }: {
    title: string;
    value: number | string;
    icon: any;
    color?: string;
  }) => {
    const colorClasses = {
      primary: "bg-primary/10 text-primary",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      destructive: "bg-destructive/10 text-destructive",
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <NetworkStatusIndicator />
        <main className="container py-8">
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <NetworkStatusIndicator />

      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("admin.page_title")}</h1>
          <p className="text-muted-foreground">{t("admin.page_description")}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">{t("error.loading_title")}</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title={t("admin.total_users")} value={stats.total_users} icon={Users} />
            <StatCard
              title={t("admin.active_users")}
              value={stats.active_users}
              icon={UserCheck}
              color="success"
            />
            <StatCard
              title={t("admin.admin_users")}
              value={stats.admin_users}
              icon={Shield}
              color="warning"
            />
            <StatCard
              title={t("admin.inactive_users")}
              value={stats.inactive_users}
              icon={UserX}
              color="destructive"
            />
          </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {t("admin.filter_by_role")}
            </label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("admin.select_role_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.all_roles")}</SelectItem>
                <SelectItem value="admin">{t("admin.admin_role")}</SelectItem>
                <SelectItem value="moderator">{t("admin.moderator_role")}</SelectItem>
                <SelectItem value="user">{t("admin.user_role")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("admin.updating")}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t("admin.update_button")}
              </>
            )}
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.users_management")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.user_table_header")}</TableHead>
                    <TableHead>{t("admin.email_table_header")}</TableHead>
                    <TableHead>{t("admin.role_table_header")}</TableHead>
                    <TableHead>{t("admin.status_table_header")}</TableHead>
                    <TableHead className="w-12">{t("admin.actions_table_header")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("admin.no_users_found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.full_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role === "admin"
                              ? "Administrador"
                              : user.role === "moderator"
                                ? "Moderador"
                                : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t("admin.actions_label")}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                {t("admin.edit_button")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t("admin.delete_button")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("admin.edit_user_dialog_title")}</DialogTitle>
            <DialogDescription>
              {t("admin.edit_user_dialog_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info Read-Only */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("admin.username_label")}</p>
                <p className="font-medium">{selectedUser?.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t("admin.email_label")}</p>
                <p className="font-medium">{selectedUser?.email}</p>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.role_label")}</label>
              <Select value={editData.role} onValueChange={(role) => setEditData({ ...editData, role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("admin.user_role")}</SelectItem>
                  <SelectItem value="moderator">{t("admin.moderator_role")}</SelectItem>
                  <SelectItem value="admin">{t("admin.admin_role")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categories Multi-Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("header.categories")}</label>
              <div className="border border-border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.no_categories_available")}</p>
                ) : (
                  categories.map((category) => (
                    <label key={category.slug} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.allowed_categories.includes(category.slug)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditData({
                              ...editData,
                              allowed_categories: [...editData.allowed_categories, category.slug],
                            });
                          } else {
                            setEditData({
                              ...editData,
                              allowed_categories: editData.allowed_categories.filter(
                                (c) => c !== category.slug
                              ),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={editData.is_active}
                onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="flex-1 cursor-pointer">
                <p className="text-sm font-medium">{t("admin.user_active_label")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.user_inactive_description")}
                </p>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("admin.cancel_button")}
            </Button>
            <Button onClick={handleSaveUser} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("admin.saving_label")}
                </>
              ) : (
                t("admin.save_changes_button")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.delete_user_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.delete_user_confirmation")}{" "}
              <span className="font-semibold">{userToDelete?.username}</span>? {t("admin.delete_user_warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.cancel_button")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
