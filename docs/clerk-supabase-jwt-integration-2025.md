# Clerk-Supabase JWT Integration: Canonical Guide (2025)

## ❗ Core Truth (Read This First)

**You do NOT create or share a Supabase JWT secret or signing key when integrating Clerk with Supabase.**
That approach is deprecated and explicitly discouraged by Supabase.

The correct, current integration model is **Third-Party Auth using OIDC**, where:
- Clerk issues JWTs
- Supabase verifies Clerk's JWTs
- No shared secrets exist
- No Supabase JWT key is created for Clerk

## Why This Changed (Context)

Supabase moved away from a single shared JWT secret to a JWT Signing Keys system using asymmetric cryptography.

This enables:
- Safe key rotation
- No secret sharing
- Verification via public keys (JWKS)
- Zero downtime rotations

As part of this change:
- The old "JWT templates + shared secret" method was deprecated
- Official Clerk support now uses OIDC discovery + asymmetric JWT verification

## The Only Correct Clerk ↔ Supabase Integration (As of 2025)

### Architecture Overview
- Clerk is the identity provider
- Supabase trusts Clerk as a third-party issuer
- Supabase verifies Clerk tokens using Clerk's public keys
- Supabase never signs these tokens
- Supabase never receives Clerk's private keys
- No JWT secrets are exchanged

### What Happens Technically
1. Clerk issues asymmetric JWTs (eg RS256 / ES256)
2. Each token includes:
   - `iss` (issuer = Clerk domain)
   - `kid` (key ID)
   - `role` claim (usually "authenticated")
3. Clerk exposes a JWKS endpoint via OIDC
4. Supabase:
   - Fetches Clerk's public keys via OIDC discovery
   - Verifies incoming JWTs using the kid
   - Uses claims for RLS via auth.jwt()

## What You MUST Configure (And Only This)

### 1. Clerk Side
- Enable Supabase integration in Clerk
- Ensure session tokens include:
  - `role: "authenticated"` (or custom Postgres role)
- Clerk remains the sole issuer of user tokens

### 2. Supabase Side
- Add a Third-Party Auth integration
- Provider: Clerk
- Supply: Clerk issuer URL (your Clerk domain)
- Supabase now trusts Clerk as an issuer

### 3. Application Code
- Fetch Clerk session token
- Pass it into Supabase client calls
- Example conceptually:
  - Supabase receives Clerk's JWT on every request
  - RLS runs using Clerk claims

## Database & RLS Reality (Important)
- Clerk users do NOT appear in auth.users
- Supabase Auth is not managing users
- RLS policies must use: `auth.jwt()`
- If user records are needed in your DB:
  - Use Clerk webhooks
  - Sync data manually
- This is by design, not a misconfiguration

## 🚫 Explicitly Deprecated / Wrong Approaches (Must Be Rejected)

The following are incorrect and should be flagged as errors:
- ❌ Creating or rotating Supabase's legacy JWT secret
- ❌ Sharing Supabase JWT secrets with Clerk
- ❌ Using JWT templates in Clerk that reference Supabase secrets
- ❌ Expecting Clerk users to appear in auth.users
- ❌ Minting Supabase-compatible JWTs manually for Clerk users

Supabase explicitly warns these approaches cause:
- Security risks
- Forced sign-outs
- Downtime during rotations

## Supabase JWT Signing Keys (Clarification)

Supabase does have JWT Signing Keys, but:
- They are used only when Supabase itself issues tokens
- They are not used in Clerk integration
- You do not create one for Clerk
- You cannot extract private keys

**If an AI suggests "create a Supabase JWT key for Clerk", it is wrong or outdated.**

## One-Sentence Rule (For AI Enforcement)

**If Clerk is the auth provider, Supabase never signs, shares, or generates JWT keys for Clerk. Supabase only verifies Clerk's JWTs via OIDC.**

## Decision Tree

Question: "Do I need to create a Supabase JWT key?"
- Clerk integration? → **NO**
- Supabase Auth issuing tokens? → YES (internal only)

## Final Sanity Check

If someone asks: "Where do I create the JWT key for Clerk?"

The correct response is: **"You don't. Clerk issues the JWTs. Supabase verifies them using Clerk's public keys via OIDC."**