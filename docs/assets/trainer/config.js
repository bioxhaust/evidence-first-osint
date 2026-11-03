// MIT. Only a public browser key belongs here; never a secret/service-role key.
// See /supabase/README.md in the repository for provisioning and RLS verification.
export const cloudConfig = {
  supabaseUrl: '',
  supabasePublishableKey: '',
  authMethods: ['github'], // Enable 'email' only after configuring reliable SMTP.
};
export default cloudConfig;
