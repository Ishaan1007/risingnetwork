/**
 * Seed script for Patiala colleges
 * Run with: node scripts/seed-patiala-colleges.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patialaColleges = [
  { name: 'Punjabi University, Patiala', city: 'Patiala' },
  { name: 'Thapar Institute of Engineering & Technology', city: 'Patiala' },
  { name: 'Chitkara University', city: 'Rajpura' },
  { name: 'CGC University, Mohali', city: 'Mohali' },
  { name: 'Chandigarh University', city: 'Gharuan' },
  { name: 'Chandigarh Group of Colleges, Landran', city: 'Landran' },
  { name: 'Panjab University', city: 'Chandigarh' },
  { name: 'Punjab Engineering College (Deemed to be University)', city: 'Chandigarh' },
  { name: 'Lovely Professional University', city: 'Phagwara' },
  { name: 'Amity University Punjab', city: 'Mohali' },
  { name: 'Indian Institute of Technology Ropar', city: 'Rupnagar' },
];

async function seedColleges() {
  console.log(`Seeding ${patialaColleges.length} colleges in Patiala...`);
  
  try {
    // Upsert colleges - skips duplicates if unique(name) or unique(name,city) exists
    const { data, error } = await supabase
      .from('colleges')
      .upsert(patialaColleges, {
        onConflict: 'name',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      // Fallback: try insert if upsert fails (e.g. no unique constraint)
      const { data: insertData, error: insertError } = await supabase
        .from('colleges')
        .insert(patialaColleges)
        .select();
      if (insertError) {
        console.error('Error inserting colleges:', insertError);
        process.exit(1);
      }
      console.log(`✅ Successfully seeded ${insertData?.length || 0} colleges!`);
      insertData?.slice(0, 5).forEach((college) => {
        console.log(`  - ${college.name} (${college.city})`);
      });
      return;
    }

    console.log(`✅ Successfully seeded ${data?.length || 0} colleges!`);
    console.log('Sample colleges:');
    data?.slice(0, 5).forEach((college) => {
      console.log(`  - ${college.name} (${college.city})`);
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

seedColleges();
