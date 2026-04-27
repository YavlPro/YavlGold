-- P2-B1 RPC grants hardening
-- Purpose: restrict active Agro RPC execution to authenticated users.

begin;

revoke all on function public.agro_rank_top_clients(date, date, integer, uuid) from public;
grant execute on function public.agro_rank_top_clients(date, date, integer, uuid) to authenticated;

revoke all on function public.agro_rank_pending_clients(date, date, integer, uuid) from public;
grant execute on function public.agro_rank_pending_clients(date, date, integer, uuid) to authenticated;

revoke all on function public.agro_buyer_portfolio_summary_v1() from public;
grant execute on function public.agro_buyer_portfolio_summary_v1() to authenticated;

revoke all on function public.agro_delete_buyer_cascade_v1(uuid) from public;
grant execute on function public.agro_delete_buyer_cascade_v1(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
