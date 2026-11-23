-- Rebrand: KonkanTech indigo -> Lumzi cobalt, and brand name in course copy.
alter table courses alter column color set default '#2D5BD6';
update courses set color = '#2D5BD6', updated_at = now() where upper(color) = '#12128F';
update courses set description = replace(description, 'KonkanTech', 'Lumzi'), updated_at = now() where description like '%KonkanTech%';
