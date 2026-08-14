import { NextRequest, NextResponse } from "next/server";
import { svc, getVapid, comVapid, enviarPush } from "@/lib/push-server";

export const runtime = "nodejs";

type SubJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

// Salva a inscrição de push do aparelho do usuário e manda um push de boas-vindas.
export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave." }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await s.auth.getUser(token);
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = (await req.json()) as { subscription?: SubJSON };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return NextResponse.json({ error: "Inscrição inválida." }, { status: 400 });

  // resolve a empresa do usuário (colaborador: perfil; dono: empresas.dono_id)
  const { data: perfil } = await s.from("perfis").select("empresa_id").eq("id", uid).maybeSingle();
  let empresaId = (perfil as { empresa_id?: string } | null)?.empresa_id ?? null;
  if (!empresaId) {
    const { data: emp } = await s.from("empresas").select("id").eq("dono_id", uid).order("criado_em", { ascending: true }).limit(1).maybeSingle();
    empresaId = (emp as { id?: string } | null)?.id ?? null;
  }

  await s.from("push_subscriptions").upsert(
    { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_id: uid, empresa_id: empresaId },
    { onConflict: "endpoint" },
  );

  // push de boas-vindas (prova que funcionou no aparelho)
  const v = await getVapid(s);
  if (v) {
    const wp = comVapid(v);
    await enviarPush(wp, { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { title: "Notificações ativadas ✅", body: "Você vai receber avisos importantes aqui no celular.", url: "/dashboard/home", tag: "boas-vindas" });
  }

  return NextResponse.json({ ok: true });
}

// Remove a inscrição (desligar notificações).
export async function DELETE(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ ok: true });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) await s.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
