-- P2-C Storage hardening: agro-evidence upload contract
-- Purpose: restrict uploaded evidence files to safe MIME types and size.

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ],
  file_size_limit = 10485760
where id = 'agro-evidence';
