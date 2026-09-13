import { NextRequest, NextResponse } from "next/server";
import { svc, getVapid, comVapid, enviarPush } from "@/lib/push-server";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";
import { NOTIF_PADRAO } from "@/lib/notificacoes";

export const runtime = "nodejs";
export const maxDuration = 60;

type Sub = { endpoint: string; p256dh: string; auth: string; empresa_id: string | null };
type Lanc = { tipo: string | null; vencimento: string | null; pago: boolean | null };
type Extras = Record<string, { nascimento?: string }>;
type Boleto = { boleto?: boolean; descricao?: string; valor?: number; dia?: number; mes?: number; ano?: number; confirmadosDia?: string[]; lembrar?: number[] };

const p2 = (n: number) => String(n).padStart(2, "0");
// me_func_extra pode vir como texto (JSON string), jsonb (objeto) ou duplo-encode.
function parseExtras(dados: unknown): Extras {
  let v = dados;
  for (let i = 0; i < 2 && typeof v === "string"; i++) { try { v = JSON.parse(v); } catch { break; } }
  return v && typeof v === "object" ? (v as Extras) : {};
}
// me_calendario_pagamentos pode vir como string (JSON) ou jsonb; devolve a lista.
function parseLista(dados: unknown): Boleto[] {
  let v = dados;
  for (let i = 0; i < 2 && typeof v === "string"; i++) { try { v = JSON.parse(v); } catch { break; } }
  return Array.isArray(v) ? (v as Boleto[]) : [];
}

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
  const onAniversarios = cfg["aniversarios"] ?? true;
  const onBoletos = cfg["boletos_lembrete"] ?? true;
  if (!onVencer && !onVencidas && !onAniversarios && !onBoletos) return NextResponse.json({ ok: true, enviados: 0, motivo: "tipos desligados" });

  // ── inscrições agrupadas por empresa ─────────────────────────────────────
  const { data: subsData } = await s.from("push_subscriptions").select("endpoint,p256dh,auth,empresa_id");
  const subs = (subsData as Sub[] | null) ?? [];
  const porEmpresa = new Map<string, Sub[]>();
  subs.forEach((x) => { if (x.empresa_id) { const l = porEmpresa.get(x.empresa_id) || []; l.push(x); porEmpresa.set(x.empresa_id, l); } });

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
  const dd = hoje.slice(8, 10), mm = hoje.slice(5, 7);
  let enviados = 0; const mortas: string[] = [];

  for (const [empresaId, lista] of porEmpresa) {
    const msgs: { title: string; body: string; tag: string; url: string }[] = [];

    // Contas (a pagar/receber) — dados na tabela lancamentos.
    if (onVencer || onVencidas) {
      const { data: lancData } = await s.from("lancamentos").select("tipo,vencimento,pago").eq("empresa_id", empresaId).eq("pago", false).lte("vencimento", hoje);
      const lancs = (lancData as Lanc[] | null) ?? [];
      const vencidas = lancs.filter((l) => l.vencimento && l.vencimento < hoje).length;
      const vencerHoje = lancs.filter((l) => l.vencimento === hoje).length;
      if (onVencidas && vencidas > 0) msgs.push({ title: "🔴 Contas vencidas", body: vencidas === 1 ? "Você tem 1 conta em atraso." : `Você tem ${vencidas} contas em atraso.`, tag: "contas_vencidas", url: "/dashboard/financas" });
      if (onVencer && vencerHoje > 0) msgs.push({ title: "🟡 Vence hoje", body: vencerHoje === 1 ? "Você tem 1 conta vencendo hoje." : `Você tem ${vencerHoje} contas vencendo hoje.`, tag: "contas_vencer", url: "/dashboard/financas" });
    }

    // Aniversários do dia — nascimento vem espelhado em painel_estado (me_func_extra).
    if (onAniversarios) {
      const [funcRes, peRes] = await Promise.all([
        s.from("funcionarios").select("id,nome,ativo").eq("empresa_id", empresaId),
        s.from("painel_estado").select("dados").eq("empresa_id", empresaId).eq("chave", "me_func_extra").maybeSingle(),
      ]);
      const extras = parseExtras((peRes.data as { dados?: unknown } | null)?.dados);
      const funcs = (funcRes.data as { id: string; nome: string | null; ativo: boolean | null }[] | null) ?? [];
      const niver = funcs.filter((f) => {
        if (f.ativo === false) return false;
        const nasc = extras[f.id]?.nascimento;
        return typeof nasc === "string" && nasc.slice(5, 7) === mm && nasc.slice(8, 10) === dd;
      });
      if (niver.length > 0) {
        const nomes = niver.map((f) => (f.nome || "").split(" ")[0]).filter(Boolean).join(", ");
        msgs.push({ title: "🎂 Aniversário hoje!", body: niver.length === 1 ? `${nomes} faz aniversário hoje.` : `Aniversários hoje: ${nomes}.`, tag: "aniversarios", url: "/dashboard/home" });
      }
    }

    // Boletos (feature "meus boletos") — guardados em painel_estado (me_calendario_pagamentos).
    // Avisa na antecedência escolhida (lembrar, ex.: [7,3]) e no dia do vencimento.
    if (onBoletos) {
      const { data: peb } = await s.from("painel_estado").select("dados").eq("empresa_id", empresaId).eq("chave", "me_calendario_pagamentos").maybeSingle();
      const pags = parseLista((peb as { dados?: unknown } | null)?.dados);
      for (const p of pags) {
        if (!p.boleto || p.valor == null || p.dia == null || p.mes == null || p.ano == null) continue;
        const iso = `${p.ano}-${p2(p.mes + 1)}-${p2(p.dia)}`;
        if ((p.confirmadosDia || []).includes(iso)) continue;   // já pago
        const dias = Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(hoje + "T00:00:00Z")) / 86400000);
        const lembrar = p.lembrar && p.lembrar.length ? p.lembrar : [7, 3];
        if (!(dias === 0 || (dias > 0 && lembrar.includes(dias)))) continue;
        const valorTxt = "R$ " + Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const quando = dias === 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
        msgs.push({ title: dias === 0 ? "🔴 Boleto vence hoje" : "🔔 Boleto chegando", body: `${p.descricao || "Boleto"} ${quando}: ${valorTxt}.`, tag: "boleto_" + iso, url: "/dashboard/financas" });
      }
    }

    if (msgs.length === 0) continue;
    for (const sub of lista) {
      for (const m of msgs) {
        const r = await enviarPush(wp, sub, { title: m.title, body: m.body, tag: m.tag, url: m.url });
        if (r.ok) enviados++; else if (r.morta) mortas.push(sub.endpoint);
      }
    }
  }

  // limpa inscrições mortas (aparelho desinstalou / expirou)
  if (mortas.length) await s.from("push_subscriptions").delete().in("endpoint", Array.from(new Set(mortas)));

  return NextResponse.json({ ok: true, enviados, empresas: porEmpresa.size, limpasMortas: mortas.length });
}
