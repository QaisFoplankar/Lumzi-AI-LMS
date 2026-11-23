-- Modules, lesson content blocks (reading, embed, quiz, assignment), quiz questions,
-- quiz attempts and assignment submissions.

create table modules (
  id         integer generated always as identity primary key,
  course_id  text not null references courses(id) on delete cascade,
  position   integer not null check (position >= 0),
  title      text not null check (length(title) between 1 and 160),
  created_at timestamptz not null default now(),
  constraint modules_course_position_uq unique (course_id, position) deferrable initially deferred
);

-- Every existing course gets a "Home" module holding its current lessons.
insert into modules (course_id, position, title) select id, 0, 'Home' from courses;

alter table lessons add column module_id integer references modules(id) on delete cascade;
update lessons l set module_id = m.id from modules m where m.course_id = l.course_id;
alter table lessons alter column module_id set not null;
alter table lessons drop constraint lessons_course_position_uq;
alter table lessons add constraint lessons_module_position_uq unique (module_id, position) deferrable initially deferred;
create index lessons_course_idx on lessons(course_id);

-- Lessons in reading order across the whole course; idx is the 0-based lesson number.
create view course_lessons as
  select l.id, l.course_id, l.module_id, l.position, l.title, m.position as module_position,
         (row_number() over (partition by l.course_id order by m.position, l.position) - 1)::int as idx
    from lessons l join modules m on m.id = l.module_id;

-- Content inside a lesson. body depends on kind:
--   reading    {text}
--   embed      {url, caption}
--   quiz       {title, passPct}
--   assignment {title, instructions}
create table lesson_blocks (
  id         integer generated always as identity primary key,
  lesson_id  integer not null references lessons(id) on delete cascade,
  position   integer not null check (position >= 0),
  kind       text not null check (kind in ('reading', 'embed', 'quiz', 'assignment')),
  body       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_blocks_lesson_position_uq unique (lesson_id, position) deferrable initially deferred
);

-- Quiz questions. data depends on type:
--   mcq    {options:[text], answers:[index]}            one or more correct options
--   blanks {blanks:[{options:[text], answer:index}]}    prompt has one "___" per blank ("choose the correct")
--   tf     {answer:true|false}
--   match  {pairs:[{left, right}]}
--   order  {items:[text]}                               stored in the correct order
--   short  {answers:[text], caseSensitive:bool}         any accepted answer counts
create table quiz_questions (
  id         integer generated always as identity primary key,
  block_id   integer not null references lesson_blocks(id) on delete cascade,
  position   integer not null check (position >= 0),
  type       text not null check (type in ('mcq', 'blanks', 'tf', 'match', 'order', 'short')),
  prompt     text not null check (length(prompt) between 1 and 2000),
  points     integer not null default 1 check (points between 1 and 100),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_block_position_uq unique (block_id, position) deferrable initially deferred
);

create table quiz_attempts (
  id         integer generated always as identity primary key,
  user_id    integer not null references users(id) on delete cascade,
  block_id   integer not null references lesson_blocks(id) on delete cascade,
  answers    jsonb not null,
  score      numeric(8,2) not null,
  max_score  numeric(8,2) not null,
  passed     boolean not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_block_idx on quiz_attempts(user_id, block_id, created_at desc);

create table assignment_submissions (
  user_id      integer not null references users(id) on delete cascade,
  block_id     integer not null references lesson_blocks(id) on delete cascade,
  text         text not null default '',
  url          text not null default '',
  submitted_at timestamptz not null default now(),
  primary key (user_id, block_id)
);
