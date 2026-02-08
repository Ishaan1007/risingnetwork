-- SQL Script to seed Punjab universities (India)
-- Run this in Supabase SQL Editor (https://app.supabase.com > SQL Editor)
--
-- If ON CONFLICT fails, add a unique constraint first:
--   ALTER TABLE colleges ADD CONSTRAINT colleges_name_unique UNIQUE (name);

INSERT INTO colleges (name, city) VALUES
  ('Central University of Punjab', 'Bathinda'),
  ('Panjab University', 'Chandigarh'),
  ('Baba Farid University of Health Sciences', 'Faridkot'),
  ('Guru Angad Dev Veterinary and Animal Sciences University', 'Ludhiana'),
  ('Guru Nanak Dev University', 'Amritsar'),
  ('Guru Ravidas Ayurved University', 'Hoshiarpur'),
  ('I. K. Gujral Punjab Technical University', 'Jalandhar'),
  ('Jagat Guru Nanak Dev Punjab State Open University', 'Patiala'),
  ('Maharaja Ranjit Singh Punjab Technical University', 'Bathinda'),
  ('Punjab Agricultural University', 'Ludhiana'),
  ('Punjab Sports University', 'Patiala'),
  ('Punjabi University', 'Patiala'),
  ('Rajiv Gandhi National University of Law', 'Patiala'),
  ('Sardar Beant Singh State University', 'Gurdaspur'),
  ('Shaheed Bhagat Singh State University', 'Ferozepur'),
  ('Sri Guru Teg Bahadur State University of Law', 'Tarn Taran'),
  ('Adesh University', 'Bathinda'),
  ('Akal University', 'Talwandi Sabo'),
  ('Amity University, Punjab', 'Mohali'),
  ('Chitkara University, Punjab', 'Rajpura'),
  ('Chandigarh University', 'Gharuan'),
  ('CT University, Punjab', 'Ludhiana'),
  ('DAV University', 'Jalandhar'),
  ('Desh Bhagat University', 'Mandi Gobindgarh'),
  ('GNA University', 'Kapurthala'),
  ('Guru Kashi University', 'Talwandi Sabo'),
  ('Lamrin Tech Skills University', 'Chandigarh'),
  ('Lovely Professional University', 'Phagwara'),
  ('Plaksha University', 'Mohali'),
  ('Rayat-Bahra University', 'Sahauran'),
  ('RIMT University', 'Mandi Gobindgarh'),
  ('Sant Baba Bhag Singh University', 'Jalandhar'),
  ('Sri Guru Granth Sahib World University', 'Fatehgarh Sahib'),
  ('Sri Guru Ram Das University of Health Sciences', 'Amritsar'),
  ('Punjab Engineering College (Deemed to be University)', 'Chandigarh'),
  ('Sant Longowal Institute of Engineering and Technology', 'Longowal'),
  ('Thapar Institute of Engineering and Technology', 'Patiala')
ON CONFLICT (name) DO NOTHING;
