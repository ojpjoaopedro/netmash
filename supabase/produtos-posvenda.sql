-- ============================================================
-- PÓS-VENDA por produto (mensagem + botão na tela de sucesso)
-- Rodar no SQL Editor do Supabase.
-- ============================================================
alter table produtos add column if not exists pos_venda_msg text;
alter table produtos add column if not exists pos_venda_btn_texto text;
alter table produtos add column if not exists pos_venda_btn_link text;

notify pgrst, 'reload schema';
