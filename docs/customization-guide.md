# Multi-Tenant SaaS Template - Customization Guide

This guide shows you how to adapt the multi-tenant template from the "Recipe Emporium" example to your specific business domain while preserving the critical multi-tenant architecture patterns.

## 🎯 Overview

The template uses "recipes" as an example business domain to demonstrate multi-tenant patterns. You'll replace this with your business entities while keeping the authentication, organization scoping, and security patterns intact.

**What You're Changing**: Business domain (recipes → your entities)
**What You're Keeping**: Multi-tenant architecture, authentication, security, RBAC

## 📋 Customization Checklist

### Phase 1: Planning
- [ ] Define your business entities and relationships
- [ ] Map your user roles and permissions
- [ ] Design your database schema
- [ ] Plan your UI/UX flows

### Phase 2: Backend Implementation
- [ ] Update TypeScript types
- [ ] Create database migration
- [ ] Update server actions
- [ ] Test database operations

### Phase 3: Frontend Implementation
- [ ] Update UI components
- [ ] Create new pages
- [ ] Update navigation and routing
- [ ] Test user flows

### Phase 4: Testing & Deployment
- [ ] Run comprehensive tests
- [ ] Update documentation
- [ ] Deploy to production

## 🏗️ Phase 1: Planning Your Business Domain

### Define Your Business Entities

**Example Mappings:**

| Recipe Template | → | Your SaaS | Example |
|----------------|---|-----------|---------|
| Recipe | → | Project | Task management |
| Recipe | → | Course | Learning platform |
| Recipe | → | Product | E-commerce |
| Recipe | → | Patient | Healthcare |
| Recipe | → | Property | Real estate |

### Define Relationships

```typescript
// Example: Task Management SaaS
interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  // Required multi-tenant fields
  user_id: string;           // Creator
  organisation_id: string;   // Organization scope
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id: string;        // Foreign key
  // Required multi-tenant fields
  user_id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
}
```

### Map User Roles and Permissions

```typescript
// Example permissions for task management
const PERMISSIONS = {
  platform_admin: {
    // Cross-organization access
    projects: ['create', 'read', 'update', 'delete', 'all_orgs'],
    tasks: ['create', 'read', 'update', 'delete', 'all_orgs'],
    users: ['read', 'update', 'all_orgs'],
  },
  org_admin: {
    // Organization-wide access
    projects: ['create', 'read', 'update', 'delete'],
    tasks: ['create', 'read', 'update', 'delete'],
    users: ['read', 'invite'],
  },
  org_member: {
    // Limited access within organization
    projects: ['read'],
    tasks: ['create', 'read', 'update_own', 'delete_own'],
  }
};
```

## 🏗️ Phase 2: Backend Implementation

### Step 1: Update TypeScript Types

**File**: `types/index.d.ts`

```typescript
// Replace Recipe/Comment interfaces with your business entities

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';

  // Required multi-tenant fields (keep these!)
  user_id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;

  // Optional computed fields
  userFirstName?: string;
  userImageUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id: string;

  // Required multi-tenant fields (keep these!)
  user_id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
}

// Keep the user-related interfaces as they are
export interface UserContext {
  id: string;
  clerkId: string;
  organisationId: string | null;
  email: string | null;
  name: string | null;
  roles: string[];
}
```

### Step 2: Create Database Migration

**File**: `supabase/migrations/002_your_business_schema.sql`

```sql
-- Example: Task management schema
-- Replace recipes/comments with your business tables

-- Projects table (equivalent to recipes)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),

  -- Required multi-tenant columns (keep these!)
  user_id UUID REFERENCES users(id) NOT NULL,
  organisation_id UUID REFERENCES organisations(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (equivalent to comments)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Required multi-tenant columns (keep these!)
  user_id UUID REFERENCES users(id) NOT NULL,
  organisation_id UUID REFERENCES organisations(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all business tables (critical!)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects (copy pattern from recipes)
CREATE POLICY "users_see_own_org_projects" ON projects
FOR SELECT TO authenticated
USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "platform_admins_see_all_projects" ON projects
FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_insert_own_org_projects" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  organisation_id = (auth.jwt() ->> 'org_id')::uuid
  AND user_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY "users_update_own_projects" ON projects
FOR UPDATE TO authenticated
USING (user_id = (auth.jwt() ->> 'sub')::uuid);

CREATE POLICY "users_delete_own_projects" ON projects
FOR DELETE TO authenticated
USING (user_id = (auth.jwt() ->> 'sub')::uuid);

-- Similar RLS policies for tasks
CREATE POLICY "users_see_own_org_tasks" ON tasks
FOR SELECT TO authenticated
USING (organisation_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "platform_admins_see_all_tasks" ON tasks
FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'user_role') = 'platform_admin');

CREATE POLICY "users_insert_own_org_tasks" ON tasks
FOR INSERT TO authenticated
WITH CHECK (
  organisation_id = (auth.jwt() ->> 'org_id')::uuid
  AND user_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY "users_update_own_tasks" ON tasks
FOR UPDATE TO authenticated
USING (user_id = (auth.jwt() ->> 'sub')::uuid);

CREATE POLICY "users_delete_own_tasks" ON tasks
FOR DELETE TO authenticated
USING (user_id = (auth.jwt() ->> 'sub')::uuid);

-- Create indexes for performance
CREATE INDEX idx_projects_organisation_id ON projects(organisation_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_tasks_organisation_id ON tasks(organisation_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
```

### Step 3: Update Server Actions

**File**: `lib/actions/project.actions.ts` (copy from `recipe.actions.ts`)

```typescript
"use server";

import { Project } from "@/types";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { getCurrentUser, requireUserWithOrg } from "../auth/user";

// Get all projects in the current user's organisation
export const getProjects = async () => {
  const user = await getCurrentUser();
  if (!user || !user.organisationId) {
    return [];
  }

  const supabase = await createSupabaseClient();

  // RLS policies will automatically filter by organisation_id from JWT claims
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, description, status, user_id, organisation_id");

  if (error) throw new Error(error.message);

  // Get author details from Clerk
  const userIds = projects.map((project) => project.user_id);
  const clerk = await clerkClient();
  const users = await clerk.users.getUserList({ userId: userIds });

  // Merge user details
  const projectsWithUserDetails = projects.map((project) => {
    const projectUser = users.data.find((u) => u.id === project.user_id);
    return {
      ...project,
      userFirstName: projectUser?.firstName,
      userImageUrl: projectUser?.imageUrl,
    };
  });

  return projectsWithUserDetails;
};

// Get a single project by id within the user's organisation
export const getProject = async (id: string) => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    throw new Error("Unauthorized: User not assigned to organisation");
  }

  const supabase = await createSupabaseClient();

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select()
    .eq("id", id)
    .single();

  if (projectError) {
    // Better error handling than the recipe example
    if (projectError.code === 'PGRST116') {
      return null; // Not found (RLS filtered it out)
    }
    throw new Error(projectError.message);
  }

  return projectData;
};

// Create a new project within the user's organisation
export const createProject = async (project: Omit<Project, 'id' | 'user_id' | 'organisation_id' | 'created_at' | 'updated_at'>) => {
  const { user, organisationId } = await requireUserWithOrg();

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: project.name,
      description: project.description,
      status: project.status || 'active',
      user_id: user.clerkId,
      organisation_id: organisationId,
    })
    .select();

  if (error) throw new Error(error.message);

  return data[0];
};

// Update project (only if user owns it or has admin role)
export const updateProject = async (id: string, updates: Partial<Project>) => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    throw new Error("Unauthorized: User not assigned to organisation");
  }

  const supabase = await createSupabaseClient();

  // RLS policies will automatically prevent unauthorized updates
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);

  return data[0];
};

// Delete project (only if user owns it or has admin role)
export const deleteProject = async (id: string) => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    throw new Error("Unauthorized: User not assigned to organisation");
  }

  const supabase = await createSupabaseClient();

  // RLS policies will automatically prevent unauthorized deletes
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  return { success: true };
};
```

**File**: `lib/actions/task.actions.ts`

```typescript
"use server";

import { Task } from "@/types";
import { createSupabaseClient } from "../supabase";
import { getCurrentUser, requireUserWithOrg } from "../auth/user";

// Get all tasks for a specific project within user's organisation
export const getProjectTasks = async (projectId: string) => {
  const user = await getCurrentUser();
  if (!user || !user.organisationId) {
    return [];
  }

  const supabase = await createSupabaseClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return tasks;
};

// Create a new task within the user's organisation
export const createTask = async (task: Omit<Task, 'id' | 'user_id' | 'organisation_id' | 'created_at' | 'updated_at'>) => {
  const { user, organisationId } = await requireUserWithOrg();

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...task,
      user_id: user.clerkId,
      organisation_id: organisationId,
    })
    .select();

  if (error) throw new Error(error.message);

  return data[0];
};

// Additional task operations...
export const updateTask = async (id: string, updates: Partial<Task>) => {
  // Similar pattern to updateProject
};

export const deleteTask = async (id: string) => {
  // Similar pattern to deleteProject
};
```

## 🎨 Phase 3: Frontend Implementation

### Step 1: Update Navigation and Routes

**File**: `app/layout.tsx` - Update navigation

```tsx
// Replace recipe-related navigation with your business domain
const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Projects', href: '/projects' },        // was '/recipes'
  { name: 'My Projects', href: '/my-projects' },  // was '/my-cookbook'
  { name: 'Team', href: '/team' },
  { name: 'Settings', href: '/settings' },
];
```

### Step 2: Create New Page Structure

**Rename/Create Directories:**
```bash
# Rename recipe pages to your domain
mv app/recipes app/projects
mv app/my-cookbook app/my-projects

# Or create new directories
mkdir app/projects
mkdir app/my-projects
```

### Step 3: Update Page Components

**File**: `app/projects/page.tsx` (copy from `app/recipes/page.tsx`)

```tsx
import { getProjects } from "@/lib/actions/project.actions";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Link href="/projects/new">
          <Button>Create Project</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No projects yet</p>
          <Link href="/projects/new">
            <Button>Create Your First Project</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
```

**File**: `components/ProjectCard.tsx` (copy from `components/RecipeCard.tsx`)

```tsx
import { Project } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ProjectCardProps {
  project: Project & {
    userFirstName?: string;
    userImageUrl?: string;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    archived: "bg-gray-100 text-gray-800",
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <Badge className={statusColors[project.status]}>
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center text-sm text-gray-500">
            {project.userImageUrl && (
              <img
                src={project.userImageUrl}
                alt={project.userFirstName || 'User'}
                className="w-5 h-5 rounded-full mr-2"
              />
            )}
            <span>by {project.userFirstName || 'Unknown'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Step 4: Update Forms and Schemas

**File**: `lib/schemas.ts` (update validation schemas)

```typescript
import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]).default("active"),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().optional(),
  project_id: z.string().uuid("Invalid project ID"),
});
```

## 🧪 Phase 4: Testing & Validation

### Test Your Customization

1. **Database Operations**:
   ```bash
   # Test in Supabase SQL Editor
   SELECT * FROM projects;
   SELECT * FROM tasks;

   # Verify RLS is working
   SELECT COUNT(*) FROM projects; -- Should respect user context
   ```

2. **API Endpoints**:
   - Test project creation, reading, updating, deletion
   - Verify organization isolation
   - Test user permissions

3. **Frontend**:
   - Test all user flows
   - Verify responsive design
   - Test error handling

### Preserve Multi-Tenant Patterns

**✅ Critical Patterns to Preserve:**

```typescript
// 1. Always use organization context
const { user, organisationId } = await requireUserWithOrg();

// 2. Always include organisation_id in database inserts
.insert({
  ...data,
  user_id: user.clerkId,
  organisation_id: organisationId,  // Critical!
})

// 3. Always validate user context in server actions
if (!user || !user.organisationId) {
  throw new Error("Unauthorized");
}

// 4. Keep RLS policies for all business tables
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

## 🚀 Deployment

After customization:

1. **Update environment variables** for production
2. **Run database migrations** in production Supabase
3. **Update Clerk configuration** for production domain
4. **Test thoroughly** using the testing plan
5. **Deploy frontend** to your hosting platform

## 📚 Additional Customizations

### Branding and Styling
- Update colors in `tailwind.config.js`
- Replace logos and images in `public/`
- Update meta tags and SEO content

### Advanced Features
- Add real-time subscriptions with Supabase
- Implement file uploads for your entities
- Add search and filtering
- Create admin dashboards
- Set up analytics and monitoring

### Performance Optimizations
- Add database indexes for your queries
- Implement caching strategies
- Optimize images and assets
- Set up CDN for static files

---

**Remember**: The multi-tenant foundation is production-ready. Focus your customization on business logic while preserving the security and isolation patterns that make this template valuable.