create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  serial_number text not null default '',
  type text not null default 'A3',
  status text not null default 'disponivel' check (status in ('disponivel','em_uso','inativo')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  employee_name text not null,
  department text not null default '',
  purpose text not null default '',
  notes text,
  checkout_date timestamptz not null default now(),
  expected_return_date timestamptz not null,
  actual_return_date timestamptz,
  status text not null default 'em_uso' check (status in ('em_uso','devolvido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.certificates to authenticated;
grant select, insert, update, delete on public.loans to authenticated;
grant all on public.certificates to service_role;
grant all on public.loans to service_role;
alter table public.certificates enable row level security;
alter table public.loans enable row level security;
create policy "auth all certificates" on public.certificates for all to authenticated using (true) with check (true);
create policy "auth all loans" on public.loans for all to authenticated using (true) with check (true);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_cert_upd before update on public.certificates for each row execute function public.touch_updated_at();
create trigger t_loan_upd before update on public.loans for each row execute function public.touch_updated_at();

create or replace function public.loan_before() returns trigger language plpgsql set search_path = public as $$
begin
  if new.actual_return_date is not null then new.status := 'devolvido'; else new.status := 'em_uso'; end if;
  if tg_op = 'INSERT' and new.actual_return_date is null then
    if exists (select 1 from public.loans where certificate_id = new.certificate_id and actual_return_date is null) then
      raise exception 'Este certificado já está em uso.';
    end if;
    if exists (select 1 from public.certificates where id = new.certificate_id and status = 'inativo') then
      raise exception 'Este certificado está inativo.';
    end if;
  end if;
  return new;
end $$;
create trigger t_loan_before before insert or update on public.loans for each row execute function public.loan_before();

create or replace function public.loan_sync_cert() returns trigger language plpgsql set search_path = public as $$
declare cid uuid := coalesce(new.certificate_id, old.certificate_id);
begin
  update public.certificates c set status = case
    when exists (select 1 from public.loans l where l.certificate_id = cid and l.actual_return_date is null) then 'em_uso'
    when c.status = 'inativo' then 'inativo' else 'disponivel' end
  where c.id = cid;
  return null;
end $$;
create trigger t_loan_sync after insert or update or delete on public.loans for each row execute function public.loan_sync_cert();

alter publication supabase_realtime add table public.certificates;
alter publication supabase_realtime add table public.loans;

insert into public.certificates (id, name, serial_number, type, notes) values
 ('11111111-1111-1111-1111-111111111111','A3 Fiscal','SN-0001-FIS','e-CNPJ A3','Token principal do fiscal'),
 ('22222222-2222-2222-2222-222222222222','A3 RH','SN-0002-RH','e-CNPJ A3',null),
 ('33333333-3333-3333-3333-333333333333','A3 Financeiro','SN-0003-FIN','e-CPF A3',null);

insert into public.loans (certificate_id, employee_name, department, purpose, checkout_date, expected_return_date, actual_return_date) values
 ('11111111-1111-1111-1111-111111111111','Juliana Santos','Fiscal','Receita Federal', now()-interval '3 days 5 hours', now()-interval '3 days', now()-interval '2 days 23 hours'),
 ('22222222-2222-2222-2222-222222222222','Carlos Lima','Financeiro','Assinatura de documentos', now()-interval '2 days 4 hours', now()-interval '2 days', now()-interval '2 days 1 hour'),
 ('33333333-3333-3333-3333-333333333333','Rodrigo Alves','Financeiro','Emissão de NF-e', now()-interval '1 day', now()-interval '3 hours', null),
 ('11111111-1111-1111-1111-111111111111','Mariana Silva','Fiscal','Acesso ao e-CAC', now()-interval '2 hours', now()+interval '6 hours', null);