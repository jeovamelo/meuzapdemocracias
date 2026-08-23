-- Configurar fuso horário padrão do PostgreSQL para America/Fortaleza (UTC-3)
ALTER DATABASE postgres SET timezone TO 'America/Fortaleza';
ALTER ROLE postgres SET timezone TO 'America/Fortaleza';
ALTER ROLE anon SET timezone TO 'America/Fortaleza';
ALTER ROLE authenticated SET timezone TO 'America/Fortaleza';
ALTER ROLE service_role SET timezone TO 'America/Fortaleza';
ALTER ROLE ALL SET timezone TO 'America/Fortaleza';

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
