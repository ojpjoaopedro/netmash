-- ============================================================================
-- Link de pagamento (checkout) dos produtos.
-- Adiciona a coluna e já preenche os links atuais.
-- Rodar UMA vez no SQL Editor do Supabase (projeto gaormginkujgisardsjk).
-- ============================================================================
alter table public.planos_catalogo
  add column if not exists link_pagamento text;

-- Links dos módulos do catálogo
update public.planos_catalogo
  set link_pagamento = 'https://checkout.wiven.com.br/checkout/cmsqc3ofh043201q4pfjaivjw?offer=NA6I8Q5'
  where chave = 'folha';

update public.planos_catalogo
  set link_pagamento = 'https://checkout.wiven.com.br/checkout/cmsqcj9gu04hy01q4yhgqjtn4?offer=XJZ3HJV'
  where chave = 'acesso2';

-- Link do Super Admin (plano base, guardado no app_kv)
insert into public.app_kv (chave, valor)
  values ('link_superadmin', 'https://checkout.wiven.com.br/checkout/cmsqaomtj02qo01q4pq9l1fjq?offer=LY7PZUS')
  on conflict (chave) do update set valor = excluded.valor;
