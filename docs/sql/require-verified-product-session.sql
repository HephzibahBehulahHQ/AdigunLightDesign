-- Product verification is required in addition to project ownership.
create policy projects_verified_lightdesign_session on adigunlightdesign.projects
as restrictive for all to authenticated
using ((select adigunlightdesign_private.has_verified_session()))
with check ((select adigunlightdesign_private.has_verified_session()));
