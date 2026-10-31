-- Um documento por usuário, com o objeto Dados inteiro (src/storage/tipos.ts).
create table public.documentos (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null,
  versao bigint not null default 1,
  atualizado_em timestamptz not null default now()
);

alter table public.documentos enable row level security;

-- Só para authenticated: anon não tem política nenhuma.
create policy "documentos: selecionar o proprio"
  on public.documentos for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "documentos: inserir o proprio"
  on public.documentos for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "documentos: atualizar o proprio"
  on public.documentos for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "documentos: apagar o proprio"
  on public.documentos for delete
  to authenticated
  using (usuario_id = (select auth.uid()));

create function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger documentos_tocar_atualizado_em
  before update on public.documentos
  for each row
  execute function public.tocar_atualizado_em();

-- Acesso automático que mantém o projeto ativo no plano Free. Não toca em nenhuma tabela.
create function public.manter_ativo()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.manter_ativo() from public;
grant execute on function public.manter_ativo() to anon;
