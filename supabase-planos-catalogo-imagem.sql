-- Adiciona a coluna de imagem (data URL / base64) aos produtos do catálogo.
-- Rodar 1x no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
alter table public.planos_catalogo
  add column if not exists imagem text;
