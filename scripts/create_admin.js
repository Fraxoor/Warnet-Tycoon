import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vppbhxxitcvorelllgvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Rh9a93xZB1p2jagX8n6nkQ_32yYYiUo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const email = 'admin@warnet.local';
  const password = 'adminnusantaraid12';
  const { data, error } = await supabase.auth.signUp({ email, password });
  console.log('SIGNUP RESULT:', { data, error });
}

main().catch((e) => console.error('UNHANDLED', e));
