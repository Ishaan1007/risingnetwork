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
  // Universities
  { name: 'Punjab Agricultural University (PAU)', city: 'Patiala' },
  { name: 'Punjabi University', city: 'Patiala' },
  { name: 'Baba Farid University of Health Sciences', city: 'Patiala' },
  { name: 'Thapar Institute of Engineering and Technology', city: 'Patiala' },
  
  // Engineering Colleges
  { name: 'Aryabhatta College of Engineering and Technology', city: 'Patiala' },
  { name: 'CGC Landran (Chandigarh Group of Colleges)', city: 'Patiala' },
  { name: 'Malwa College of Engineering', city: 'Patiala' },
  { name: 'Global Institute of Engineering and Technology', city: 'Patiala' },
  
  // Medical Colleges
  { name: 'Patiala Medical College', city: 'Patiala' },
  { name: 'Sri Guru Nanak Dev Medical College', city: 'Patiala' },
  
  // Arts & Science Colleges
  { name: 'Mehta College', city: 'Patiala' },
  { name: 'Khalsa College', city: 'Patiala' },
  { name: 'DAV College', city: 'Patiala' },
  { name: 'Aryabhatta College', city: 'Patiala' },
  { name: 'Lyall Singh College', city: 'Patiala' },
  { name: 'Krishna College', city: 'Patiala' },
  { name: 'Shiv Shankar College', city: 'Patiala' },
  { name: 'St. James College', city: 'Patiala' },
  
  // Management/Commerce Colleges
  { name: 'Institute of Business Management, Patiala', city: 'Patiala' },
  { name: 'Patiala College of Commerce', city: 'Patiala' },
  
  // Other Colleges
  { name: 'Government College of Education', city: 'Patiala' },
  { name: 'Akal University', city: 'Patiala' },
  { name: 'Career Point University', city: 'Patiala' },
];

async function seedColleges() {
  console.log(`Seeding ${patialaColleges.length} colleges in Patiala...`);
  
  try {
    // Insert colleges
    const { data, error } = await supabase
      .from('colleges')
      .insert(patialaColleges)
      .select();

    if (error) {
      console.error('Error inserting colleges:', error);
      process.exit(1);
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
