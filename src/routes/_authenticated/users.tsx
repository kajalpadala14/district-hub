import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProfiles, useUserRoles, type Profile } from "@/hooks/useData";
import { isDashboardUserProfile, usernameFromProfile } from "@/lib/profileClassification";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const { profiles, refresh } = useProfiles();
  const roles = useUserRoles();
  const [query, setQuery] = useState("");

  const roleByUserId = useMemo(() => new Map(roles.map((role) => [role.user_id, role.role])), [roles]);
  const users = useMemo(() => {
    const byEmail = new Map<string, Profile>();
    for (const profile of profiles) {
      if (!isDashboardUserProfile(profile, roleByUserId.get(profile.id))) continue;
      const key = profile.email.toLowerCase();
      const existing = byEmail.get(key);
      if (!existing || profile.created_at > existing.created_at) byEmail.set(key, profile);
    }
    return Array.from(byEmail.values()).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  }, [profiles, roleByUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((profile) =>
      [
        profile.full_name ?? "",
        usernameFromProfile(profile),
        profile.email,
        profile.job_title ?? "",
        roleByUserId.get(profile.id) ?? "",
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [query, roleByUserId, users]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage dashboard login users separately from employees</p>
        </div>
        <Button
          variant="outline"
          className="w-fit"
          onClick={async () => {
            await refresh();
            toast.success("User list refreshed");
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </section>

      <Card className="rounded-xl shadow-elevated">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search users"
              placeholder="Search by name, username, or role..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl shadow-elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((profile) => {
                  const role = roleByUserId.get(profile.id);
                  return (
                    <TableRow key={profile.id} className="h-14">
                      <TableCell className="font-semibold">{profile.full_name || usernameFromProfile(profile)}</TableCell>
                      <TableCell className="text-sm">{usernameFromProfile(profile)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {role ?? profile.job_title ?? "user"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{profile.department || "--"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                          <ShieldCheck className="h-4 w-4" />
                          Active
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
