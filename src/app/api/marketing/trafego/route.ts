import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Valida o token do chamador e exige e-mail na lista de super admins. */
async function superDoCaller(req: NextRequest, s: SupabaseClient): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await s.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  return !!email && SUPERS.includes(email);
}

const CHAVES_KV = ["meta_access_token", "meta_ad_account_id", "trafego_meta_cpl", "trafego_imposto", "pixel_id"] as const;

async function lerConfig(s: SupabaseClient) {
  const { data } = await s.from("app_kv").select("chave,valor").in("chave", CHAVES_KV as unknown as string[]);
  const m = new Map((data ?? []).map((r: { chave: string; valor: string | null }) => [r.chave, r.valor]));
  return {
    metaAdAccount: m.get("meta_ad_account_id") ?? "",
    metaToken: m.get("meta_access_token") ?? "",
    metaCpl: m.get("trafego_meta_cpl") ?? "",
    imposto: m.get("trafego_imposto") ?? "13.83",
    pixelId: m.get("pixel_id") ?? "",
  };
}

// GET: meses salvos + configuração (pixel, credenciais da Meta, meta de CPL, imposto).
export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!(await superDoCaller(req, s))) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  const { data: meses } = await s.from("trafego_mensal").select("*").order("mes", { ascending: true });
  const config = await lerConfig(s);
  return NextResponse.json({ meses: meses ?? [], config });
}

// POST: salvar mês, salvar configuração, ou puxar da Meta.
export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!(await superDoCaller(req, s))) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  const body = (await req.json()) as {
    action?: string; mes?: string;
    investido?: number | string; leads?: number | string; impressoes?: number | string;
    cliques?: number | string; vendas?: number | string; campanhas?: number | string;
    config?: Partial<Record<(typeof CHAVES_KV)[number], string>>;
  };
  const n = (v: unknown) => Number(String(v ?? "").replace(",", ".")) || 0;

  // Salva/edita um mês na mão.
  if (body.action === "salvar-mes" && body.mes) {
    const linha = {
      mes: body.mes,
      investido: n(body.investido), leads: Math.round(n(body.leads)), impressoes: Math.round(n(body.impressoes)),
      cliques: Math.round(n(body.cliques)), vendas: Math.round(n(body.vendas)), campanhas: Math.round(n(body.campanhas)),
      origem: "manual", atualizado_em: new Date().toISOString(),
    };
    const { error } = await s.from("trafego_mensal").upsert(linha);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mes: linha });
  }

  // Apaga um mês.
  if (body.action === "apagar-mes" && body.mes) {
    await s.from("trafego_mensal").delete().eq("mes", body.mes);
    return NextResponse.json({ ok: true });
  }

  // Salva a configuração (pixel, token/conta da Meta, meta de CPL, imposto).
  if (body.action === "salvar-config" && body.config) {
    const rows = Object.entries(body.config)
      .filter(([k]) => (CHAVES_KV as readonly string[]).includes(k))
      .map(([chave, valor]) => ({ chave, valor: (valor ?? "").toString().trim() || null }));
    if (rows.length) {
      const { error } = await s.from("app_kv").upsert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Puxa os números do mês direto da Meta (Facebook) e salva.
  if (body.action === "sync-meta" && body.mes) {
    const cfg = await lerConfig(s);
    const token = cfg.metaToken.trim();
    let acct = cfg.metaAdAccount.trim();
    if (!token || !acct) return NextResponse.json({ error: "Configure o token e o ID da conta de anúncios da Meta primeiro." }, { status: 400 });
    if (!acct.startsWith("act_")) acct = "act_" + acct.replace(/^act_/, "");

    // Intervalo do mês (o fim não passa de hoje, senão a Meta reclama).
    const [y, mo] = body.mes.split("-").map(Number);
    const primeiro = `${body.mes}-01`;
    const ultimoDia = new Date(y, mo, 0).getDate();
    const hoje = new Date();
    const fimData = new Date(Math.min(new Date(y, mo - 1, ultimoDia).getTime(), hoje.getTime()));
    const until = `${fimData.getFullYear()}-${String(fimData.getMonth() + 1).padStart(2, "0")}-${String(fimData.getDate()).padStart(2, "0")}`;

    const params = new URLSearchParams({
      level: "campaign",
      time_range: JSON.stringify({ since: primeiro, until }),
      fields: "spend,impressions,clicks,actions",
      limit: "500",
      access_token: token,
    });
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${acct}/insights?${params.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || j.error) return NextResponse.json({ error: j.error?.message || "Erro ao consultar a Meta." }, { status: 502 });
      const linhas: { spend?: string; impressions?: string; clicks?: string; actions?: { action_type: string; value: string }[] }[] = j.data ?? [];
      let investido = 0, impressoes = 0, cliques = 0, leads = 0;
      for (const l of linhas) {
        investido += Number(l.spend) || 0;
        impressoes += Number(l.impressions) || 0;
        cliques += Number(l.clicks) || 0;
        for (const a of l.actions ?? []) if (/lead/i.test(a.action_type)) leads += Number(a.value) || 0;
      }
      const linha = {
        mes: body.mes, investido: Math.round(investido * 100) / 100, impressoes: Math.round(impressoes),
        cliques: Math.round(cliques), leads: Math.round(leads), campanhas: linhas.length,
        vendas: 0, origem: "meta", atualizado_em: new Date().toISOString(),
      };
      // Preserva vendas já digitadas à mão (a Meta não sabe das vendas fechadas).
      const { data: atual } = await s.from("trafego_mensal").select("vendas").eq("mes", body.mes).maybeSingle();
      if (atual && (atual as { vendas?: number }).vendas) linha.vendas = (atual as { vendas: number }).vendas;
      const { error } = await s.from("trafego_mensal").upsert(linha);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mes: linha, campanhas: linhas.length });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message || "Falha ao conectar na Meta." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
