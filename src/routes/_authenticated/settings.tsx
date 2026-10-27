import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginsQ, profileQ } from "@/lib/data";
import { HelpCenter } from "@/components/HelpCenter";
import { dt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MiningVault Groups" }, { name: "description", content: "Manage your MiningVault Groups account." }, { property: "og:title", content: "Settings — MiningVault Groups" }, { property: "og:description", content: "Account settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: p } = useQuery(profileQ);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => { if (p) setName(p.display_name ?? ""); }, [p]);
  const { data: logins } = useQuery(loginsQ);
  const { data: factors, refetch } = useQuery({ queryKey: ["mfa"], queryFn: async () => (await supabase.auth.mfa.listFactors()).data });
  const active = factors?.totp?.[0];
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  async function startEnroll() {
    for (const f of factors?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `MiningVault Groups ${Date.now()}` });
    if (error) { toast.error(error.message); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirmEnroll() {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll!.id, code: code.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Two-factor login is on"); setEnroll(null); setCode(""); refetch();
  }
  async function disable2fa() {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: active!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Two-factor login turned off"); refetch();
  }
  async function saveName() {
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", p!.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); qc.invalidateQueries({ queryKey: ["profile"] });
  }
  async function savePw() {
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated"); setPw("");
  }
  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <HelpCenter />
      </div>
      <div className="panel space-y-3 p-5">
        <p className="text-sm text-muted-foreground">Email: {p?.email}</p>
        <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={saveName}>Save</Button>
      </div>
      <div className="panel space-y-3 p-5">
        <div><Label>New password</Label><Input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button onClick={savePw} disabled={pw.length < 8}>Change password</Button>
      </div>
      <div className="panel space-y-3 p-5">
        <h2 className="font-semibold">Two-factor login</h2>
        {active ? (
          <><p className="text-sm text-success">✓ On — you will enter a code from your authenticator app when you log in.</p>
          <Button variant="outline" onClick={disable2fa}>Turn off</Button></>
        ) : enroll ? (
          <>
            <p className="text-sm text-muted-foreground">Scan with Google Authenticator or Authy, then enter the 6-digit code.</p>
            <img src={enroll.qr} alt="Authenticator QR code" className="size-44 rounded bg-foreground p-2" />
            <p className="num break-all text-xs text-muted-foreground">Key: {enroll.secret}</p>
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button variant="gold" onClick={confirmEnroll} disabled={code.length !== 6}>Confirm</Button>
          </>
        ) : (
          <><p className="text-sm text-muted-foreground">Add a second step to your login for extra security.</p>
          <Button variant="gold" onClick={startEnroll}>Turn on</Button></>
        )}
      </div>
      <div className="panel space-y-3 p-5 opacity-80">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Identity verification</h2><span className="rounded-full border px-2 py-0.5 text-xs text-primary">Coming soon</span></div>
        <p className="text-sm text-muted-foreground">Verify your ID to confirm you are a real person and keep one account per member.</p>
        <Button variant="outline" disabled>Verify ID</Button>
      </div>
      <div className="panel p-5">
        <h2 className="font-semibold">Login history</h2>
        <div className="mt-3 space-y-2">
          {logins?.length ? logins.map((l) => (
            <div key={l.id} className="border-t pt-2 text-sm"><p>{dt(l.created_at)} · <span className="text-muted-foreground">{l.method}</span></p>
              <p className="truncate text-xs text-muted-foreground">{l.ip ?? "unknown IP"} · {l.user_agent ?? ""}</p></div>
          )) : <p className="text-sm text-muted-foreground">No logins recorded yet</p>}
        </div>
      </div>
    </div>
  );
}
