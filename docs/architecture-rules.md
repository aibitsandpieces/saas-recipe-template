# Architecture Rules

Guidelines for Next.js App Router patterns, component architecture, and project structure in this SaaS template.

## Next.js App Router Patterns

### Server vs Client Components

#### Server Components (Default)
```typescript
// ✅ Good - Use Server Components for data fetching
export default async function RecipesPage() {
  const recipes = await getRecipes() // Direct database call
  const user = await auth() // Server-side auth check

  return (
    <div>
      <h1>Welcome, {user?.firstName}</h1>
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}
```

#### Client Components ("use client")
```typescript
// ✅ Good - Use Client Components for interactivity
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RecipeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: RecipeFormData) => {
    setIsSubmitting(true)
    const result = await createRecipe(data) // Server action call
    if (result.success) {
      router.push('/recipes')
    }
    setIsSubmitting(false)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Component Composition Patterns

#### Container/Presentation Pattern
```typescript
// ✅ Good - Server Component handles data (Container)
export default async function RecipeDetailPage({
  params
}: {
  params: { id: string }
}) {
  const recipe = await getRecipe(params.id)
  const comments = await getRecipeComments(params.id)

  return (
    <div>
      <RecipeDisplay recipe={recipe} />
      <CommentSection comments={comments} recipeId={params.id} />
    </div>
  )
}

// ✅ Good - Client Component handles interaction (Presentation)
'use client'

function CommentSection({ comments, recipeId }: CommentSectionProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {comments.map(comment => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
      <button onClick={() => setShowForm(true)}>Add Comment</button>
      {showForm && <CommentForm recipeId={recipeId} />}
    </div>
  )
}
```

## Route Structure Conventions

### File-Based Routing
```
app/
├── page.tsx                    # Homepage (/)
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles
├── (auth)/                     # Route group (doesn't affect URL)
│   ├── layout.tsx             # Auth-specific layout
│   └── sign-in/
│       └── page.tsx           # /sign-in
├── recipes/
│   ├── page.tsx               # /recipes (list page)
│   ├── new/
│   │   └── page.tsx           # /recipes/new
│   └── [id]/
│       └── page.tsx           # /recipes/[id] (dynamic)
└── my-cookbook/
    └── page.tsx               # /my-cookbook
```

### Layout Hierarchy Rules

#### Root Layout (Required)
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
          <Navbar />
          {children}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}
```

#### Feature-Specific Layouts
```typescript
// app/(auth)/layout.tsx - Only affects auth routes
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  )
}
```

### Dynamic Routes & Params

#### Single Dynamic Route
```typescript
// app/recipes/[id]/page.tsx
interface RecipePageProps {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function RecipePage({ params }: RecipePageProps) {
  const recipe = await getRecipe(params.id)

  if (!recipe) {
    notFound() // Returns 404
  }

  return <RecipeDisplay recipe={recipe} />
}
```

#### Multiple Dynamic Segments
```typescript
// app/users/[userId]/recipes/[recipeId]/page.tsx
interface UserRecipePageProps {
  params: { userId: string; recipeId: string }
}

export default async function UserRecipePage({ params }: UserRecipePageProps) {
  const { userId, recipeId } = params
  // Handle nested dynamic routes
}
```

## Data Fetching Patterns

### Server Actions (Preferred for Mutations)
```typescript
// lib/actions/recipe.actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function createRecipe(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const recipeData = {
    name: formData.get('name') as string,
    ingredients: JSON.parse(formData.get('ingredients') as string),
    instructions: formData.get('instructions') as string,
    user_id: userId,
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert(recipeData)
    .select()
    .single()

  if (error) throw new Error('Failed to create recipe')

  revalidatePath('/recipes') // Invalidate cache
  return data
}
```

### Direct Database Calls (Server Components Only)
```typescript
// lib/actions/recipe.actions.ts
export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      comments(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recipes:', error)
    return []
  }

  return data || []
}
```

### Client-Side Data Fetching (When Needed)
```typescript
// Only use for real-time data or user interactions
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useRealTimeComments(recipeId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `recipe_id=eq.${recipeId}`
      }, (payload) => {
        // Handle real-time updates
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [recipeId, supabase])

  return comments
}
```

## State Management Patterns

### Server State (Preferred)
```typescript
// ✅ Good - Let Server Components manage state
export default async function RecipesPage() {
  const recipes = await getRecipes()
  const user = await auth()

  return (
    <RecipesList
      recipes={recipes}
      canCreateRecipe={!!user}
    />
  )
}
```

### Client State (Minimal)
```typescript
// ✅ Good - Only for UI state and interactions
'use client'

export function RecipeForm() {
  // UI state only
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Use React Hook Form for form state
  const { register, handleSubmit, formState: { errors } } = useForm<RecipeFormData>()

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

### Avoid Global Client State
```typescript
// ❌ Avoid - Don't use Redux/Zustand for server data
// Server Components + Server Actions handle this better

// ✅ Good - Use URL state for filters
export default function RecipesPage({
  searchParams
}: {
  searchParams: { category?: string; sort?: string }
}) {
  const recipes = await getRecipes({
    category: searchParams.category,
    sortBy: searchParams.sort
  })

  return <RecipesList recipes={recipes} />
}
```

## Error Handling Architecture

### Global Error Boundaries
```typescript
// app/error.tsx - Catches errors in route segments
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="text-center py-10">
      <h2>Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Try again
      </button>
    </div>
  )
}
```

### Not Found Pages
```typescript
// app/recipes/[id]/not-found.tsx
export default function RecipeNotFound() {
  return (
    <div className="text-center py-10">
      <h2>Recipe Not Found</h2>
      <p>The recipe you're looking for doesn't exist.</p>
      <Link href="/recipes">
        Browse All Recipes
      </Link>
    </div>
  )
}
```

### Loading States
```typescript
// app/recipes/loading.tsx
export default function RecipesLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}
```

## Performance Optimization

### Image Optimization
```typescript
import Image from 'next/image'

// ✅ Good - Always use Next.js Image component
<Image
  src={recipe.imageUrl}
  alt={recipe.name}
  width={400}
  height={300}
  className="rounded-lg"
  priority={isAboveFold} // Only for above-the-fold images
/>
```

### Bundle Optimization
```typescript
// ✅ Good - Dynamic imports for heavy components
import dynamic from 'next/dynamic'

const RecipeEditor = dynamic(() => import('./RecipeEditor'), {
  loading: () => <RecipeEditorSkeleton />,
  ssr: false // If component requires window object
})
```

### Caching Strategy
```typescript
// ✅ Good - Use revalidation for data that changes
export const revalidate = 3600 // Revalidate every hour

export default async function RecipesPage() {
  const recipes = await getRecipes()
  return <RecipesList recipes={recipes} />
}

// ✅ Good - Manual cache invalidation
export async function createRecipe(formData: FormData) {
  // ... create recipe logic

  revalidatePath('/recipes') // Clear recipes cache
  revalidateTag('user-recipes') // Clear tagged cache
}
```

## Component Architecture

### Component Hierarchy
```
Page (Server Component)
├── Layout Components (Client)
├── Data Display (Server)
├── Interactive Sections (Client)
│   ├── Forms (Client)
│   ├── Modals (Client)
│   └── Real-time Updates (Client)
└── Static Content (Server)
```

### Prop Patterns
```typescript
// ✅ Good - Explicit prop interfaces
interface RecipeCardProps {
  recipe: Recipe
  showActions?: boolean
  onEdit?: (id: string) => void
}

// ✅ Good - Use children for composition
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

// ✅ Good - Use render props for flexibility
interface RecipeListProps {
  recipes: Recipe[]
  renderEmpty?: () => React.ReactNode
}
```

### Component Boundaries
```typescript
// ✅ Good - Clear separation of concerns
export default async function RecipePage({ params }: { params: { id: string } }) {
  // Server: Data fetching
  const recipe = await getRecipe(params.id)
  const userCanEdit = await checkEditPermission(params.id)

  return (
    <div>
      {/* Server: Static content */}
      <RecipeHeader recipe={recipe} />

      {/* Client: Interactive elements */}
      <RecipeActions
        recipeId={params.id}
        canEdit={userCanEdit}
      />

      {/* Server: Content display */}
      <RecipeContent recipe={recipe} />
    </div>
  )
}
```