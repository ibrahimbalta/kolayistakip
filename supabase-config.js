// Supabase Configuration
// ======================
// IMPORTANT: Replace with your actual Supabase project credentials
// Get these from: https://app.supabase.com -> Your Project -> Settings -> API

const SUPABASE_URL = 'https://aaqowcolwvjwgbufgrpx.supabase.co';  // Example: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcW93Y29sd3Zqd2didWZncnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Mzk3OTksImV4cCI6MjA3OTIxNTc5OX0.M1e5itRDn_JmqFWru4_By2NZdsDB17Hh2dXLIViPVAM';  // Your anon/public key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabase = supabase;

console.log('✅ Supabase initialized successfully');
