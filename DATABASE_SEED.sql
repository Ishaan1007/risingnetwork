-- SQL Script to seed Patiala colleges
-- Run this in Supabase SQL Editor (https://app.supabase.com > SQL Editor)
--
-- If ON CONFLICT fails, add a unique constraint first:
--   ALTER TABLE colleges ADD CONSTRAINT colleges_name_city_unique UNIQUE (name, city);

INSERT INTO colleges (name, city) VALUES
  ('Punjab Agricultural University (PAU)', 'Patiala'),
  ('Punjabi University', 'Patiala'),
  ('Baba Farid University of Health Sciences', 'Patiala'),
  ('Thapar Institute of Engineering and Technology', 'Patiala'),
  ('Aryabhatta College of Engineering and Technology', 'Patiala'),
  ('CGC Landran (Chandigarh Group of Colleges)', 'Patiala'),
  ('Malwa College of Engineering', 'Patiala'),
  ('Global Institute of Engineering and Technology', 'Patiala'),
  ('Patiala Medical College', 'Patiala'),
  ('Sri Guru Nanak Dev Medical College', 'Patiala'),
  ('Mehta College', 'Patiala'),
  ('Khalsa College', 'Patiala'),
  ('DAV College', 'Patiala'),
  ('Aryabhatta College', 'Patiala'),
  ('Lyall Singh College', 'Patiala'),
  ('Krishna College', 'Patiala'),
  ('Shiv Shankar College', 'Patiala'),
  ('St. James College', 'Patiala'),
  ('Institute of Business Management, Patiala', 'Patiala'),
  ('Patiala College of Commerce', 'Patiala'),
  ('Government College of Education', 'Patiala'),
  ('Akal University', 'Patiala'),
  ('Career Point University', 'Patiala')
ON CONFLICT (name, city) DO NOTHING;
