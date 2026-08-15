-- ============================================================================
-- Libera a LEITURA da tabela de produtos (planos_catalogo) para o painel do
-- cliente. Sem isso, o cliente não enxerga as imagens nem os links de checkout
-- (cai no catálogo de reserva e o botão "Ativar" vai pro WhatsApp).
--
-- É seguro: são dados públicos de catálogo (nome, preço, imagem, link, selo).
-- A ESCRITA continua restrita ao Admin (que usa a service key e ignora o RLS).
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
alter table public.planos_catalogo enable row level security;

drop policy if exists "planos_catalogo_leitura_publica" on public.planos_catalogo;

create policy "planos_catalogo_leitura_publica"
  on public.planos_catalogo
  for select
  to anon, authenticated
  using (true);
