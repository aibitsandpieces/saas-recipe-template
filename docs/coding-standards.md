# Coding Standards

Rules for TypeScript conventions, naming, and file organization in this SaaS template.

## File Naming & Organization

### File Naming Conventions
- **React Components**: PascalCase (e.g., `RecipeCard.tsx`, `CommentForm.tsx`)
- **Pages**: lowercase with hyphens (e.g., `sign-in`, `my-cookbook`)
- **Utilities & Actions**: camelCase (e.g., `recipe.actions.ts`, `utils.ts`)
- **Types**: camelCase (e.g., `index.d.ts`)
- **Config Files**: kebab-case (e.g., `next.config.ts`, `eslint.config.mjs`)

### Directory Structure Rules
```
app/
├── (auth)/           # Route groups use parentheses
├── [dynamic]/        # Dynamic routes use brackets
├── _components/      # Private components (underscore prefix)
└── page.tsx          # Page files are always named 'page.tsx'

components/
├── ui/              # shadcn/ui components only
└── [Component].tsx  # Business components in root

lib/
├── actions/         # Server actions grouped by domain
├── utils.ts         # Shared utilities
└── supabase.ts     # Third-party client configs
```

## TypeScript Conventions

### Interface & Type Definitions
```typescript
// ✅ Good - Use interfaces for object shapes
interface Recipe {
  id?: string
  name: string
  ingredients: string[]
  instructions: string
  user_id: string
}

// ✅ Good - Use type aliases for unions
type Status = 'pending' | 'in_progress' | 'completed'

// ❌ Avoid - Don't use any
const data: any = response.data

// ✅ Good - Use proper typing
const data: Recipe[] = response.data
```

### Import Organization
```typescript
// ✅ Good - Import order
// 1. React/Next.js imports
import React from 'react'
import { NextRequest } from 'next/server'

// 2. Third-party libraries
import { clsx } from 'clsx'
import { z } from 'zod'

// 3. Internal imports - absolute paths
import { Button } from '@/components/ui/button'
import { createRecipe } from '@/lib/actions/recipe.actions'

// 4. Relative imports
import './styles.css'
```

### Function Definitions
```typescript
// ✅ Good - Arrow functions for components
const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
  return <div>{recipe.name}</div>
}

// ✅ Good - Regular functions for actions
export async function createRecipe(data: RecipeFormData) {
  // Server action logic
}

// ✅ Good - Async/await over promises
export async function getRecipes() {
  const { data } = await supabase.from('recipes').select('*')
  return data
}
```

## Variable Naming

### Naming Patterns
- **Components**: PascalCase (`RecipeCard`, `CommentForm`)
- **Functions**: camelCase (`getUserRecipes`, `createComment`)
- **Variables**: camelCase (`recipeData`, `isLoading`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS`, `DEFAULT_LIMIT`)
- **Database fields**: snake_case (to match Supabase conventions)

### Boolean Variables
```typescript
// ✅ Good - Use is/has/can/should prefixes
const isLoading = true
const hasAccess = user?.subscription?.active
const canEdit = recipe.user_id === userId
const shouldShowUpgrade = !userIsPro

// ❌ Avoid - Unclear boolean names
const loading = true
const access = user?.subscription?.active
```

### Event Handlers
```typescript
// ✅ Good - Use handle prefix
const handleSubmit = (e: FormEvent) => { ... }
const handleRecipeClick = (id: string) => { ... }
const handleDeleteConfirm = async () => { ... }
```

## Error Handling

### Server Actions
```typescript
// ✅ Good - Consistent error handling pattern
export async function createRecipe(data: RecipeFormData) {
  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { success: false, error: 'Failed to create recipe' }
    }

    return { success: true, data: recipe }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Something went wrong' }
  }
}
```

### Client Components
```typescript
// ✅ Good - Handle loading and error states
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleSubmit = async (data: RecipeFormData) => {
  setIsLoading(true)
  setError(null)

  try {
    const result = await createRecipe(data)
    if (!result.success) {
      setError(result.error)
      return
    }
    // Success handling
  } catch (err) {
    setError('Something went wrong')
  } finally {
    setIsLoading(false)
  }
}
```

## Code Comments

### When to Comment
```typescript
// ✅ Good - Explain WHY, not WHAT
// RLS policies ensure users can only see their own unlocked recipes
const { data } = await supabase
  .from('recipes_unlocked')
  .select('recipe_id')

// ✅ Good - Complex business logic
// Free users can unlock up to 3 recipes, pro users unlimited
const canUnlock = userIsPro || unlockedCount < FREE_RECIPE_LIMIT

// ❌ Avoid - Obvious comments
// Get all recipes from database
const recipes = await getRecipes()
```

### TODO Comments
```typescript
// TODO: Add pagination for recipe list (Issue #123)
// FIXME: Handle edge case when user has no subscription
// NOTE: This workaround is needed until Clerk fixes webhook timing
```

## Code Formatting

### Line Length & Breaks
- Max line length: 80 characters (enforced by Prettier)
- Break long function calls and object literals

```typescript
// ✅ Good - Break long parameter lists
const recipe = await createRecipe({
  name: data.name,
  ingredients: data.ingredients,
  instructions: data.instructions,
  userId: user.id
})

// ✅ Good - Break long chains
const result = await supabase
  .from('recipes')
  .select('*, comments(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

### Object & Array Formatting
```typescript
// ✅ Good - Consistent trailing commas
const config = {
  apiUrl: process.env.API_URL,
  timeout: 5000,
  retries: 3,
}

// ✅ Good - Multi-line arrays
const requiredFields = [
  'name',
  'ingredients',
  'instructions',
]
```

## Performance Considerations

### Component Optimization
```typescript
// ✅ Good - Memoize expensive calculations
const sortedRecipes = useMemo(() =>
  recipes.sort((a, b) => a.name.localeCompare(b.name)),
  [recipes]
)

// ✅ Good - Memoize callbacks to prevent re-renders
const handleRecipeClick = useCallback((id: string) => {
  router.push(`/recipes/${id}`)
}, [router])
```

### Server Component Patterns
```typescript
// ✅ Good - Fetch data in Server Components
export default async function RecipesPage() {
  const recipes = await getRecipes()

  return (
    <div>
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}
```

## Security Best Practices

### Input Validation
```typescript
// ✅ Good - Always validate input with Zod
const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  ingredients: z.array(z.string()).min(1, 'At least one ingredient required'),
  instructions: z.string().min(10, 'Instructions too short'),
})

export async function createRecipe(formData: FormData) {
  const validatedData = recipeSchema.parse({
    name: formData.get('name'),
    ingredients: JSON.parse(formData.get('ingredients') as string),
    instructions: formData.get('instructions'),
  })
  // Proceed with validated data
}
```

### Authentication Checks
```typescript
// ✅ Good - Always check auth in server actions
export async function deleteRecipe(recipeId: string) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Verify user owns the recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .single()

  if (recipe?.user_id !== userId) {
    throw new Error('Forbidden')
  }

  // Proceed with deletion
}
```