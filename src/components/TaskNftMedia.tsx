import { Gem } from "lucide-react";
import { useNftMediaUrl } from "@/lib/nft-media";

export function TaskNftMedia({ nft }: { nft: { name: string; image_url: string | null; model_url?: string | null } | null }) {
  const image = useNftMediaUrl(nft?.image_url);
  return image ? <img src={image} alt={nft?.name ?? "Task NFT"} width={512} height={512} loading="lazy" className="aspect-square w-full object-contain bg-muted/30" /> : <div className="grid aspect-square place-items-center bg-muted/30"><Gem className="size-10 text-primary" /></div>;
}