'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SupabaseTest() {
  const [result, setResult] = useState('Checking…');

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setResult(`ERROR: ${error.message}`);
      } else if (data.session) {
        setResult(`✅ Authenticated as ${data.session.user.email ?? data.session.user.id}`);
      } else {
        setResult('🔵 Connected to Supabase, but no session (not logged in)');
      }
    })();
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h2>Supabase Connection Check</h2>
      <pre>{result}</pre>
    </div>
  );
}
