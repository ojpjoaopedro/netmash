-- ============================================================
-- QUIZ DA AULA DE MBA — votação ao vivo (SIM / NÃO)
-- Rodar no SQL Editor do Supabase.
-- ============================================================

create table if not exists quiz_mba01 (
  id text primary key,                               -- id da pergunta
  sim integer not null default 0,
  nao integer not null default 0,
  atualizado_em timestamptz not null default now()
);

-- A turma inteira vota ao mesmo tempo. Ler-somar-gravar na aplicação perderia
-- votos (duas requisições leem 10, as duas gravam 11). Este RPC soma dentro do
-- banco, numa operação só — nenhum voto se perde.
create or replace function votar_mba01(p_id text, p_voto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_voto not in ('sim', 'nao') then
    raise exception 'voto deve ser sim ou nao';
  end if;

  insert into quiz_mba01 (id, sim, nao)
  values (
    p_id,
    case when p_voto = 'sim' then 1 else 0 end,
    case when p_voto = 'nao' then 1 else 0 end
  )
  on conflict (id) do update set
    sim = quiz_mba01.sim + case when p_voto = 'sim' then 1 else 0 end,
    nao = quiz_mba01.nao + case when p_voto = 'nao' then 1 else 0 end,
    atualizado_em = now();
end;
$$;

-- RLS ligado e SEM policy: ninguém acessa a tabela direto pelo anon key.
-- Quem escreve/lê é o servidor, com a service key, pelas rotas /api/quiz-mba01.
alter table quiz_mba01 enable row level security;

-- cria a linha da pergunta desta aula
insert into quiz_mba01 (id) values ('meta_tem_plano')
on conflict (id) do nothing;
