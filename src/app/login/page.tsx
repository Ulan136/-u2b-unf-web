"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "login" | "setup">("loading");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const j = await (await fetch("/api/auth/me")).json();
        if (j.ok && j.data.user) {
          router.replace("/");
          return;
        }
        setMode(j.ok && j.data.needsSetup ? "setup" : "login");
      } catch {
        setMode("login");
      }
    })();
  }, [router]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const url = mode === "setup" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "setup"
          ? { username, password, name: name || username }
          : { username, password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Ошибка");
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="text-3xl">🏢</div>
          <h1 className="text-lg font-semibold mt-1">Веб-УНФ</h1>
          <p className="text-sm text-gray-500">
            {mode === "setup"
              ? "Создайте администратора (первый запуск)"
              : "Вход в систему"}
          </p>
        </div>

        {mode === "loading" ? (
          <div className="text-center text-gray-400 py-6">Загрузка…</div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
                {error}
              </div>
            )}
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Логин</span>
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="input"
                autoComplete="username"
              />
            </label>
            {mode === "setup" && (
              <label className="block">
                <span className="text-xs text-gray-500 mb-1 block">Имя (необязательно)</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-gray-500 mb-1 block">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="input"
                autoComplete={mode === "setup" ? "new-password" : "current-password"}
              />
            </label>
            <button
              onClick={submit}
              disabled={busy || !username.trim() || !password}
              className="w-full bg-yellow-400 text-gray-900 font-medium py-2 rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {busy
                ? "…"
                : mode === "setup"
                ? "Создать и войти"
                : "Войти"}
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.625rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
