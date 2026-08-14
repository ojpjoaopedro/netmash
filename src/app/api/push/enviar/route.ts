import { NextRequest, NextResponse } from "next/server";
import { svc, getVapid, comVapid, enviarPush } from "@/lib/push-server";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";
import { NOTIF_PADRAO } from "@/lib/notificacoes";

export const runtime = "nodejs";
export const maxDuration = 60;

type Sub = { endpoint: string; p256dh: string; auth: string; empresa_id: string | null };
type Lanc = { tipo: string | null; vencimento: string | null; pago: boolean | null };

// Rotina diária: avisa por push as contas a vencer HOJE e as vencidas (não pagas).
// Chamada por um agendador. Autoriza por: header x-cron-secret OU token de super admin.
export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave." }, { status: 500 });

  // ── autorização ──────────────────────────────────────────────────────────
  const segredoConfig = process.env.CRON_SECRET
    || ((await s.from("app_kv").select("valor").eq("chave", "push_cron_secret").maybeSingle()).data as { valor?: string } | null)?.valor
    || "";
  const segredoReq = req.headers.get("x-cron-secret") || "";
  let autorizado = !!segredoConfig && segredoReq === segredoConfig;
  if (!autorizado) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (token) { const { data } = await s.auth.getUser(token); const email = data?.user?.email?.toLowerCase(); autorizado = !!email && SUPERS.includes(email); }
  }
  if (!autorizado) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const v = await getVapid(s);
  if (!v) return NextResponse.json({ error: "Chaves de push não configuradas." }, { status: 400 });
  const wp = comVapid(v);

  // ── quais tipos estão ligados (config global do Admin) ───────────────────
  const cfgRes = await s.from("notificacoes_config").select("chave,ligado");
  const cfg: Record<string, boolean> = { ...NOTIF_PADRAO };
  ((cfgRes.data as { chave: string; ligado: boolean }[] | null) ?? []).forEach((r) => { cfg[r.chave] = r.ligado; });
  const onVencer = cfg["contas_vencer"] ?? true;
  const onVencidas = cfg["contas_vencidas"] ?? true;
  if (!onVencer && !onVencidas) return NextResponse.json({ ok: true, enviados: 0, motivo: "tipos desligados" });

  // ── inscrições agrupadas por empresa ─────────────────────────────────────
  const { data: subsData } = await s.from("push_subscriptions").select("endpoint,p256dh,auth,empresa_id");
  const subs = (subsData as Sub[] | null) ?? [];
  const porEmpresa = new Map<string, Sub[]>();
  subs.forEach((x) => { if (x.empresa_id) { const l = porEmpresa.get(x.empresa_id) || []; l.push(x); porEmpresa.set(x.empresa_id, l); } });

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
  let enviados = 0; const mortas: string[] = [];

  for (const [empresaId, lista] of porEmpresa) {
    const { data: lancData } = await s.from("lancamentos").select("tipo,vencimento,pago").eq("empresa_id", empresaId).eq("pago", false).lte("vencimento", hoje);
    const lancs = (lancData as Lanc[] | null) ?? [];
    const vencidas = lancs.filter((l) => l.vencimento && l.vencimento < hoje).length;
    const vencerHoje = lancs.filter((l) => l.vencimento === hoje).length;

    const msgs: { title: string; body: string; tag: string }[] = [];
    if (onVencidas && vencidas > 0) msgs.push({ title: "🔴 Contas vencidas", body: vencidas === 1 ? "Você tem 1 conta em atraso." : `Você tem ${vencidas} contas em atraso.`, tag: "contas_vencidas" });
    if (onVencer && vencerHoje > 0) msgs.push({ title: "🟡 Vence hoje", body: vencerHoje === 1 ? "Você tem 1 conta vencendo hoje." : `Você tem ${vencerHoje} contas vencendo hoje.`, tag: "contas_vencer" });
    if (msgs.length === 0) continue;

    for (const sub of lista) {
      for (const m of msgs) {
        const r = await enviarPush(wp, sub, { ...m, url: "/dashboard/financas" });
        if (r.ok) enviados++; else if (r.morta) mortas.push(sub.endpoint);
      }
    }
  }

  // limpa inscrições mortas (aparelho desinstalou / expirou)
  if (mortas.length) await s.from("push_subscriptions").delete().in("endpoint", Array.from(new Set(mortas)));

  return NextResponse.json({ ok: true, enviados, empresas: porEmpresa.size, limpasMortas: mortas.length });
}
