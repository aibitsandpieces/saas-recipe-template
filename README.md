# Multi-Tenant SaaS Template

<div align="center">
  <h3 align="center">Production-Ready Multi-Tenant SaaS Foundation</h3>

  <div>
    <img src="https://img.shields.io/badge/-Next.JS-black?style=for-the-badge&logoColor=white&logo=nextdotjs&color=black" alt="next.js" />
    <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
    <img src="https://img.shields.io/badge/-Tailwind-00BCFF?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img src="https://img.shields.io/badge/-Clerk-6C47FF?style=for-the-badge&logoColor=white&logo=clerk" alt="clerk" />
    <img src="https://img.shields.io/badge/-Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  </div>

  <p align="center">
    A complete, tested, production-ready foundation for building multi-tenant SaaS applications with organization isolation, role-based access control, and modern authentication.
  </p>
</div>

## 📋 Table of Contents

1. 🤖 [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🏗️ [Architecture](#architecture)
5. 🚀 [Quick Start](#quick-start)
6. 📚 [Documentation](#documentation)
7. 🔧 [Customization](#customization)

## 🤖 Introduction

This is a **battle-tested multi-tenant SaaS foundation** that provides everything you need to build scalable SaaS applications with proper organization isolation, role-based permissions, and enterprise-grade security.

**What makes this special:**
- ✅ **Fully implemented multi-tenant architecture** with organization data isolation
- ✅ **3-role RBAC system** (platform_admin, org_admin, org_member)
- ✅ **Production-tested** authentication and authorization flows
- ✅ **Row Level Security (RLS)** policies for data protection
- ✅ **Comprehensive testing plan** and documentation
- ✅ **Ready to customize** for any business domain

## ⚙️ Tech Stack

- **[Next.js 16.1.6](https://nextjs.org/)** - React framework with App Router and Server Components
- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Type safety and better developer experience
- **[Clerk](https://clerk.com/)** - Authentication, user management, and subscription billing
- **[Supabase](https://supabase.com/)** - PostgreSQL database with real-time features and RLS
- **[shadcn/ui](https://ui.shadcn.com/)** - Modern component library built on Radix UI
- **[Tailwind CSS 4.x](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

## 🔋 Features

### 🏢 Multi-Tenant Architecture
- **Organization isolation** - Complete data separation between organizations
- **Cross-organization access control** - Platform admins can access all data
- **Scalable database design** - Optimized for performance at scale

### 👥 Role-Based Access Control (RBAC)
- **Platform Admin** - Global access across all organizations
- **Organization Admin** - Administrative access within their organization
- **Organization Member** - Standard user access within their organization

### 🔐 Enterprise-Grade Security
- **JWT-based authentication** with custom claims
- **Row Level Security (RLS)** policies in PostgreSQL
- **Third-party auth integration** (Clerk + Supabase OIDC)
- **Comprehensive security testing** - Tested for common vulnerabilities

### 🚀 Developer Experience
- **Type-safe database operations** with TypeScript
- **Server Actions** for secure backend operations
- **Modern React patterns** with hooks and components
- **Comprehensive documentation** and setup guides

### 📱 Production Ready
- **Responsive design** works on all devices
- **Performance optimized** with Next.js 16.1.6 and Turbopack
- **Error handling** and user feedback systems
- **Testing framework** with validation procedures

## 🏗️ Architecture

### Multi-Tenant Database Design
```sql
organisations    # Organization entities
├── users        # User profiles (synced via webhooks)
├── roles        # RBAC role definitions
├── user_roles   # Role assignments
└── [your_data] # Your business entities (auto-scoped to organization)
```

### Authentication Flow
```
User Sign-in → Clerk JWT → Custom Claims → Supabase RLS → Organization-Scoped Data
```

### Security Model
- **JWT tokens** contain `org_id` and `user_role` claims
- **RLS policies** automatically filter data by organization
- **Server actions** validate user context before operations
- **Middleware protection** on all routes

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/en)
- [Git](https://git-scm.com/)
- [Supabase account](https://supabase.com/)
- [Clerk account](https://clerk.com/)

### 1. Clone and Install
```bash
git clone <your-template-repo-url>
cd your-saas-project
npm install
```

### 2. Environment Setup
Create `.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Webhook (for user sync)
CLERK_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### 3. Database Setup
```bash
# Run the multi-tenant schema migration
supabase db push
# Or manually run: supabase/migrations/001_multi_tenant_schema.sql
```

### 4. Clerk Configuration
See `docs/setup-guide.md` for detailed Clerk + Supabase integration steps.

### 5. Start Development
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your multi-tenant SaaS foundation!

## 📚 Documentation

- **[Setup Guide](docs/setup-guide.md)** - Step-by-step configuration instructions
- **[Architecture Guide](docs/architecture.md)** - Detailed system architecture
- **[Customization Guide](docs/customization-guide.md)** - How to adapt for your business domain
- **[Testing Plan](docs/testing-plan-multi-tenant-saas.md)** - Comprehensive testing procedures
- **[Integration Guide](docs/clerk-supabase-jwt-integration-2025.md)** - Clerk + Supabase setup

## 🔧 Customization

### Adapt for Your Business Domain

This template includes a "recipe" example to demonstrate patterns. To customize for your business:

1. **Replace business entities**: Update `types/index.d.ts` with your data models
2. **Update database schema**: Modify tables in `supabase/migrations/`
3. **Update server actions**: Adapt `lib/actions/` for your business logic
4. **Update UI components**: Customize pages in `app/` and components in `components/`
5. **Update branding**: Change colors, logos, and content

### Key Files to Customize
```
types/index.d.ts           # Your data models
supabase/migrations/       # Your database schema
lib/actions/              # Your business logic
app/[your-domain]/        # Your app pages
components/[your-domain]/ # Your app components
```

### Preservation Patterns ⚠️
**Keep these patterns when customizing:**
- Organization scoping in all database operations
- User context validation in server actions
- RLS policies for data isolation
- JWT claims structure for authentication

## 🧪 Testing

Run the comprehensive test suite:
```bash
# Follow the testing plan
docs/testing-plan-multi-tenant-saas.md

# Key test areas:
# - Multi-tenant isolation
# - Role-based access control
# - Authentication flows
# - Security boundaries
```

## 🤝 Contributing

This is a template repository. Feel free to:
- Fork and adapt for your needs
- Report issues or improvements
- Share your success stories

## 📄 License

This template is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ for the SaaS community**

Ready to build your next multi-tenant SaaS application? This foundation handles the complex authentication and multi-tenancy patterns, so you can focus on your unique business value.