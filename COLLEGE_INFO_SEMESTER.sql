-- Add semester to college_info for student profiles
alter table college_info
  add column if not exists semester int4;
