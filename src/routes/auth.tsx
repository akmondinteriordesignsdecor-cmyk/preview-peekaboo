import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Brand";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { recordLogin } from "@/lib/paystack.functions";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup", "forgot", "mfa"]).optional(), ref: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Log in or sign up — MiningVault Groups" },
      { name: "description", content: "Access your MiningVault Groups mining dashboard." },
      { property: "og:title", content: "Log in or sign up — MiningVault Groups" },
      { property: "og:description", content: "Access your MiningVault Groups mining dashboard." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState(search.mode ?? (search.ref ? "signup" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ref, setRef] = useState(search.ref ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (search.ref) localStorage.setItem("mv_ref", search.ref); else setRef(localStorage.getItem("mv_ref") ?? ""); }, [search.ref]);
  const [code, setCode] = useState("");
  const record = useServerFn(recordLogin);
  async function finish(method: string) {
    try { await record({ data: { method } }); } catch { /* non-blocking */ }
    nav({ to: "/dashboard" });
  }
  useEffect(() => {
    if (!session) return;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") setMode("mfa");
      else finish(session.user.app_metadata?.provider ?? "email");
    });
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const factor = f?.totp?.[0];
      if (!factor) throw new Error("No authenticator found");
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
      if (error) throw error;
      await finish("email+2fa");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { ref: ref.trim() } } });
        if (error) throw error;
        toast.success("Check your email to verify your account.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message);
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="panel w-full max-w-sm p-6">
        <Logo />
        {mode === "mfa" ? (
          <form onSubmit={verifyMfa} className="mt-6 space-y-3">
            <h1 className="text-2xl font-semibold">Two-factor code</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            <Input inputMode="numeric" autoFocus maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="num text-center text-lg tracking-widest" />
            <Button variant="gold" className="w-full" disabled={busy || code.length !== 6}>Verify</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={async () => { await supabase.auth.signOut(); setMode("login"); }}>Use another account</Button>
          </form>
        ) : <>
        <h1 className="mt-6 text-2xl font-semibold">{mode === "signup" ? "Create account" : mode === "login" ? "Welcome back" : "Reset password"}</h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== "forgot" && <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
          {mode === "signup" && <div><Label htmlFor="ref">Referral code (optional)</Label><Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} /></div>}
          <Button variant="gold" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "login" ? "Log in" : "Send reset link"}</Button>
        </form>
        {mode !== "forgot" && <Button variant="outline" className="mt-3 w-full" onClick={google}>Continue with Google</Button>}
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="hover:text-primary">{mode === "login" ? "Create account" : "Have an account? Log in"}</button>
          {mode === "login" && <button onClick={() => setMode("forgot")} className="hover:text-primary">Forgot password?</button>}
        </div>
        </>}
      </div>
    </div>
  );
}
