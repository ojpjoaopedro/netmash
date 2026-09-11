-- ============================================================================
-- Gestão à Vista: galeria de criativos (anúncios) do Tráfego Pago. Cada linha é
-- um criativo de uma semana, com mídia (imagem/vídeo), copy e o resultado dele.
-- Preenchido à mão ou puxado da Meta (level=ad). Só o servidor (service key) acessa.
-- Roda UMA vez no SQL Editor do Supabase (gaormginkujgisardsjk).
-- ============================================================================
create table if not exists public.trafego_criativos (
  id             uuid primary key default gen_random_uuid(),
  mes            text     not null,               -- 'YYYY-MM'
  semana         smallint not null,               -- 1..5
  tema           text,                            -- campanha / tema
  titulo         text,
  copy           text,
  midia_url      text,
  midia_tipo     text     not null default 'image',   -- 'image' | 'video'
  poster_url     text,
  meta_ad_id     text,
  origem         text     not null default 'manual',  -- 'manual' | 'meta'
  investido      numeric  not null default 0,
  cliques        integer  not null default 0,     -- cliques no link
  cliques_todos  integer  not null default 0,     -- todos os cliques
  impressoes     bigint   not null default 0,
  leads          integer  not null default 0,
  posicao        integer  not null default 0,
  atualizado_em  timestamptz not null default now(),
  unique (mes, semana, meta_ad_id)                -- Meta: upsert por anúncio; manual: meta_ad_id nulo (não conflita)
);

create index if not exists idx_trafego_criativos_mes on public.trafego_criativos (mes);

alter table public.trafego_criativos enable row level security;
-- Nenhuma policy: só o servidor (service key) lê e grava.

-- Cofre de mídia dos criativos (imagens; público para leitura na galeria).
insert into storage.buckets (id, name, public)
values ('criativos', 'criativos', true)
on conflict (id) do update set public = true;
