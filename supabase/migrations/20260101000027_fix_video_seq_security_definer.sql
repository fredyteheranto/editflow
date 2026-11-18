-- EditFlow — 0027: calcular seq global (sin RLS) y seguro ante concurrencia
--
-- El trigger set_video_seq() corría como SECURITY INVOKER, por lo que al
-- insertar un video como rol 'editor' solo veía sus propios videos
-- (policy videos_select_own) y recalculaba seq = 1..N chocando contra
-- la restricción UNIQUE (period_id, client_id, seq).

create or replace function set_video_seq() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.seq is null or new.seq = 0 then
    perform pg_advisory_xact_lock(
      hashtext(new.period_id::text || ':' || new.client_id::text)
    );
    select coalesce(max(seq), 0) + 1
      into new.seq
      from public.videos
     where period_id = new.period_id
       and client_id = new.client_id;
  end if;
  return new;
end;
$$;
