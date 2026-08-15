-- =====================================================================
-- LOCALIZAÇÃO no consentimento LGPD — Minhas Métricas
-- Rode UMA vez no Supabase -> SQL Editor -> Run.
-- Guarda a localização aproximada (cidade/estado/país pelo IP) de cada
-- aceite da LGPD, para o registro de auditoria ficar mais completo.
-- Enquanto não rodar, o app continua funcionando (grava o aceite sem a
-- localização). Depois de rodar, os novos aceites já trazem a localização.
-- =====================================================================

alter table public.lgpd_consentimentos
  add column if not exists localizacao text;
