# Database Patterns

Guidelines for Supabase usage, server actions, and database interactions in this SaaS template.

## Supabase Client Configuration

### Server-Side Client (Preferred)
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Server-side client with service role key (for server actions)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Full access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Regular client for authenticated requests
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Authentication Integration
```typescript
// lib/supabase-server.ts
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function createServerSupabaseClient() {
  const { getToken } = await auth()
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

## Server Actions Patterns

### Action Structure Template
```typescript
// lib/actions/[domain].actions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ✅ Good - Consistent action structure
export async function createRecipe(formData: FormData) {
  // 1. Authentication check
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Authentication required')
  }

  // 2. Input validation
  const validatedData = recipeSchema.parse({
    name: formData.get('name'),
    ingredients: JSON.parse(formData.get('ingredients') as string),
    instructions: formData.get('instructions'),
  })

  // 3. Database operation
  try {
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        ...validatedData,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error

    // 4. Cache invalidation
    revalidatePath('/recipes')
    revalidatePath('/my-cookbook')

    // 5. Return result
    return { success: true, data }
  } catch (error) {
    console.error('Error creating recipe:', error)
    return { success: false, error: 'Failed to create recipe' }
  }
}
```

### CRUD Operations

#### Create (INSERT)
```typescript
export async function createRecipe(data: RecipeFormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      name: data.name,
      ingredients: data.ingredients,
      instructions: data.instructions,
      user_id: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Database error:', error)
    throw new Error('Failed to create recipe')
  }

  revalidatePath('/recipes')
  return recipe
}
```

#### Read (SELECT)
```typescript
export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      comments (
        id,
        comment,
        created_at,
        user_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recipes:', error)
    return []
  }

  return data || []
}

export async function getUserRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user recipes:', error)
    return []
  }

  return data || []
}
```

#### Update (UPDATE)
```typescript
export async function updateRecipe(id: string, data: Partial<Recipe>) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify ownership
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', id)
    .single()

  if (recipe?.user_id !== userId) {
    throw new Error('Forbidden')
  }

  const { data: updatedRecipe, error } = await supabase
    .from('recipes')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating recipe:', error)
    throw new Error('Failed to update recipe')
  }

  revalidatePath(`/recipes/${id}`)
  revalidatePath('/my-cookbook')
  return updatedRecipe
}
```

#### Delete (DELETE)
```typescript
export async function deleteRecipe(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Verify ownership before deletion
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', id)
    .single()

  if (recipe?.user_id !== userId) {
    throw new Error('Forbidden')
  }

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting recipe:', error)
    throw new Error('Failed to delete recipe')
  }

  revalidatePath('/recipes')
  revalidatePath('/my-cookbook')
  return { success: true }
}
```

## Row Level Security (RLS) Patterns

### Understanding RLS Policies
```sql
-- All users can view recipes (public content)
CREATE POLICY "All users can see the recipes" ON "public"."recipes"
  FOR SELECT USING (true);

-- Authenticated users can only modify their own recipes
CREATE POLICY "Authenticated users can create/modify only own recipes" ON "public"."recipes"
  TO "authenticated"
  USING ((SELECT (auth.jwt() ->> 'sub'::text)) = user_id)
  WITH CHECK ((SELECT (auth.jwt() ->> 'sub'::text)) = user_id);
```

### Working with RLS in Actions
```typescript
// ✅ Good - RLS handles authorization automatically
export async function getUserRecipes() {
  const { userId } = await auth()
  const supabase = await createServerSupabaseClient()

  // RLS policy automatically filters by user_id from JWT
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    // No need for .eq('user_id', userId) - RLS handles this

  return data || []
}

// ✅ Good - Double-check ownership for sensitive operations
export async function deleteRecipe(recipeId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Explicit ownership check before deletion
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .single()

  if (recipe?.user_id !== userId) {
    throw new Error('You can only delete your own recipes')
  }

  // Proceed with deletion
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)

  if (error) throw new Error('Failed to delete recipe')
  revalidatePath('/my-cookbook')
}
```

## Query Optimization

### Efficient Joins
```typescript
// ✅ Good - Use select() for specific joins
export async function getRecipeWithComments(id: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      comments (
        id,
        comment,
        created_at,
        user_id
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error:', error)
    return null
  }

  return data
}
```

### Pagination
```typescript
export async function getRecipesPaginated(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('recipes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching paginated recipes:', error)
    return { recipes: [], total: 0, hasMore: false }
  }

  return {
    recipes: data || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  }
}
```

### Filtering & Search
```typescript
export async function searchRecipes(query: string, category?: string) {
  let queryBuilder = supabase
    .from('recipes')
    .select('*')

  // Text search in name and instructions
  if (query) {
    queryBuilder = queryBuilder.or(
      `name.ilike.%${query}%,instructions.ilike.%${query}%`
    )
  }

  // Category filter
  if (category) {
    queryBuilder = queryBuilder.contains('tags', [category])
  }

  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Search error:', error)
    return []
  }

  return data || []
}
```

## Subscription/Access Control Patterns

### Recipe Unlock System
```typescript
export async function unlockRecipe(recipeId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Check if already unlocked
  const { data: existing } = await supabase
    .from('recipes_unlocked')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return { success: true, message: 'Recipe already unlocked' }
  }

  // Create unlock record
  const { data, error } = await supabase
    .from('recipes_unlocked')
    .insert({
      recipe_id: recipeId,
      user_id: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error unlocking recipe:', error)
    throw new Error('Failed to unlock recipe')
  }

  revalidatePath(`/recipes/${recipeId}`)
  return { success: true, data }
}

export async function getUnlockedRecipes(userId: string) {
  const { data, error } = await supabase
    .from('recipes_unlocked')
    .select(`
      recipe_id,
      recipes (
        *
      )
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching unlocked recipes:', error)
    return []
  }

  return data?.map(item => item.recipes).filter(Boolean) || []
}
```

### Access Control Helpers
```typescript
export async function canAccessRecipe(recipeId: string, userId: string): Promise<boolean> {
  // Check if user owns the recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .single()

  if (recipe?.user_id === userId) {
    return true
  }

  // Check if user has unlocked the recipe
  const { data: unlocked } = await supabase
    .from('recipes_unlocked')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .single()

  return !!unlocked
}
```

## Error Handling & Logging

### Database Error Patterns
```typescript
export async function createRecipe(data: RecipeFormData) {
  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert(data)
      .select()
      .single()

    if (error) {
      // Log the actual error for debugging
      console.error('Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      // Return user-friendly error
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Recipe name already exists' }
      }

      return { success: false, error: 'Failed to create recipe' }
    }

    return { success: true, data: recipe }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Something went wrong' }
  }
}
```

### Connection Error Handling
```typescript
export async function getRecipes() {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')

    if (error) {
      console.error('Database error:', error)
      return []
    }

    return data || []
  } catch (error) {
    // Network or connection error
    console.error('Connection error:', error)
    return []
  }
}
```

### Advanced Bulk Operations & RLS Error Handling
```typescript
// ✅ Good - Comprehensive error handling for bulk operations
export async function deleteAllWorkflows(): Promise<{ deletedCount: number }> {
  // 1. Permission verification function
  const verifyBulkDeletionPermissions = async () => {
    const user = await requirePlatformAdmin()
    const supabase = await createSupabaseClient()

    // Test RLS access to related tables
    const { error: testError } = await supabase
      .from("workflow_files")
      .select("id")
      .limit(1)

    if (testError) {
      console.error("RLS policy test failed for workflow_files:", testError)
      throw new Error(`Platform admin cannot access workflow_files table. RLS policy may be misconfigured: ${testError.message}`)
    }
  }

  // 2. Verify permissions first
  await verifyBulkDeletionPermissions()
  const supabase = await createSupabaseClient()

  // 3. Get count for audit trail
  const { data: workflows, error: countError } = await supabase
    .from("workflows")
    .select("id")

  if (countError) {
    throw new Error(`Failed to count workflows: ${countError.message}`)
  }

  console.log(`Platform admin initiating bulk deletion of ${workflows?.length || 0} workflows`)

  try {
    // 4. Main deletion with enhanced error classification
    const { error } = await supabase
      .from("workflows")
      .delete()
      .neq("id", "")

    if (error) {
      console.error("Detailed deletion error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      // 5. Specific error handling by type
      if (error.code === '42501' || error.message.includes('policy')) {
        throw new Error(`Database policy violation during bulk delete. This may indicate RLS policy issues with cascading operations. Original error: ${error.message}`)
      }

      if (error.code === '23503' || error.message.includes('foreign key')) {
        throw new Error(`Foreign key constraint violation during bulk delete. Some workflow files may be blocking deletion. Original error: ${error.message}`)
      }

      throw new Error(`Failed to delete all workflows: ${error.message}`)
    }

    return { deletedCount: workflows?.length || 0 }
  } catch (dbError) {
    console.error("Database operation failed:", dbError)
    throw dbError
  }
}

// ✅ Alternative implementation for RLS cascading issues
export async function deleteAllWorkflowsExplicit(): Promise<{ deletedCount: number }> {
  await requirePlatformAdmin()
  const supabase = await createSupabaseClient()

  const { data: workflows, error: countError } = await supabase
    .from("workflows")
    .select("id")

  if (countError) {
    throw new Error(`Failed to count workflows: ${countError.message}`)
  }

  try {
    // Explicit deletion sequence to avoid RLS cascading issues
    // Step 1: Delete all workflow files explicitly
    const { error: filesError } = await supabase
      .from("workflow_files")
      .delete()
      .neq("id", "")

    if (filesError) {
      throw new Error(`Failed to delete workflow files: ${filesError.message}`)
    }

    // Step 2: Delete all workflows
    const { error: workflowsError } = await supabase
      .from("workflows")
      .delete()
      .neq("id", "")

    if (workflowsError) {
      throw new Error(`Failed to delete workflows: ${workflowsError.message}`)
    }

    return { deletedCount: workflows?.length || 0 }
  } catch (error) {
    console.error("Manual deletion sequence failed:", error)
    throw error
  }
}
```

### Client-Side Error Display
```typescript
// ✅ Good - Enhanced client error handling based on backend error types
const handleDeleteAllWorkflows = async () => {
  try {
    const result = await deleteAllWorkflows()
    toast.success(`Successfully deleted ${result.deletedCount} workflows`)
  } catch (error) {
    let errorMessage = "Failed to delete workflows"

    if (error instanceof Error) {
      if (error.message.includes('policy violation')) {
        errorMessage = "Database permission error. Check administrator privileges."
      } else if (error.message.includes('foreign key constraint')) {
        errorMessage = "Database constraint error. Some files may be blocking deletion."
      } else if (error.message.includes('cannot access')) {
        errorMessage = "Database access error. Administrator permissions misconfigured."
      } else if (error.message.length < 100) {
        errorMessage = error.message // Show specific short error messages
      }
    }

    toast.error(errorMessage)
  }
}
```

## Real-time Subscriptions

### Setting Up Realtime
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useRealtimeComments(recipeId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Initial load
    const loadComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: true })

      setComments(data || [])
    }

    loadComments()

    // Real-time subscription
    const channel = supabase
      .channel(`comments-${recipeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `recipe_id=eq.${recipeId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new as Comment])
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [recipeId, supabase])

  return comments
}
```

## Cache Management

### Revalidation Strategies
```typescript
import { revalidatePath, revalidateTag } from 'next/cache'

// ✅ Good - Revalidate specific paths
export async function createRecipe(data: RecipeFormData) {
  // ... create recipe logic

  // Invalidate multiple related paths
  revalidatePath('/recipes') // Recipe list page
  revalidatePath('/my-cookbook') // User's cookbook
  revalidatePath(`/users/${userId}/recipes`) // User profile recipes
}

// ✅ Good - Use tags for granular control
export async function getRecipes() {
  const { data } = await supabase
    .from('recipes')
    .select('*')

  // Tag this data for later invalidation
  return data
}

export async function updateRecipe(id: string, data: Partial<Recipe>) {
  // ... update logic

  // Invalidate tagged cache
  revalidateTag('recipes')
  revalidateTag(`recipe-${id}`)
}
```