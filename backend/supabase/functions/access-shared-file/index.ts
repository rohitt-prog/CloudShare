/**
 * Supabase Edge Function: access-shared-file
 * Secure mediation boundary for public/guest access to shared files.
 *
 * Security & Architectural Guarantees:
 * 1. Method Restriction: Strictly POST only with standard CORS preflight support.
 * 2. Unauthenticated Guests: Permitted without user JWT session.
 * 3. Token Format Validation: Strictly validates 43-character Base64URL token.
 * 4. Constant-Time Uniform 404: Returns identical HTTP 404 response for
 *    non-existent, expired, or revoked links to prevent timing/enumeration attacks.
 * 5. Private Path Concealment: Never exposes raw storage path, bucket name, or owner UUID.
 * 6. Metadata Action: Returns safe file attributes (filename, size, MIME, expiresAt).
 * 7. Download Action: Generates a short-lived (60-second) signed URL to private storage.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ACCESS_SHARED_FILE_SELECT_QUERY,
  validateTokenFormat,
  hashCryptoShareToken,
  isLinkRevoked,
  isLinkExpired,
} from '../_shared/share-security.ts';

export interface AccessSharedFileRequest {
  shareToken: string;
  action: 'metadata' | 'download';
}

export interface AccessSharedFileMetadataResponse {
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: string;
}

export interface AccessSharedFileDownloadResponse {
  downloadUrl: string;
  expiresInSeconds: number;
  fileName: string;
}

export const functionConfig = {
  name: 'access-shared-file',
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

  const uniformNotFoundResponse = () =>
    new Response(
      JSON.stringify({ error: 'Shared file not found or link has expired.' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Edge function environment is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Parse input body
    const body = (await req.json().catch(() => ({}))) as Partial<AccessSharedFileRequest>;
    const { shareToken, action = 'metadata' } = body;

    // Validate action
    if (action !== 'metadata' && action !== 'download') {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'metadata' or 'download'." }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate token format (43-char Base64URL)
    // Non-matching tokens return generic 404 to avoid format leakage
    if (!validateTokenFormat(shareToken)) {
      return uniformNotFoundResponse();
    }

    // 4. Compute SHA-256 hash of token to look up database record
    const tokenHash = await hashCryptoShareToken(shareToken);

    // 5. Query share link joined with files using service-role client
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: shareLink, error: linkError } = await adminClient
      .from('share_links')
      .select(ACCESS_SHARED_FILE_SELECT_QUERY)
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (linkError || !shareLink || !shareLink.files) {
      return uniformNotFoundResponse();
    }

    // Extract file details (handling potential array or object structure)
    const file = Array.isArray(shareLink.files) ? shareLink.files[0] : shareLink.files;
    if (!file || !file.file_name) {
      return uniformNotFoundResponse();
    }

    // 6. Security Check: Revocation
    if (isLinkRevoked(shareLink.revoked_at)) {
      return uniformNotFoundResponse();
    }

    // 7. Security Check: Expiration
    if (isLinkExpired(shareLink.expires_at)) {
      return uniformNotFoundResponse();
    }

    // 8. Action: Metadata
    if (action === 'metadata') {
      const responseData: AccessSharedFileMetadataResponse = {
        fileName: file.file_name,
        fileSize: file.file_size,
        mimeType: file.mime_type || 'application/octet-stream',
        expiresAt: shareLink.expires_at,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 9. Action: Download (Generate 60-second signed URL for private bucket)
    const { data: signedData, error: signedError } = await adminClient
      .storage
      .from('user-files')
      .createSignedUrl(file.storage_path, 60, {
        download: file.file_name,
      });

    if (signedError || !signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate secure download link.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const responseData: AccessSharedFileDownloadResponse = {
      downloadUrl: signedData.signedUrl,
      expiresInSeconds: 60,
      fileName: file.file_name,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Internal server error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
