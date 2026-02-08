# Patiala College Data Seeding Guide

## What's Been Updated

### 1. ✅ Save Profile Feedback Message
- **File Modified**: `/pages/profile.tsx`
- **Change**: Added auto-dismissing success messages
  - Success message now appears for 3 seconds, then automatically disappears
  - Shows "Profile updated successfully!" when you save
  - Avatar upload success message also auto-dismisses
  - Error messages persist so you can read them

### 2. ✅ College Seed Script Created
- **File Created**: `/scripts/seed-patiala-colleges.js`
- **Package Updated**: `package.json` now includes `dotenv` dependency
- **NPM Script Added**: `npm run seed:patiala-colleges`

---

## How to Seed Patiala Colleges

### Method 1: Using SQL in Supabase Dashboard (Recommended - Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `DATABASE_SEED.sql` from this project
5. Click **Run** button
6. You'll see: "✅ 23 rows inserted"

**SQL File Location**: `DATABASE_SEED.sql` in the project root

---

### Method 2: Using Node Script (If Network is Available)

**Prerequisites**:
- Ensure `.env.local` has valid `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- You have internet connectivity

**Steps**:
```bash
# Install dotenv if not already installed
npm install dotenv

# Run the seed script
npm run seed:patiala-colleges
```

**Expected Output**:
```
Seeding 23 colleges in Patiala...
✅ Successfully seeded 23 colleges!
Sample colleges:
  - Akal University (Patiala)
  - Aryabhatta College (Patiala)
  - Aryabhatta College of Engineering and Technology (Patiala)
...
```

---

## Colleges Being Seeded

Total: **23 institutions**

### Major Universities:
- Punjab Agricultural University (PAU)
- Punjabi University
- Baba Farid University of Health Sciences
- Thapar Institute of Engineering and Technology

### Engineering Colleges:
- Aryabhatta College of Engineering and Technology
- CGC Landran
- Malwa College of Engineering
- Global Institute of Engineering and Technology

### Medical Colleges:
- Patiala Medical College
- Sri Guru Nanak Dev Medical College

### Arts, Science & Commerce:
- Mehta College
- Khalsa College
- DAV College
- Lyall Singh College
- Krishna College
- Shiv Shankar College
- St. James College
- Institute of Business Management
- Patiala College of Commerce

### Other:
- Government College of Education
- Akal University
- Career Point University

---

## Testing the Changes

### Test 1: Save Profile Message
1. Run `npm run dev`
2. Go to Profile page
3. Edit any field (name, bio, city, skills, etc.)
4. Click **Save Profile**
5. ✅ You should see a green success message "Profile updated successfully!" for 3 seconds
6. ✅ Message should disappear automatically

### Test 2: Avatar Upload Message
1. On Profile page, upload an avatar image
2. ✅ You should see success message "Avatar uploaded." for 3 seconds
3. ✅ Message should disappear automatically

### Test 3: College Dropdown
1. Sign in as a student (role = "student")
2. Go to Profile page
3. ✅ You should see a **College** dropdown with 23 colleges listed
4. Select a college (e.g., "Punjab Agricultural University (PAU)")
5. Fill in Major and Graduation Year
6. Click **Save Profile**
7. ✅ Success message appears and disappears
8. ✅ Your college info is saved and will appear in team pages

---

## Troubleshooting

### Issue: "College dropdown is empty"
**Solution**: The colleges haven't been seeded yet. Use Method 1 (SQL) or Method 2 (Node script) above.

### Issue: "Script error: Cannot find module 'dotenv'"
**Solution**: Run `npm install dotenv`

### Issue: "Network timeout when running seed script"
**Solution**: Use Method 1 (SQL in Supabase dashboard) instead - it's more reliable

### Issue: "Success message not appearing"
**Solution**: 
- Clear cache: Press `Ctrl+Shift+R` in browser
- Ensure you're on the latest code by running `npm run dev` again

---

## Next Steps

Once colleges are seeded and messages are working:

1. **Test Profile Completion**: Go to home page, select "Student" role, your profile completion should update when you add college info
2. **Test Team Creation**: Create a team as a student - you should now see it in the Teams page
3. **Test Student Discovery**: Use Build College Team page - filter by the colleges you just added

---

## Files Modified/Created

- ✅ `/pages/profile.tsx` - Added message auto-dismiss
- ✅ `/scripts/seed-patiala-colleges.js` - Node seed script
- ✅ `/DATABASE_SEED.sql` - SQL seed script
- ✅ `/package.json` - Added dotenv and npm script

