-- Real sign-in: hashed passwords and roles. Existing accounts have no password
-- and can't sign in until one is set (admin bootstrap or `npm run db:set-password`).
alter table users add column password_hash text;
alter table users add column role text not null default 'student' check (role in ('student', 'admin'));
create index users_role_idx on users(role);
