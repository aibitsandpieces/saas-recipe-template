# UI Component Guidelines

Guidelines for shadcn/ui usage, Tailwind patterns, and responsive design in this SaaS template.

## shadcn/ui Component System

### Component Installation & Usage
```bash
# Install new shadcn/ui components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
```

### Import Patterns
```typescript
// ✅ Good - Import from configured paths
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// ❌ Avoid - Don't modify ui components directly
// Instead, create wrapper components for customization
```

### Button Component Patterns
```typescript
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Trash2 } from 'lucide-react'

// ✅ Good - Use button variants consistently
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outlined Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="destructive">Delete</Button>

// ✅ Good - Button sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// ✅ Good - Loading states
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Creating...
    </>
  ) : (
    <>
      <Plus className="mr-2 h-4 w-4" />
      Create Recipe
    </>
  )}
</Button>

// ✅ Good - Icon buttons
<Button variant="outline" size="sm">
  <Trash2 className="h-4 w-4" />
  <span className="sr-only">Delete</span>
</Button>
```

### Form Component Patterns
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  instructions: z.string().min(10, 'Instructions must be at least 10 characters'),
})

export function RecipeForm() {
  const form = useForm<z.infer<typeof recipeSchema>>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: '',
      instructions: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipe Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter recipe name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe how to make this recipe..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Create Recipe
        </Button>
      </form>
    </Form>
  )
}
```

### Dialog Component Patterns
```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ✅ Good - Controlled dialog with state
export function CreateRecipeDialog() {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    // Refresh data or show success message
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Recipe</DialogTitle>
        </DialogHeader>
        <RecipeForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}

// ✅ Good - Confirmation dialog pattern
export function DeleteConfirmDialog({
  recipeName,
  onConfirm,
  children
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    await onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Recipe</DialogTitle>
        </DialogHeader>
        <p>
          Are you sure you want to delete <strong>{recipeName}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Tailwind CSS Patterns

### Layout & Spacing
```tsx
// ✅ Good - Consistent spacing scale (4px increments)
<div className="p-4">         {/* 16px padding */}
<div className="p-6">         {/* 24px padding */}
<div className="p-8">         {/* 32px padding */}

<div className="space-y-4">   {/* 16px vertical spacing between children */}
<div className="space-y-6">   {/* 24px vertical spacing */}

<div className="gap-4">       {/* 16px gap in flex/grid */}

// ✅ Good - Use semantic spacing for different contexts
<div className="space-y-2">   {/* Tight spacing for related elements */}
<div className="space-y-4">   {/* Normal spacing for form fields */}
<div className="space-y-8">   {/* Loose spacing for sections */}
```

### Typography Hierarchy
```tsx
// ✅ Good - Consistent typography scale
<h1 className="text-4xl font-bold tracking-tight">Main Heading</h1>
<h2 className="text-3xl font-semibold">Section Heading</h2>
<h3 className="text-2xl font-semibold">Subsection Heading</h3>
<h4 className="text-xl font-medium">Card Title</h4>

<p className="text-base">Body text (16px)</p>
<p className="text-sm text-muted-foreground">Secondary text (14px)</p>
<p className="text-xs text-muted-foreground">Small text (12px)</p>

// ✅ Good - Use semantic color classes
<p className="text-foreground">Primary text color</p>
<p className="text-muted-foreground">Secondary text color</p>
<p className="text-destructive">Error text</p>
<p className="text-primary">Brand accent text</p>
```

### Color System
```tsx
// ✅ Good - Use CSS custom properties from shadcn/ui
<div className="bg-background">      {/* Main background */}
<div className="bg-card">            {/* Card background */}
<div className="bg-muted">           {/* Subtle background */}
<div className="bg-primary">         {/* Brand color */}
<div className="bg-secondary">       {/* Secondary brand color */}
<div className="bg-destructive">     {/* Error/danger color */}

<div className="border-border">      {/* Default border */}
<div className="border-input">       {/* Input border */}
<div className="border-primary">     {/* Brand border */}

// ✅ Good - Hover and focus states
<button className="bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Interactive Element
</button>
```

### Responsive Design Patterns
```tsx
// ✅ Good - Mobile-first responsive design
<div className="
  p-4 sm:p-6 lg:p-8
  text-base sm:text-lg lg:text-xl
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  gap-4 sm:gap-6 lg:gap-8
">

// ✅ Good - Container patterns
<div className="container mx-auto px-4 max-w-7xl">
  {/* Full-width container with horizontal padding */}
</div>

<div className="max-w-2xl mx-auto">
  {/* Narrow content container */}
</div>

// ✅ Good - Responsive navigation
<nav className="
  fixed bottom-0 left-0 right-0 bg-background border-t
  sm:relative sm:border-t-0 sm:bg-transparent
  lg:flex lg:items-center lg:space-x-6
">
```

### Grid & Flexbox Patterns
```tsx
// ✅ Good - Card grid layouts
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {recipes.map(recipe => (
    <RecipeCard key={recipe.id} recipe={recipe} />
  ))}
</div>

// ✅ Good - Flex layouts for headers
<header className="flex items-center justify-between p-4">
  <Logo />
  <NavigationMenu />
  <UserButton />
</header>

// ✅ Good - Sidebar layouts
<div className="flex h-screen">
  <aside className="w-64 bg-muted p-4">
    <Sidebar />
  </aside>
  <main className="flex-1 overflow-auto p-6">
    <Content />
  </main>
</div>
```

## Custom Component Patterns

### Wrapper Components
```typescript
// components/RecipeCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface RecipeCardProps {
  recipe: Recipe
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
}

// ✅ Good - Consistent card pattern
export function RecipeCard({ recipe, onEdit, onDelete, showActions = false }: RecipeCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="line-clamp-2">{recipe.name}</CardTitle>
            <CardDescription>
              {recipe.ingredients.length} ingredients
            </CardDescription>
          </div>
          {recipe.isPremium && (
            <Badge variant="secondary">Premium</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {recipe.instructions}
        </p>
      </CardContent>

      {showActions && (
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit?.(recipe.id)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete?.(recipe.id)}>
              Delete
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
```

### Loading State Components
```typescript
// components/RecipeCardSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function RecipeCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-3 bg-muted animate-pulse rounded" />
          <div className="h-3 bg-muted animate-pulse rounded" />
          <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}

// Usage in loading states
export function RecipesPageLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

### Empty State Components
```typescript
// components/EmptyState.tsx
import { Button } from '@/components/ui/button'
import { Plus, ChefHat } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ComponentType<{ className?: string }>
  }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
        <ChefHat className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          <ActionIcon className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Usage
<EmptyState
  title="No recipes yet"
  description="Start building your cookbook by creating your first recipe."
  action={{
    label: "Create Recipe",
    onClick: () => setShowCreateDialog(true),
    icon: Plus
  }}
/>
```

## Accessibility Patterns

### Keyboard Navigation
```typescript
// ✅ Good - Proper keyboard navigation
<div
  role="button"
  tabIndex={0}
  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  Clickable Element
</div>

// ✅ Good - Skip links for screen readers
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-background px-4 py-2 rounded"
>
  Skip to main content
</a>
```

### ARIA Labels & Roles
```typescript
// ✅ Good - Descriptive ARIA labels
<Button
  variant="ghost"
  size="sm"
  onClick={() => onDelete(recipe.id)}
  aria-label={`Delete ${recipe.name}`}
>
  <Trash2 className="h-4 w-4" />
</Button>

// ✅ Good - Form accessibility
<FormField
  control={form.control}
  name="ingredients"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Ingredients</FormLabel>
      <FormControl>
        <Textarea
          {...field}
          aria-describedby="ingredients-help"
          className="min-h-[100px]"
        />
      </FormControl>
      <FormDescription id="ingredients-help">
        List each ingredient on a new line
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Color Contrast & Visual Hierarchy
```tsx
// ✅ Good - Sufficient color contrast
<div className="text-foreground">         {/* High contrast text */}
<div className="text-muted-foreground">   {/* Medium contrast secondary text */}

// ✅ Good - Don't rely only on color for meaning
<Badge variant="destructive" className="flex items-center gap-1">
  <AlertTriangle className="h-3 w-3" />
  Error
</Badge>

<Badge variant="default" className="flex items-center gap-1">
  <CheckCircle className="h-3 w-3" />
  Success
</Badge>
```

## Performance Considerations

### Image Optimization
```typescript
import Image from 'next/image'

// ✅ Good - Optimized images with proper sizing
<Image
  src={recipe.imageUrl}
  alt={recipe.name}
  width={300}
  height={200}
  className="object-cover rounded-lg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isAboveFold}
/>
```

### Bundle Optimization
```typescript
// ✅ Good - Lazy load heavy components
import dynamic from 'next/dynamic'

const RecipeEditor = dynamic(() => import('./RecipeEditor'), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded" />,
})

// ✅ Good - Only load icons that are used
import { ChefHat, Plus, Trash2 } from 'lucide-react'
// Don't import entire lucide-react package
```

### CSS Performance
```tsx
// ✅ Good - Use CSS custom properties for theming
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
}

// ✅ Good - Optimize Tailwind bundle
// Only include used classes in production build
<div className="bg-background text-foreground p-4 rounded-lg shadow-sm">
```