// Store settings. Fill these in once the accounts exist (see docs/STORE-SETUP.md). Empty = the store shows "opening soon".
// These are PUBLIC keys by design (the anon key and Paddle's client-side token are meant to sit in web pages);
// the secret ones live only in Supabase's secrets.
window.PLS_STORE = {
  supabaseUrl: '',          // https://<project>.supabase.co
  supabaseAnonKey: '',      // Project settings > API > anon public key
  paddleClientToken: '',    // Paddle > Developer tools > Authentication > client-side token
  paddleEnv: 'sandbox',     // 'sandbox' while testing, 'production' when live
  pulseKeyPublic: ''        // public half of the Pulse key pair (apps use the same one)
};
