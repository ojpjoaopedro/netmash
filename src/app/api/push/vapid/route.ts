import { NextResponse } from "next/server";
import { svc, getVapid } from "@/lib/push-server";

export const runtime = "nodejs";

// Devolve a chave PÚBLICA de push para o cliente se inscrever. (A privada nunca sai.)
export async function GET() {
  const s = svc();
  if (!s) return NextResponse.json({ publicKey: null });
  const v = await getVapid(s);
  return NextResponse.json({ publicKey: v?.publicKey ?? null });
}
