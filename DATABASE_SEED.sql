-- SQL Script to seed Punjab universities (India)
-- Run this in Supabase SQL Editor (https://app.supabase.com > SQL Editor)
--
-- If ON CONFLICT fails, add a unique constraint first:
--   ALTER TABLE colleges ADD CONSTRAINT colleges_name_unique UNIQUE (name);

INSERT INTO colleges (name, city) VALUES
  ('Punjabi University, Patiala', 'Patiala'),
  ('Thapar Institute of Engineering & Technology', 'Patiala'),
  ('Chitkara University', 'Rajpura'),
  ('CGC University, Mohali', 'Mohali'),
  ('Chandigarh University', 'Gharuan'),
  ('Chandigarh Group of Colleges, Landran', 'Landran'),
  ('Panjab University', 'Chandigarh'),
  ('Punjab Engineering College (Deemed to be University)', 'Chandigarh'),
  ('Lovely Professional University', 'Phagwara'),
  ('Amity University Punjab', 'Mohali'),
  ('Indian Institute of Technology Ropar', 'Rupnagar')
ON CONFLICT (name) DO NOTHING;

-- Seed skills (add missing ones)
INSERT INTO skills (name, category) VALUES
  ('Content Creation', 'Creative'),
  ('Video Editing', 'Creative'),
  ('Photography', 'Creative'),
  ('Graphic Design', 'Creative'),
  ('UI Design', 'Design'),
  ('UX Research', 'Design'),
  ('Figma', 'Design Tools'),
  ('Adobe Photoshop', 'Design Tools'),
  ('Adobe Premiere Pro', 'Design Tools'),
  ('Adobe After Effects', 'Design Tools'),
  ('Canva', 'Design Tools'),
  ('Social Media Marketing', 'Marketing'),
  ('SEO', 'Marketing'),
  ('Copywriting', 'Marketing'),
  ('Brand Strategy', 'Marketing'),
  ('PHP', 'Backend'),
  ('MySQL', 'Database'),
  ('PostgreSQL', 'Database'),
  ('SQLite', 'Database'),
  ('MongoDB', 'Database'),
  ('Redis', 'Database'),
  ('Node.js', 'Backend'),
  ('Express.js', 'Backend'),
  ('REST APIs', 'Backend'),
  ('GraphQL', 'Backend'),
  ('Python', 'Programming'),
  ('Java', 'Programming'),
  ('C++', 'Programming'),
  ('JavaScript', 'Programming'),
  ('TypeScript', 'Programming'),
  ('React', 'Frontend'),
  ('Next.js', 'Frontend'),
  ('HTML', 'Frontend'),
  ('CSS', 'Frontend'),
  ('Tailwind CSS', 'Frontend'),
  ('Git', 'Tools'),
  ('Docker', 'Tools'),
  ('AWS', 'Cloud'),
  ('Firebase', 'Cloud'),
  ('Supabase', 'Cloud'),
  ('Data Analysis', 'Data'),
  ('Excel', 'Data'),
  ('Power BI', 'Data'),
  ('Project Management', 'Operations'),
  ('Product Management', 'Operations'),
  ('Business Analysis', 'Operations')
ON CONFLICT (name) DO NOTHING;
