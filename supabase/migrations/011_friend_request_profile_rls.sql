-- Allow recipients to read requester profiles for pending friend requests

create policy profiles_select_pending_requesters on public.profiles
  for select using (
    exists (
      select 1
      from public.friend_requests fr
      where fr.requester_id = profiles.id
        and fr.status = 'pending'
        and (
          fr.recipient_id = auth.uid()
          or (
            fr.recipient_id is null
            and lower(fr.recipient_email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );
