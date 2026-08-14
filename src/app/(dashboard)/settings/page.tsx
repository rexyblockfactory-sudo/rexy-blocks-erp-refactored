"use client";

import { useEffect, useState } from "react";
import {
  getUsers,
  updateUserRole,
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

export default function SettingsPage() {
  const {
    profile: currentUser,
    loading: profileLoading,
  } = useUserProfile();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isAdmin = currentUser?.role === "admin";

  async function loadUsers() {
    setLoadingUsers(true);
    setError("");

    const { data, error } = await getUsers();

    if (error) {
      setError(error.message);
      setUsers([]);
    } else {
      setUsers((data || []) as UserProfile[]);
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

    const { error } = await updateUserRole(
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
          ? { ...user, role }
          : user
      )
    );

    setSavingUser(null);
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">
        System Settings
      </h1>

      <div className="grid gap-6 md:grid-cols-2">

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Company Information
          </h2>

          <p>
            <strong>Company:</strong>{" "}
            Rexy Blocks Factory
          </p>

          <p>
            <strong>Location:</strong>{" "}
            Kumasi, Ghana
          </p>
        </div>

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
                {currentUser.full_name || "Not set"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {currentUser.email || "Not available"}
              </p>

              <p>
                <strong>Role:</strong>{" "}
                {ROLE_LABELS[currentUser.role]}
              </p>
            </div>
          ) : (
            <p className="text-red-600">
              Unable to load your account.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Product Pricing
          </h2>

          <ul className="space-y-2">
            <li>5-inch hollow block — GH₵9</li>
            <li>6-inch hollow block — GH₵10</li>
            <li>5-inch solid block — GH₵10</li>
            <li>6-inch solid block — GH₵11</li>
          </ul>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Inventory Alerts
          </h2>

          <p>
            Configure minimum stock levels.
          </p>
        </div>
      </div>

      {isAdmin && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              User Management
            </h2>

            <p className="mt-1 text-gray-600">
              Manage user roles and permissions.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

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
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isCurrentAdmin =
                      user.id === currentUser?.id;

                    return (
                      <tr
                        key={user.id}
                        className="border-b"
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
                              isCurrentAdmin ||
                              savingUser === user.id
                            }
                            onChange={(event) =>
                              handleRoleChange(
                                user.id,
                                event.target
                                  .value as UserRole
                              )
                            }
                            className="rounded border p-2"
                          >
                            {ROLES.map((role) => (
                              <option
                                key={role}
                                value={role}
                              >
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3">
                          {isCurrentAdmin ? (
                            <span className="text-sm text-gray-500">
                              Current admin
                            </span>
                          ) : savingUser ===
                            user.id ? (
                            <span className="text-sm text-gray-500">
                              Saving...
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Select a role
                            </span>
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
    </div>
  );
}