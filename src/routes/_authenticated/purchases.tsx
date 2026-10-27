import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [
    { title: "Purchase history — MiningVault Groups" },
    { name: "description", content: "Purchase history now lives with your activity." },
    { property: "og:title", content: "Purchase history — MiningVault Groups" },
    { property: "og:description", content: "Purchase history now lives with your activity." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: () => {
    throw redirect({ to: "/activity" });
  },
  component: () => null,
});
