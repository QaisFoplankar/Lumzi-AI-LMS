-- KonkanTech LMS core schema. Plain PostgreSQL (tested on PGlite locally; runs on Neon as-is).

create table users (
  id           integer generated always as identity primary key,
  email        text not null unique check (email = lower(email) and email like '%@%'),
  name         text not null check (length(name) between 1 and 80),
  pref_email   boolean not null default true,
  pref_remind  boolean not null default true,
  last_course_id text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Opaque session tokens; only the SHA-256 hash is stored.
create table sessions (
  token_hash  text primary key,
  user_id     integer not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index sessions_user_idx on sessions(user_id);
create index sessions_expires_idx on sessions(expires_at);

-- KonkanTech courses (editable in Studio) and partner courses (fixed catalog).
create table courses (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title       text not null check (length(title) between 1 and 160),
  description text not null default '',
  status      text not null default 'draft' check (status in ('draft', 'published')),
  abbr        text not null default '',
  color       text not null default '#12128F',
  subject     text not null default 'Computer Science',
  level       text not null default 'Beginner',
  is_new      boolean not null default false,
  is_partner  boolean not null default false,
  org         text,             -- partner institution
  kind        text,             -- Course / Certificate / Executive Ed / Degree
  duration    text,
  meta        jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index courses_sort_idx on courses(is_partner, sort_order);

alter table users add constraint users_last_course_fk
  foreign key (last_course_id) references courses(id) on delete set null;

create table lessons (
  id         integer generated always as identity primary key,
  course_id  text not null references courses(id) on delete cascade,
  position   integer not null check (position >= 0),
  title      text not null check (length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  constraint lessons_course_position_uq unique (course_id, position) deferrable initially deferred
);

create table enrollments (
  user_id      integer not null references users(id) on delete cascade,
  course_id    text not null references courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at date,
  primary key (user_id, course_id)
);
create index enrollments_course_idx on enrollments(course_id);

-- One row per finished lesson. Keyed by lesson id, so reordering or deleting
-- other lessons never shifts a learner's progress.
create table lesson_progress (
  user_id      integer not null,
  course_id    text not null,
  lesson_id    integer not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  foreign key (user_id, course_id) references enrollments(user_id, course_id) on delete cascade
);
create index lesson_progress_enrollment_idx on lesson_progress(user_id, course_id);
