/**
 * BetterAuth Server Configuration
 *
 * Supports both Email/Password and OAuth authentication.
 * Enable/disable methods by uncommenting the relevant sections.
 *
 * Secrets (via getSecret from #airo/secrets):
 * - BETTER_AUTH_SECRET: Session encryption key (auto-generated during install)
 * - OAuth credentials (GOOGLE_CLIENT_ID, etc.) for social login
 *
 * CORS/Trusted Origins:
 * - Only trusts origins matching the server's hostname
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor as twoFactorPlugin } from 'better-auth/plugins';

import { db } from '@/server/db/client';
import { user, session, account, verification, twoFactor } from '@/server/db/schema';
import { getSecret } from '#airo/secrets';
import { sendEmail, verifyEmailTemplate, resetPasswordTemplate } from '@/server/lib/email';

// Lazy singleton — betterAuth() must NOT run at module init time.
//
// The BETTER_AUTH_SECRET is loaded from the alloc config at runtime, so the
// auth instance must be constructed after the secrets are available (i.e. on
// the first HTTP request, not at import time).
//
// Pattern mirrors how db/client.ts defers the actual MySQL connection — the
// pool object is safe to create at init, but anything that reads schema state
// or secrets must be deferred to request time.
let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;

  const authSecret = getSecret('BETTER_AUTH_SECRET');
  if (!authSecret || typeof authSecret !== 'string') {
    throw new Error('BETTER_AUTH_SECRET is not set or invalid — run requestSecrets() first');
  }

  if (!db) {
    throw new Error('Database not configured. Install the database skill first, then configure auth.');
  }

  const auth = betterAuth({
    // Schema passed explicitly — avoids BetterAuth's runtime schema inference.
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification, twoFactor },
    }),

    secret: authSecret,

    // Sessions: 12h hard limit, refreshed hourly while in use. Client-side idle logoff (15 min clinical / 30 min patient) sits on top.
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },

    // Protect admin status field from user input
    user: {
      additionalFields: {
        isAdmin: {
          type: 'boolean',
          defaultValue: false,
          input: false,  // Prevent clients from writing this field
          returned: true,
        },
      },
    },

    // CORS: Trusts .airoapp.ai subdomains and localhost by default.
    // If your app has a custom domain, add it here or set BETTER_AUTH_TRUSTED_ORIGINS.
    trustedOrigins: (request?: Request) => {
      if (!request) return [];

      const origin = request.headers.get('origin');
      if (!origin) return [];

      // Explicitly trusted origins, comma-separated
      // (e.g. "https://acuteinsight.ai,https://www.acuteinsight.ai")
      const envOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (envOrigins.includes(origin)) {
        return [origin];
      }

      try {
        const originUrl = new URL(origin);
        const hostname = originUrl.hostname;

        // Trust this project's Vercel deployment URLs
        if (originUrl.protocol === 'https:' && hostname.endsWith('.vercel.app')) {
          return [origin];
        }

        // Trust all airoapp.ai subdomains
        if (hostname.endsWith('.airoapp.ai') || hostname.endsWith('.test-airoapp.ai')) {
          return [origin];
        }

        // Trust localhost for development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return [origin];
        }

        return [];
      } catch {
        return [];
      }
    },

    // In preview mode the site runs in an iframe embedded by the builder on a different
    // origin, so cookies need SameSite=None + Secure + Partitioned (CHIPS) for cross-site
    // access. In publish mode (standalone) we use the safer SameSite=Lax default.
    ...(process.env.AIRO_PREVIEW === 'true' && {
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none' as const,
          secure: true,
          partitioned: true,
        },
      },
    }),

    emailAndPassword: {
      enabled: true,
      // Reset links go out only when a sender is configured; otherwise the request is logged and no-ops.
      sendResetPassword: async ({ user: u, url }) => {
        const t = resetPasswordTemplate(u.name ?? null, url);
        await sendEmail(u.email, t.subject, t.html, t.text);
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: u, url }) => {
        const t = verifyEmailTemplate(u.name ?? null, url);
        await sendEmail(u.email, t.subject, t.html, t.text);
      },
    },

    // MFA (TOTP + backup codes). Enabling requires the password; clinicians and
    // admins are nudged to turn it on, and REQUIRE_MFA_CLINICIANS=true enforces it.
    plugins: [twoFactorPlugin({ issuer: 'Acute Insight' })],

    // socialProviders: {
    //   google: {
    //     clientId: getSecret('GOOGLE_CLIENT_ID') as string,
    //     clientSecret: getSecret('GOOGLE_CLIENT_SECRET') as string,
    //   },
    //   github: {
    //     clientId: getSecret('GITHUB_CLIENT_ID') as string,
    //     clientSecret: getSecret('GITHUB_CLIENT_SECRET') as string,
    //   },
    // },
  });

  _auth = auth as unknown as ReturnType<typeof betterAuth>;
  return auth;
}

export type Session = ReturnType<typeof getAuth>['$Infer']['Session'];
export type User = ReturnType<typeof getAuth>['$Infer']['Session']['user'];
