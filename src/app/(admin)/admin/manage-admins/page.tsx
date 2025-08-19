"use client";

import type React from "react";

import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { ROLES } from "@/modules/admin/security/roles";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Output = inferProcedureOutput<AppRouter["adminManagement"]["listAdmins"]>;
type AdminUser = Output["admins"][number];

interface AdminFormData {
  name: string;
  email: string;
  password: string;
  roles: string[];
}

function ManageAdminsPage() {
  const trpc = useTRPC();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AdminFormData>({
    name: "",
    email: "",
    password: "",
    roles: [],
  });
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    refetch: fetchAdmins,
  } = useQuery(trpc.adminManagement.listAdmins.queryOptions());

  const createAdmin = useMutation(
    trpc.adminManagement.createAdmin.mutationOptions({
      onSuccess: () => {
        setSuccess("Admin created successfully");
        setSubmitting(false);
        setTimeout(() => {
          resetForm();
          setIsAddDialogOpen(false);
          fetchAdmins();
        }, 5000);
      },
      onError: (error) => {
        console.error("Error creating admin:", error);
        setError(error.message || "Failed to create admin");
        setSubmitting(false);
      },
    })
  );

  const updateAdmin = useMutation(
    trpc.adminManagement.updateAdmin.mutationOptions({
      onSuccess: (data) => {
        setSuccess("Admin updated successfully");
        setSubmitting(false);
        toast.success(data.message);
        setTimeout(() => {
          resetForm();
          setIsEditDialogOpen(false);
          setEditingAdmin(null);
          fetchAdmins();
        }, 1500);
      },
      onError: (error) => {
        console.error("Error updating admin:", error);
        setError(error.message || "Failed to update admin");
        toast.error(error.message);
        setSubmitting(false);
      },
    })
  );

  const admins = data?.admins || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "", roles: [] });
    setError(null);
    setSuccess(null);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      formData.roles.length === 0
    ) {
      setError("All fields are required");
      return;
    }
    setSubmitting(true);
    createAdmin.mutate({ ...formData });
  };

  const handleEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "",
      roles: admin.roles,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setError(null);
    setSuccess(null);

    if (!formData.name || !formData.email || formData.roles.length === 0) {
      setError("Name, email, and at least one role are required");
      return;
    }
    setSubmitting(true);
    updateAdmin.mutate({
      id: editingAdmin._id,
      ...formData,
      password: formData.password.length > 1 ? formData.password : undefined,
    });
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    updateAdmin.mutate({ id: admin._id, isActive: !admin.isActive });
  };

  return (
    <div className="text-foreground bg-background">
      <h1 className="text-2xl font-bold mb-6">Manage Admins</h1>

      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          Add New Admin
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin._id}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-block bg-muted text-muted-foreground text-xs px-2 py-1 rounded mr-1 mb-1"
                      >
                        {role.replace(/_/g, " ")}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        admin.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {admin.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {admin.lastLogin
                      ? new Date(admin.lastLogin).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      onClick={() => handleEditAdmin(admin)}
                      className="text-primary mr-2"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleStatus(admin)}
                      className={
                        admin.isActive ? "text-destructive" : "text-green-600"
                      }
                    >
                      {admin.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAdmin}>
            <div className="grid gap-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Roles</Label>
                <div className="col-span-3 space-y-2">
                  {Object.entries(ROLES).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${value}`}
                        checked={formData.roles.includes(value)}
                        onCheckedChange={() => handleRoleToggle(value)}
                      />
                      <Label htmlFor={`role-${value}`} className="capitalize">
                        {value.replace(/_/g, " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(false);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-soraxi-green hover:bg-soraxi-green/90 dark:bg-soraxi-green-dark dark:hover:bg-soraxi-green-dark/90 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Admin"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAdmin}>
            <div className="grid gap-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">
                  Password
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="edit-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Roles</Label>
                <div className="col-span-3 space-y-2">
                  {Object.entries(ROLES).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-role-${value}`}
                        checked={formData.roles.includes(value)}
                        onCheckedChange={() => handleRoleToggle(value)}
                      />
                      <Label
                        htmlFor={`edit-role-${value}`}
                        className="capitalize"
                      >
                        {value.replace(/_/g, " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsEditDialogOpen(false);
                  setEditingAdmin(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-soraxi-green hover:bg-soraxi-green/90 dark:bg-soraxi-green-dark dark:hover:bg-soraxi-green-dark/90 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Admin"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAdminAuth(ManageAdminsPage, {
  requiredPermissions: [PERMISSIONS.MANAGE_ADMINS],
});
