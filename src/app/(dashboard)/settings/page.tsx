"use client";

import { useEffect, useState } from "react";
import {
  getUsers,
  updateUserRole,
  inviteUser,
  deleteUser,
  type UserProfile,
} from "@/services/users";
import {
  ROLE_LABELS,
  type UserRole,
} from "@/lib/permissions";
import { useUserProfile } from "@/hooks/use-user-profile";

const ROLES: UserRole[] = [
  "admin",
  "manager",
  "operator",
  "production_staff",
  "accountant",
];

const INVITE_ROLES: Exclude<UserRole, "admin">[] = [
  "manager",
  "operator",
  "production_staff",
  "accountant",
];

export default function SettingsPage() {
  const {
    profile: currentUser,
    loading: profileLoading,
  } = useUserProfile();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [savingUser, setSavingUser] =
    useState<string | null>(null);

  const [deletingUser, setDeletingUser] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [inviteSuccess, setInviteSuccess] =
    useState("");

  const [deleteSuccess, setDeleteSuccess] =
    useState("");

  const [showInviteForm, setShowInviteForm] =
    useState(false);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteName, setInviteName] =
    useState("");

  const [inviteRole, setInviteRole] =
    useState<Exclude<UserRole, "admin">>(
      "operator"
    );

  const [inviting, setInviting] =
    useState(false);

  const [userToDelete, setUserToDelete] =
    useState<UserProfile | null>(null);

  const isAdmin =
    currentUser?.role === "admin";

  async function loadUsers() {
    setLoadingUsers(true);
    setError("");

    const { data, error } = await getUsers();

    if (error) {
      setError(error.message);
      setUsers([]);
    } else {
      setUsers(
        (data || []) as UserProfile[]
      );
    }

    setLoadingUsers(false);
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  async function handleRoleChange(
    userId: string,
    role: UserRole
  ) {
    setSavingUser(userId);
    setError("");
    setInviteSuccess("");
    setDeleteSuccess("");

    const { error } =
      await updateUserRole(
        userId,
        role
      );

    if (error) {
      setError(error.message);
      setSavingUser(null);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              role,
            }
          : user
      )
    );

    setSavingUser(null);
  }

  async function handleInviteUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setInviteSuccess("");
    setDeleteSuccess("");
    setInviting(true);

    const { error } = await inviteUser(
      inviteEmail,
      inviteName,
      inviteRole
    );

    if (error) {
      setError(error.message);
      setInviting(false);
      return;
    }

    setInviteEmail("");
    setInviteName("");
    setInviteRole("operator");

    setInviteSuccess(
      "Invitation sent successfully. The new user will receive an email to set their password."
    );

    setInviting(false);
    setShowInviteForm(false);

    await loadUsers();
  }

  async function handleDeleteUser() {
    if (!userToDelete) {
      return;
    }

    const userId = userToDelete.id;

    setDeletingUser(userId);
    setError("");
    setInviteSuccess("");
    setDeleteSuccess("");

    const { error } =
      await deleteUser(userId);

    if (error) {
      setError(error.message);
      setDeletingUser(null);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.filter(
        (user) => user.id !== userId
      )
    );

    setDeleteSuccess(
      `${userToDelete.full_name || userToDelete.email || "User"} was deleted successfully.`
    );

    setUserToDelete(null);
    setDeletingUser(null);
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">
        System Settings
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Information */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Company Information
          </h2>

          <div className="space-y-2">
            <p>
              <strong>Company:</strong>{" "}
              Rexy Blocks Factory
            </p>

            <p>
              <strong>Location:</strong>{" "}
              Kumasi, Ghana
            </p>
          </div>
        </div>

        {/* My Account */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            My Account
          </h2>

          {profileLoading ? (
            <p className="text-gray-500">
              Loading account...
            </p>
          ) : currentUser ? (
            <div className="space-y-2">
              <p>
                <strong>Name:</strong>{" "}
                {currentUser.full_name ||
                  "Not set"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {currentUser.email ||
                  "Not available"}
              </p>

              <p>
                <strong>Role:</strong>{" "}
                {ROLE_LABELS[
                  currentUser.role
                ]}
              </p>
            </div>
          ) : (
            <p className="text-red-600">
              Unable to load your account.
            </p>
          )}
        </div>

        {/* Product Pricing */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Product Pricing
          </h2>

          <ul className="space-y-2">
            <li>
              5-inch hollow block — GH₵9
            </li>

            <li>
              6-inch hollow block — GH₵10
            </li>

            <li>
              5-inch solid block — GH₵10
            </li>

            <li>
              6-inch solid block — GH₵11
            </li>
          </ul>
        </div>

        {/* Inventory Alerts */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Inventory Alerts
          </h2>

          <p className="text-gray-600">
            Configure minimum stock levels.
          </p>
        </div>
      </div>

      {/* User Management */}
      {isAdmin && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                User Management
              </h2>

              <p className="mt-1 text-gray-600">
                Manage users, roles, and permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowInviteForm(
                  !showInviteForm
                );

                setError("");
                setInviteSuccess("");
                setDeleteSuccess("");
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              {showInviteForm
                ? "Cancel"
                : "+ Add User"}
            </button>
          </div>

          {/* Success Messages */}
          {inviteSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">
              {inviteSuccess}
            </div>
          )}

          {deleteSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">
              {deleteSuccess}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Invite Form */}
          {showInviteForm && (
            <form
              onSubmit={handleInviteUser}
              className="mb-6 rounded-xl border bg-gray-50 p-6"
            >
              <h3 className="mb-4 text-lg font-semibold">
                Invite New User
              </h3>

              <p className="mb-5 text-sm text-gray-600">
                The employee will receive an
                invitation email and create their
                own password.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="invite-name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Full Name
                  </label>

                  <input
                    id="invite-name"
                    type="text"
                    value={inviteName}
                    onChange={(event) =>
                      setInviteName(
                        event.target.value
                      )
                    }
                    placeholder="Employee name"
                    required
                    disabled={inviting}
                    className="w-full rounded-lg border bg-white p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-email"
                    className="mb-1 block text-sm font-medium"
                  >
                    Email
                  </label>

                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) =>
                      setInviteEmail(
                        event.target.value
                      )
                    }
                    placeholder="employee@example.com"
                    required
                    disabled={inviting}
                    className="w-full rounded-lg border bg-white p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-role"
                    className="mb-1 block text-sm font-medium"
                  >
                    Role
                  </label>

                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(
                        event.target
                          .value as Exclude<
                          UserRole,
                          "admin"
                        >
                      )
                    }
                    disabled={inviting}
                    className="w-full rounded-lg border bg-white p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {INVITE_ROLES.map(
                      (role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {ROLE_LABELS[role]}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {inviting
                    ? "Sending Invitation..."
                    : "Send Invitation"}
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          {loadingUsers ? (
            <p className="text-gray-500">
              Loading users...
            </p>
          ) : users.length === 0 ? (
            <p className="text-gray-500">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">
                      Name
                    </th>

                    <th className="p-3 text-left">
                      Email
                    </th>

                    <th className="p-3 text-left">
                      Role
                    </th>

                    <th className="p-3 text-left">
                      Status
                    </th>

                    <th className="p-3 text-left">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isCurrentUser =
                      user.id ===
                      currentUser?.id;

                    const isDeleting =
                      deletingUser ===
                      user.id;

                    return (
                      <tr
                        key={user.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="p-3 font-medium">
                          {user.full_name ||
                            "Unnamed user"}
                        </td>

                        <td className="p-3">
                          {user.email || "—"}
                        </td>

                        <td className="p-3">
                          <select
                            value={user.role}
                            disabled={
                              isCurrentUser ||
                              savingUser ===
                                user.id ||
                              isDeleting
                            }
                            onChange={(event) =>
                              handleRoleChange(
                                user.id,
                                event.target
                                  .value as UserRole
                              )
                            }
                            className="rounded-lg border bg-white p-2 disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            {ROLES.map(
                              (role) => (
                                <option
                                  key={role}
                                  value={role}
                                >
                                  {
                                    ROLE_LABELS[
                                      role
                                    ]
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td className="p-3">
                          <span className="text-sm text-gray-600">
                            Active
                          </span>
                        </td>

                        <td className="p-3">
                          {isCurrentUser ? (
                            <span className="text-sm font-medium text-gray-500">
                              Current account
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={
                                isDeleting ||
                                savingUser ===
                                  user.id
                              }
                              onClick={() => {
                                setError("");
                                setInviteSuccess(
                                  ""
                                );
                                setDeleteSuccess(
                                  ""
                                );
                                setUserToDelete(
                                  user
                                );
                              }}
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Delete Confirmation Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">
              Delete User?
            </h2>

            <p className="mt-3 text-gray-600">
              Are you sure you want to permanently
              delete{" "}
              <strong>
                {userToDelete.full_name ||
                  userToDelete.email ||
                  "this user"}
              </strong>
              ?
            </p>

            <p className="mt-2 text-sm text-red-600">
              This will remove the user's login
              account and profile.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setUserToDelete(null)
                }
                disabled={
                  deletingUser !== null
                }
                className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={
                  deletingUser !== null
                }
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingUser
                  ? "Deleting..."
                  : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}