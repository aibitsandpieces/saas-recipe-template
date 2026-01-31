# Authentication & Security

Guidelines for Clerk integration, security best practices, and authorization patterns in this SaaS template.

## Clerk Authentication Setup

### Environment Configuration
```env
# Required Clerk environment variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Authentication flow configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### Root Layout Setup
```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### Middleware Configuration
```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
```

## Authentication Patterns

### Server Components Authentication
```typescript
// ✅ Good - Check auth in Server Components
import { auth } from '@clerk/nextjs/server'

export default async function MyRecipesPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const recipes = await getUserRecipes(userId)

  return (
    <div>
      <h1>My Recipes</h1>
      <RecipesList recipes={recipes} />
    </div>
  )
}
```

### Client Components Authentication
```typescript
// ✅ Good - Use Clerk hooks in Client Components
'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function UserProfile() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()

  if (!isLoaded) {
    return <LoadingSpinner />
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}</h1>
      <p>Email: {user.emailAddresses[0]?.emailAddress}</p>
    </div>
  )
}
```

### Server Actions Authentication
```typescript
// ✅ Good - Always check auth in Server Actions
'use server'

import { auth } from '@clerk/nextjs/server'

export async function createRecipe(formData: FormData) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Authentication required')
  }

  // Proceed with authenticated operation
  const recipeData = {
    name: formData.get('name') as string,
    user_id: userId, // Always associate with authenticated user
  }

  return await supabase.from('recipes').insert(recipeData)
}
```

## Authorization Patterns

### Resource Ownership Verification
```typescript
export async function updateRecipe(recipeId: string, data: Partial<Recipe>) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // ✅ Good - Verify ownership before modification
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .single()

  if (error) throw new Error('Recipe not found')

  if (recipe.user_id !== userId) {
    throw new Error('You can only edit your own recipes')
  }

  // Proceed with update
  return await supabase
    .from('recipes')
    .update(data)
    .eq('id', recipeId)
    .eq('user_id', userId) // Double-check with filter
}
```

### Role-Based Access Control
```typescript
// ✅ Good - Check user roles/subscription status
export async function deleteAnyRecipe(recipeId: string) {
  const { userId, sessionClaims } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const isAdmin = sessionClaims?.metadata?.role === 'admin'
  const isPro = sessionClaims?.metadata?.subscription === 'pro'

  if (!isAdmin && !isPro) {
    throw new Error('Premium subscription required')
  }

  // Admin can delete any recipe, Pro users can delete their own
  let query = supabase.from('recipes').delete().eq('id', recipeId)

  if (!isAdmin) {
    query = query.eq('user_id', userId)
  }

  return await query
}
```

### Protected Route Patterns
```typescript
// app/(protected)/my-cookbook/page.tsx - Route group for protected pages
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Mycookbook() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in?redirect_url=/my-cookbook')
  }

  // User is authenticated, proceed
  const recipes = await getUserRecipes(userId)
  return <CookbookView recipes={recipes} />
}
```

## Input Validation & Sanitization

### Zod Schema Validation
```typescript
import { z } from 'zod'

// ✅ Good - Comprehensive validation schemas
export const recipeSchema = z.object({
  name: z
    .string()
    .min(1, 'Recipe name is required')
    .max(100, 'Recipe name too long')
    .trim(),
  ingredients: z
    .array(z.string().min(1, 'Ingredient cannot be empty'))
    .min(1, 'At least one ingredient is required')
    .max(50, 'Too many ingredients'),
  instructions: z
    .string()
    .min(10, 'Instructions must be at least 10 characters')
    .max(5000, 'Instructions too long'),
})

export const commentSchema = z.object({
  comment: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment too long')
    .refine(
      (value) => !containsProfanity(value),
      'Comment contains inappropriate content'
    ),
  recipeId: z.string().uuid('Invalid recipe ID'),
})
```

### Server Action Validation
```typescript
export async function createRecipe(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  try {
    // ✅ Good - Validate all input data
    const validatedData = recipeSchema.parse({
      name: formData.get('name'),
      ingredients: JSON.parse(formData.get('ingredients') as string),
      instructions: formData.get('instructions'),
    })

    // ✅ Good - Sanitize HTML content
    const sanitizedInstructions = DOMPurify.sanitize(validatedData.instructions)

    const recipeData = {
      ...validatedData,
      instructions: sanitizedInstructions,
      user_id: userId,
    }

    return await supabase.from('recipes').insert(recipeData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors[0]?.message}`)
    }
    throw error
  }
}
```

## Supabase RLS Integration

### JWT Token Setup
```typescript
// lib/supabase-server.ts
import { auth } from '@clerk/nextjs/server'

export async function createAuthenticatedSupabaseClient() {
  const { getToken } = await auth()

  // Get Clerk JWT formatted for Supabase
  const token = await getToken({ template: 'supabase' })

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    }
  )
}
```

### RLS Policy Examples
```sql
-- Users can only see their own recipes
CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can only modify their own recipes
CREATE POLICY "Users can modify own recipes" ON recipes
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Premium users can view premium content
CREATE POLICY "Premium users can view premium recipes" ON recipes
  FOR SELECT USING (
    is_premium = false OR
    (auth.jwt() ->> 'subscription')::text = 'pro'
  );
```

## Data Protection

### Sensitive Data Handling
```typescript
// ✅ Good - Never expose sensitive data
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      display_name,
      bio,
      created_at
      -- ❌ Never select: email, phone, payment_info
    `)
    .eq('id', userId)
    .single()

  return data
}

// ✅ Good - Filter sensitive data in API responses
export async function getPublicUserData(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!data) return null

  // Remove sensitive fields before returning
  const { email, phone, payment_info, ...publicData } = data
  return publicData
}
```

### API Route Security
```typescript
// app/api/recipes/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Good - Rate limiting (implement with middleware)
    const ip = request.ip ?? '127.0.0.1'
    const rateLimitResult = await rateLimit.check(ip)

    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Proceed with authenticated logic
    const recipes = await getUserRecipes(userId)
    return Response.json({ recipes })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Security Best Practices

### Environment Variables
```typescript
// ✅ Good - Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// ✅ Good - Use type-safe environment config
export const config = {
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-only
  },
} as const
```

### CORS & CSP Headers
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? 'https://yourdomain.com'
              : 'http://localhost:3000'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://clerk.dev"
          }
        ]
      }
    ]
  }
}
```

### Error Handling Security
```typescript
// ✅ Good - Don't expose internal errors to users
export async function createRecipe(data: RecipeFormData) {
  try {
    return await supabase.from('recipes').insert(data)
  } catch (error) {
    // Log detailed error internally
    console.error('Recipe creation failed:', {
      error: error.message,
      stack: error.stack,
      userId: data.user_id,
      timestamp: new Date().toISOString()
    })

    // Return generic error to user
    throw new Error('Unable to create recipe. Please try again.')
  }
}
```

## Subscription & Billing Security

### Webhook Verification
```typescript
// app/api/webhooks/clerk/route.ts
import { headers } from 'next/headers'
import { Webhook } from 'svix'

export async function POST(request: Request) {
  const headerPayload = headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Invalid headers' }, { status: 400 })
  }

  const payload = await request.text()
  const body = JSON.parse(payload)

  // ✅ Good - Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt
  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Process verified webhook
  switch (evt.type) {
    case 'user.created':
      await createUserProfile(evt.data)
      break
    case 'subscription.updated':
      await updateUserSubscription(evt.data)
      break
  }

  return Response.json({ message: 'Webhook processed' })
}
```

### Subscription Checks
```typescript
export async function checkSubscriptionAccess(userId: string, feature: string) {
  const { sessionClaims } = await auth()

  const subscription = sessionClaims?.metadata?.subscription
  const features = sessionClaims?.metadata?.features || []

  // ✅ Good - Server-side subscription verification
  const hasAccess = subscription === 'pro' || features.includes(feature)

  if (!hasAccess) {
    throw new Error('Premium subscription required for this feature')
  }

  return true
}

export async function unlockPremiumRecipe(recipeId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify subscription status
  await checkSubscriptionAccess(userId, 'premium-recipes')

  // Proceed with unlock
  return await supabase
    .from('recipes_unlocked')
    .insert({ recipe_id: recipeId, user_id: userId })
}
```