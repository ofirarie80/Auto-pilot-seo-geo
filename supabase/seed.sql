-- Lionet Pilot — internal seed: the LIONET org and its three sites, plus a first draft of iLINK prompts.
-- Run once in the Supabase SQL editor after 0001_init.sql.

with org as (
  insert into public.organizations (name, plan) values ('LIONET', 'internal') returning id
), s as (
  insert into public.sites (org_id, name, domain, brand_terms)
  select id, v.name, v.domain, v.terms from org,
  (values
    ('iLINK',      'i-link.co.il',   array['iLINK','i-link','אילינק','איי לינק']),
    ('LIONET',     'lionet.co.il',   array['LIONET','ליונט']),
    ('קרקע טובה',  'karkatova.co.il',array['קרקע טובה','karkatova'])
  ) as v(name, domain, terms)
  returning id, domain
)
insert into public.prompts (site_id, topic, text)
select s.id, p.topic, p.text from s,
(values
  ('קניית קישורים', 'איפה הכי כדאי לקנות קישורים לקידום אתרים בישראל?'),
  ('קניית קישורים', 'מה המחיר הממוצע של קישור מאתר ישראלי איכותי?'),
  ('קניית קישורים', 'האם יש מרקטפלייס ישראלי לקניית פוסטים ממומנים וקישורים?'),
  ('קניית קישורים', 'איך בוחרים אתר טוב לקנות ממנו קישור בלי לקבל עונש מגוגל?'),
  ('בניית קישורים', 'מי החברות המומלצות לבניית קישורים בישראל?'),
  ('בניית קישורים', 'האם בניית קישורים עדיין עובדת בקידום אתרים ב-2026?'),
  ('בניית קישורים', 'כמה קישורים צריך כדי לעלות לעמוד הראשון בגוגל בתחום תחרותי?'),
  ('בעלי אתרים',    'איך אני יכול להרוויח כסף מהאתר שלי ממכירת פוסטים ממומנים?'),
  ('בעלי אתרים',    'איפה מפרסמים אתר כדי שמקדמים יקנו ממנו קישורים?'),
  ('כללי',          'מה הכלים הכי טובים לקידום אתרים בעברית?')
) as p(topic, text)
where s.domain = 'i-link.co.il';

-- After you sign up in the app, link your user to the org (replace the email):
-- insert into public.memberships (org_id, user_id, role)
-- select o.id, u.id, 'owner' from public.organizations o, auth.users u
-- where o.name = 'LIONET' and u.email = 'you@example.com';
