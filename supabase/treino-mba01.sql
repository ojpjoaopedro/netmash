-- ============================================================
-- TREINO DA AULA DE MBA — cada empresa tem seu link e seus dados
-- Rodar no SQL Editor do Supabase.
-- ============================================================

create table if not exists treino_mba01 (
  slug text primary key,                              -- o que vai na URL: /treino-mba01/<slug>
  empresa text not null,                              -- como a pessoa escreveu
  dados jsonb not null default '{}'::jsonb,           -- o exercício inteiro
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Lista do professor: quem cadastrou primeiro aparece primeiro.
create index if not exists treino_mba01_criado_em_idx on treino_mba01 (criado_em desc);

-- RLS ligado e SEM policy: ninguém acessa a tabela direto pelo anon key.
-- Quem lê/escreve é o servidor, com a service key, pelas rotas /api/treino-mba01.
alter table treino_mba01 enable row level security;

notify pgrst, 'reload schema';
