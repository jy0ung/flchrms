-- Provision leave-documents storage bucket (policies already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-documents', 'leave-documents', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;
