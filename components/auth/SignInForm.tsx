"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import LogoFull from "@/components/icons/LogoFull";
import { Button, Input } from "@/components/ui/primitives";

export function SignInForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      if (!response.ok) {
        setError("Invalid username or password");
        return;
      }
      const from = searchParams.get("from") || "/";
      window.location.href = from.startsWith("/") ? from : "/";
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid-wash flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-sm backdrop-blur">
        <div className="flex flex-col items-center text-center">
          <LogoFull className="h-8 w-auto" />
          <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Metrics
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal access only. Use the credentials from your environment.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Username
            <Input
              name="username"
              autoComplete="username"
              required
              placeholder="Username"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
