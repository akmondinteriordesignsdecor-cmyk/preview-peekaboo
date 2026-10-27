import { createFileRoute } from "@tanstack/react-router";
import { confirmWithPaystack, settleTransfer } from "@/lib/paystack.functions";

async function hmac512(key: string, body: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = (process.env["PAYSTACK_SECRET_KEY"] ?? process.env["STRIPE_TEST_API_KEY"]);
        if (!secret) return new Response("not configured", { status: 500 });
        const body = await request.text();
        const sig = request.headers.get("x-paystack-signature") ?? "";
        if ((await hmac512(secret, body)) !== sig) return new Response("bad signature", { status: 401 });
        const evt = JSON.parse(body) as { event: string; data?: { reference?: string } };
        // Re-verify with Paystack API instead of trusting the payload.
        if (evt.event === "charge.success" && evt.data?.reference) await confirmWithPaystack(evt.data.reference);
        if (evt.event.startsWith("transfer.") && evt.data?.reference) await settleTransfer(evt.data.reference);
        return new Response("ok");
      },
    },
  },
});
