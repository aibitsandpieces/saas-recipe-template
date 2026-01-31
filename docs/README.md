# SaaS Template Documentation

This directory contains comprehensive guidelines for AI assistants working on this SaaS template project.

## Documentation Overview

### Essential Files ⭐

1. **[coding-standards.md](./coding-standards.md)** - TypeScript conventions, naming, file organization
2. **[architecture-rules.md](./architecture-rules.md)** - Next.js patterns, server/client components, folder structure
3. **[database-patterns.md](./database-patterns.md)** - Supabase usage, server actions, RLS policies
4. **[authentication-security.md](./authentication-security.md)** - Clerk integration, security best practices
5. **[ui-component-guidelines.md](./ui-component-guidelines.md)** - shadcn/ui usage, Tailwind patterns, responsive design

## Quick Reference

### For AI Assistants
- Read the relevant documentation files before making code changes
- Follow established patterns for consistency
- Reference the specific examples in each file

### For New Developers
- Start with `coding-standards.md` for basic conventions
- Read `architecture-rules.md` to understand the project structure
- Review security guidelines in `authentication-security.md`

### For Code Reviews
- Check adherence to patterns outlined in these files
- Verify security best practices are followed
- Ensure UI components follow the established design system

## Key Principles

### 🔒 Security First
- Always authenticate users before database operations
- Validate all input with Zod schemas
- Use Row Level Security (RLS) for data protection
- Never expose sensitive data in client components

### 🏗️ Architecture
- Server Components for data fetching
- Client Components for interactivity only
- Server Actions for mutations
- Proper separation of concerns

### 🎨 UI/UX
- Use shadcn/ui components consistently
- Follow Tailwind CSS patterns
- Ensure accessibility (ARIA labels, keyboard navigation)
- Mobile-first responsive design

### 📊 Database
- Use Supabase with proper RLS policies
- Implement proper error handling
- Cache invalidation strategies
- Efficient queries and joins

### 🚀 Performance
- Image optimization with Next.js Image
- Code splitting with dynamic imports
- Proper caching strategies
- Bundle optimization

## Technology Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## File Structure

```
docs/
├── README.md                     # This overview file
├── coding-standards.md           # TypeScript & code conventions
├── architecture-rules.md         # Next.js & project structure
├── database-patterns.md          # Supabase & data handling
├── authentication-security.md    # Security & auth patterns
└── ui-component-guidelines.md    # UI/UX & design system
```

## Future Additions

When the project grows, consider adding:
- `form-validation-patterns.md` - Advanced form patterns
- `error-handling-standards.md` - Comprehensive error strategies
- `performance-optimization.md` - Advanced performance techniques
- `testing-guidelines.md` - Testing strategies and patterns

## Contributing

When updating these guidelines:
1. Keep examples specific to the project's tech stack
2. Include both ✅ good and ❌ bad examples
3. Provide context for why patterns are recommended
4. Keep documentation up-to-date with code changes

---

These guidelines ensure consistent, secure, and maintainable code across the SaaS template project.