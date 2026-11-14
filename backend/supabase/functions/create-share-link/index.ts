/**
 * Supabase Edge Function: create-share-link
 * Securely generates time-limited, revocable file sharing links.
 *
 * Security & Architectural Guarantees:
 * 1. Method Restriction: Strictly POST only with standard CORS preflight support.
 * 2. Authenticated Caller: Requires valid user JWT; verifies authenticated user.
 * 3. File Ownership: Verifies caller owns the file before link generation.
 * 4. High-Entropy Token: Generates 32 cryptographically random bytes (256 bits).
 * 5. Format: Encoded as unpadded Base64URL (RFC 4648 §5, exactly 43 chars).
 * 6. Hash Storage: Calculates SHA-256 hash stored in `public.share_links.token_hash`.
 *    The raw token is NEVER stored in the database and NEVER logged.
 * 7. Privileged Insertion: Uses service-role client to insert into `public.share_links`
 *    (as client INSERT is blocked by RLS policy).
 * 8. Expiration: Enforces expiration between 1 hour and 720 hours (30 days).
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  validateUUID,
  validateExpirationHours,
  generateCryptoShareToken,
  hashCryptoShareToken,
  calculateExpiresAt,
} from '../_shared/share-security.ts';

export interface CreateShareLinkRequest {
  fileId: string;
  expiresInHours?: number | null;
}

export interface CreateShareLinkResponse {
  shareId: string;
  token: string;
  expiresAt: string;
}

export const functionConfig = {
  name: 'create-share-link',
  runtime: 'edge-runtime',
  version: '2.0.0',
  phase: 'Phase 6 Secure File Sharing',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Enforce HTTP POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 3. Authenticate caller session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Edge function environment is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Authenticate user via user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired authentication session' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Parse and validate input payload
    const body = (await req.json().catch(() => ({}))) as Partial<CreateShareLinkRequest>;
    const { fileId, expiresInHours = 24 } = body;

    if (!fileId || typeof fileId !== 'string' || !validateUUID(fileId.trim())) {
      return new Response(JSON.stringify({ error: 'Invalid or missing fileId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const durationResult = validateExpirationHours(expiresInHours);
    if (!durationResult.isValid) {
      return new Response(
        JSON.stringify({ error: durationResult.error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const hours = durationResult.hours;

    // 5. Privileged service client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify caller ownership of target file
    const { data: file, error: fileError } = await adminClient
      .from('files')
      .select('id, owner_id')
      .eq('id', fileId.trim())
      .eq('owner_id', user.id)
      .single();

    if (fileError || !file) {
      return new Response(JSON.stringify({ error: 'File not found or permission denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Cryptographic token generation
    const rawToken = generateCryptoShareToken();
    const tokenHash = await hashCryptoShareToken(rawToken);
    const expiresAt = calculateExpiresAt(hours);

    // 7. Insert share link record with token_hash (never raw token)
    const { data: shareLink, error: insertError } = await adminClient
      .from('share_links')
      .insert({
        file_id: file.id,
        owner_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select('id, file_id, owner_id, expires_at, created_at')
      .single();

    if (insertError || !shareLink) {
      return new Response(JSON.stringify({ error: 'Failed to record share link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 8. Return raw token once to authenticated owner
    // Note: Raw token is never logged
    return new Response(
      JSON.stringify({
        shareId: shareLink.id,
        token: rawToken,
        expiresAt: shareLink.expires_at,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Internal server error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
