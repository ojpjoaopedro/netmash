import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPERADMINS as SUPERS } from "@/lib/superadmin";
import { extrairLeads, listaSemanas, weekRange, type Resultado } from "@/lib/trafego";

export const runtime = "nodejs";
export const maxDuration = 60;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function svc(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ehSuper(req: NextRequest, s: SupabaseClient): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await s.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  return !!email && SUPERS.includes(email);
}

const CHAVES = ["meta_access_token", "meta_ad_account_id", "trafego_meta_cpl", "trafego_imposto", "pixel_id", "trafego_meta_leads", "trafego_capi_purchase"] as const;

async function lerConfig(s: SupabaseClient) {
  const { data } = await s.from("app_kv").select("chave,valor").in("chave", CHAVES as unknown as string[]);
  const m = new Map((data ?? []).map((r: { chave: string; valor: string | null }) => [r.chave, r.valor]));
  let metasLeads: Record<string, number> = {};
  try { metasLeads = JSON.parse(m.get("trafego_meta_leads") || "{}"); } catch { metasLeads = {}; }
  return {
    metaAdAccount: m.get("meta_ad_account_id") ?? "",
    metaToken: m.get("meta_access_token") ?? "",
    metaCpl: m.get("trafego_meta_cpl") ?? "",
    imposto: m.get("trafego_imposto") ?? "13.83",
    pixelId: m.get("pixel_id") ?? "",
    capiPurchase: (m.get("trafego_capi_purchase") ?? "") === "on",
    metasLeads,
  };
}

const n = (v: unknown) => Number(String(v ?? "").replace(",", ".")) || 0;

export async function GET(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });
  const { data: rows } = await s.from("trafego_resultados").select("*").order("mes", { ascending: true }).order("semana", { ascending: true }).order("posicao", { ascending: true });
  const { data: criativos } = await s.from("trafego_criativos").select("*").order("mes", { ascending: true }).order("semana", { ascending: true }).order("posicao", { ascending: true });
  const config = await lerConfig(s);
  return NextResponse.json({ rows: rows ?? [], criativos: criativos ?? [], config });
}

export async function POST(req: NextRequest) {
  const s = svc();
  if (!s) return NextResponse.json({ error: "Servidor sem chave configurada." }, { status: 500 });
  if (!(await ehSuper(req, s))) return NextResponse.json({ error: "Acesso restrito (Super Admin)." }, { status: 403 });

  const body = await req.json();
  const action = body.action as string;

  // ── salvar/editar uma campanha de uma semana ──────────────────────────────
  if (action === "salvar-campanha") {
    const linha = {
      mes: body.mes, semana: Number(body.semana) || 1, campanha: (body.campanha || "").trim() || "Campanha",
      investido: n(body.investido), impressoes: Math.round(n(body.impressoes)), cliques: Math.round(n(body.cliques)),
      leads: Math.round(n(body.leads)), leads_plataforma: Math.round(n(body.leads_plataforma)), leads_planilha: Math.round(n(body.leads_planilha)),
      origem: "manual", atualizado_em: new Date().toISOString(),
    };
    const { error } = await s.from("trafego_resultados").upsert(linha, { onConflict: "mes,semana,campanha" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── apagar uma campanha ───────────────────────────────────────────────────
  if (action === "apagar-campanha") {
    if (body.id) await s.from("trafego_resultados").delete().eq("id", body.id);
    else await s.from("trafego_resultados").delete().eq("mes", body.mes).eq("semana", Number(body.semana)).eq("campanha", body.campanha);
    return NextResponse.json({ ok: true });
  }

  // ── salvar configuração (pixel, Meta, meta CPL, imposto) ──────────────────
  if (action === "salvar-config" && body.config) {
    const c = body.config as Record<string, string | boolean>;
    const rows = (["pixel_id", "meta_ad_account_id", "meta_access_token", "trafego_meta_cpl", "trafego_imposto"] as const)
      .map((chave) => ({ chave, campo: { pixel_id: "pixelId", meta_ad_account_id: "metaAdAccount", meta_access_token: "metaToken", trafego_meta_cpl: "metaCpl", trafego_imposto: "imposto" }[chave] }))
      .filter(({ campo }) => c[campo] !== undefined)
      .map(({ chave, campo }) => ({ chave: chave as string, valor: (c[campo] ?? "").toString().trim() || null }));
    if (c.capiPurchase !== undefined) rows.push({ chave: "trafego_capi_purchase", valor: c.capiPurchase ? "on" : null });
    if (rows.length) { const { error } = await s.from("app_kv").upsert(rows); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  // ── meta de leads do mês (guardada num JSON em app_kv) ─────────────────────
  if (action === "salvar-meta-leads" && body.mes) {
    const { data } = await s.from("app_kv").select("valor").eq("chave", "trafego_meta_leads").maybeSingle();
    let mapa: Record<string, number> = {};
    try { mapa = JSON.parse((data as { valor?: string } | null)?.valor || "{}"); } catch { mapa = {}; }
    mapa[body.mes] = Math.round(n(body.valor));
    await s.from("app_kv").upsert({ chave: "trafego_meta_leads", valor: JSON.stringify(mapa) });
    return NextResponse.json({ ok: true, metasLeads: mapa });
  }

  // ── puxar da Meta (por semana) ────────────────────────────────────────────
  if (action === "sync-meta" && body.mes) {
    const cfg = await lerConfig(s);
    const token = cfg.metaToken.trim();
    let acct = cfg.metaAdAccount.trim();
    if (!token || !acct) return NextResponse.json({ error: "Configure o token e o ID da conta de anúncios da Meta primeiro." }, { status: 400 });
    if (!acct.startsWith("act_")) acct = "act_" + acct.replace(/^act_/, "");

    const semanas: number[] = body.mesInteiro ? listaSemanas(body.mes) : [Number(body.semana) || 1];
    const hoje = new Date();
    let criadas = 0, campanhasTotal = 0;
    const erros: string[] = [];

    for (const semana of semanas) {
      const { since, until: untilRaw } = weekRange(body.mes, semana);
      // não pede período no futuro (a Meta recusa)
      const until = new Date(untilRaw) > hoje ? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}` : untilRaw;
      if (new Date(since) > hoje) continue;   // semana ainda não começou
      const params = new URLSearchParams({
        level: "campaign",
        time_range: JSON.stringify({ since, until }),
        fields: "campaign_name,spend,impressions,inline_link_clicks,clicks,actions",
        limit: "300", access_token: token,
      });
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${acct}/insights?${params}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j.error) { erros.push(`S${semana}: ${j.error?.message || r.status}`); continue; }
        const linhas: { campaign_name?: string; spend?: string; impressions?: string; inline_link_clicks?: string; clicks?: string; actions?: { action_type: string; value: string }[] }[] = j.data ?? [];
        let pos = 0;
        for (const l of linhas) {
          const campanha = (l.campaign_name || "Campanha").trim();
          const registro = {
            mes: body.mes, semana, campanha,
            investido: Math.round((Number(l.spend) || 0) * 100) / 100,
            impressoes: Math.round(Number(l.impressions) || 0),
            cliques: Math.round(Number(l.inline_link_clicks) || Number(l.clicks) || 0),
            leads: extrairLeads(l.actions),
            origem: "meta", posicao: pos++, atualizado_em: new Date().toISOString(),
          };
          // upsert sem tocar em leads_plataforma/leads_planilha (ficam manuais)
          const { error } = await s.from("trafego_resultados").upsert(registro, { onConflict: "mes,semana,campanha" });
          if (!error) { criadas++; campanhasTotal++; }
        }
      } catch (e) { erros.push(`S${semana}: ${(e as Error).message}`); }
    }
    if (campanhasTotal === 0 && erros.length) return NextResponse.json({ error: erros.join(" · ") }, { status: 502 });
    return NextResponse.json({ ok: true, campanhas: campanhasTotal, semanas: semanas.length, avisos: erros });
  }

  // ── salvar/editar um criativo ─────────────────────────────────────────────
  if (action === "salvar-criativo") {
    const linha: Record<string, unknown> = {
      mes: body.mes, semana: Number(body.semana) || 1,
      tema: (body.tema || "").trim() || null, titulo: (body.titulo || "").trim() || null, copy: (body.copy || "").trim() || null,
      midia_url: (body.midia_url || "").trim() || null, midia_tipo: body.midia_tipo === "video" ? "video" : "image", poster_url: (body.poster_url || "").trim() || null,
      investido: n(body.investido), cliques: Math.round(n(body.cliques)), cliques_todos: Math.round(n(body.cliques_todos) || n(body.cliques)),
      impressoes: Math.round(n(body.impressoes)), leads: Math.round(n(body.leads)),
      origem: "manual", atualizado_em: new Date().toISOString(),
    };
    if (body.id) { const { error } = await s.from("trafego_criativos").update(linha).eq("id", body.id); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); }
    else { const { error } = await s.from("trafego_criativos").insert(linha); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  // ── apagar um criativo ────────────────────────────────────────────────────
  if (action === "apagar-criativo" && body.id) {
    await s.from("trafego_criativos").delete().eq("id", body.id);
    return NextResponse.json({ ok: true });
  }

  // ── puxar criativos (anúncios) da Meta, por semana ────────────────────────
  if (action === "sync-meta-criativos" && body.mes) {
    const cfg = await lerConfig(s);
    const token = cfg.metaToken.trim();
    let acct = cfg.metaAdAccount.trim();
    if (!token || !acct) return NextResponse.json({ error: "Configure o token e o ID da conta de anúncios da Meta primeiro." }, { status: 400 });
    if (!acct.startsWith("act_")) acct = "act_" + acct.replace(/^act_/, "");

    const semanas: number[] = body.mesInteiro ? listaSemanas(body.mes) : [Number(body.semana) || 1];
    const hoje = new Date();
    let total = 0;
    const erros: string[] = [];
    type Ad = { id: string; name?: string; campaign?: { name?: string }; creative?: { thumbnail_url?: string; object_type?: string; body?: string; title?: string }; insights?: { data?: { spend?: string; impressions?: string; inline_link_clicks?: string; clicks?: string; actions?: { action_type: string; value: string }[] }[] } };

    for (const semana of semanas) {
      const { since, until: untilRaw } = weekRange(body.mes, semana);
      if (new Date(since) > hoje) continue;
      const until = new Date(untilRaw) > hoje ? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}` : untilRaw;
      const fields = `name,campaign{name},creative{thumbnail_url,object_type,body,title},insights.time_range({"since":"${since}","until":"${until}"}){spend,impressions,inline_link_clicks,clicks,actions}`;
      const url2 = `https://graph.facebook.com/v21.0/${acct}/ads?fields=${encodeURIComponent(fields)}&limit=200&access_token=${encodeURIComponent(token)}`;
      try {
        const r = await fetch(url2, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j.error) { erros.push(`S${semana}: ${j.error?.message || r.status}`); continue; }
        const ads: Ad[] = j.data ?? [];
        let pos = 0;
        for (const ad of ads) {
          const ins = ad.insights?.data?.[0];
          if (!ins || (Number(ins.impressions) || 0) === 0) continue;   // só anúncios que rodaram na semana
          const registro = {
            mes: body.mes, semana, meta_ad_id: ad.id,
            tema: ad.campaign?.name || null, titulo: ad.creative?.title || ad.name || "Anúncio", copy: ad.creative?.body || null,
            midia_url: ad.creative?.thumbnail_url || null, midia_tipo: "image", origem: "meta",
            investido: Math.round((Number(ins.spend) || 0) * 100) / 100,
            cliques: Math.round(Number(ins.inline_link_clicks) || 0), cliques_todos: Math.round(Number(ins.clicks) || 0),
            impressoes: Math.round(Number(ins.impressions) || 0), leads: extrairLeads(ins.actions),
            posicao: pos++, atualizado_em: new Date().toISOString(),
          };
          const { error } = await s.from("trafego_criativos").upsert(registro, { onConflict: "mes,semana,meta_ad_id" });
          if (!error) total++;
        }
      } catch (e) { erros.push(`S${semana}: ${(e as Error).message}`); }
    }
    if (total === 0 && erros.length) return NextResponse.json({ error: erros.join(" · ") }, { status: 502 });
    return NextResponse.json({ ok: true, criativos: total, semanas: semanas.length, avisos: erros });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

export type { Resultado };
