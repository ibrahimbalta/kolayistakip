// Supabase Configuration
// ======================
// IMPORTANT: Replace with your actual Supabase project credentials
// Get these from: https://app.supabase.com -> Your Project -> Settings -> API

const SUPABASE_URL = 'https://aaqowcolwvjwgbufgrpx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcW93Y29sd3Zqd2didWZncnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2Mzk3OTksImV4cCI6MjA3OTIxNTc5OX0.M1e5itRDn_JmqFWru4_By2NZdsDB17Hh2dXLIViPVAM';

// Initialize Supabase client
// Note: The CDN script creates window.supabase with the SDK
// We use createClient and reassign to window.supabase
(function initSupabase() {
    try {
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            // Create client and replace the SDK reference with the client
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabase = client;
            console.log('✅ Supabase initialized successfully');
        } else {
            console.error('❌ Supabase SDK not loaded properly!');
        }
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
    }
})();

// supabase is available globally via window.supabase
