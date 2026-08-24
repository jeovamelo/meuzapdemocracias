-- Criar bucket público de fotos de candidatos no Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('candidatos-fotos', 'candidatos-fotos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acesso público para o bucket candidatos-fotos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Read candidatos-fotos') THEN
    CREATE POLICY "Public Read candidatos-fotos" ON storage.objects FOR SELECT USING (bucket_id = 'candidatos-fotos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Insert candidatos-fotos') THEN
    CREATE POLICY "Public Insert candidatos-fotos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'candidatos-fotos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Update candidatos-fotos') THEN
    CREATE POLICY "Public Update candidatos-fotos" ON storage.objects FOR UPDATE USING (bucket_id = 'candidatos-fotos');
  END IF;
END $$;
