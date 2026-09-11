"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow, UserRole } from "@meridian/schemas";
import { adminUsersAction } from "@/app/actions/admin-users";
import { Button } from "@/components/ui/button";

const ROLES: UserRole[] = ["trader", "admin", "compliance"];

export function UsersAdminConsole(): React.JSX.Element {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminUsersAction({ op: "list" });
    if (res.status !== 200) {
      setError("Unable to list users.");
      setUsers([]);
      return;
    }
    setError(null);
    setUsers((res.body as { users: AdminUserRow[] }).users);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(userId: string, role: UserRole): Promise<void> {
    setBusy(true);
    const res = await adminUsersAction({ op: "assign", user_id: userId, role });
    setBusy(false);
    if (res.status !== 200) {
      setError("Unable to assign role.");
      return;
    }
    await load();
  }

  if (error && users.length === 0) {
    return (
      <p className="p-4 text-sm text-destructive" data-testid="users-error">
        {error}
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground" data-testid="users-empty">
        No users yet.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto p-3" data-testid="users-admin">
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      <table className="w-full text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="pb-2">Email</th>
            <th className="pb-2">Name</th>
            <th className="pb-2">Role</th>
            <th className="pb-2">Assign</th>
          </tr>
        </thead>
        <tbody>
          {users.map((row) => (
            <tr key={row.user_id} className="border-t border-border" data-testid="user-row">
              <td className="py-2 font-mono tabular-nums text-xs">{row.email ?? row.user_id}</td>
              <td className="py-2 text-xs">{row.display_name ?? "—"}</td>
              <td className="py-2 font-mono text-xs text-primary">{row.role}</td>
              <td className="py-2">
                <div className="flex gap-1">
                  {ROLES.map((role) => (
                    <Button
                      key={role}
                      type="button"
                      size="sm"
                      variant={row.role === role ? "default" : "outline"}
                      disabled={busy || row.role === role}
                      onClick={() => void assign(row.user_id, role)}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
