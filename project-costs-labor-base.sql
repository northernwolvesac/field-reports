-- Reviewed labor base on project_costs (2026-10-20).
-- On 10/20 the office wrote the reviewed WIP labor into project_costs.labor_spent on 48 projects (source 'wip-review'):
-- app labor through 9/28, labor before Mason or the owner's estimate, so often more than Mason's 2026 payroll.
-- labor-import.html keeps that figure as labor_base and adds only Mason payrolls dated after labor_base_through;
-- rows with no base keep the old rule (labor_spent = all Mason payroll). Run this before the next Mason payroll import.
alter table public.project_costs add column if not exists labor_base numeric(12,2);
alter table public.project_costs add column if not exists labor_base_through date;
comment on column public.project_costs.labor_base is 'Reviewed labor to date (WIP review); NULL = labor_spent is Mason payroll only';
comment on column public.project_costs.labor_base_through is 'Mason payrolls dated on or before this day are already inside labor_base';

-- the review rows as they are now: labor_spent is still the reviewed figure (no import has run since 10/20)
update public.project_costs
   set labor_base = labor_spent, labor_base_through = date '2026-09-28'
 where source = 'wip-review' and labor_base is null;

select count(*) as rows_with_base, sum(labor_base) as labor_base_total, min(labor_base_through) as through
  from public.project_costs where labor_base is not null;
