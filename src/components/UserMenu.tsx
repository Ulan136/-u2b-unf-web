"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; name: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.ok && setUser(j.data.user))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!user) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-800">👤 {user.name || user.username}</span>
      <button
        onClick={logout}
        className="px-2 py-1 rounded border border-gray-700/20 hover:bg-black/5"
      >
        Выйти
      </button>
    </div>
  );
}
