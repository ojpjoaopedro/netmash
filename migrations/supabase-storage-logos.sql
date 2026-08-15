-- Cria o "cofre de imagens" (bucket) para as logomarcas das empresas.
-- Público para leitura (as logos aparecem no login e nos relatórios, sem exigir senha).
-- O upload é feito pelo servidor com a chave de serviço, então não precisa de policy extra.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;
