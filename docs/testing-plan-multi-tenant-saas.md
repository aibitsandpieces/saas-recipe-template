# Multi-Tenant SaaS Testing Plan

## Overview

This document outlines comprehensive testing procedures for the Recipe Emporium multi-tenant SaaS system with 3-role RBAC (platform_admin, org_admin, org_member) and Clerk + Supabase integration.

## Testing Environment Setup

### Prerequisites
- ✅ Development server running on `http://localhost:3000`
- ✅ Supabase database with multi-tenant schema deployed
- ✅ Clerk Third-Party Auth configured
- ✅ All three test users created and assigned to organizations

### Test User Accounts

| Email | Role | Organization | Organization ID |
|-------|------|--------------|-----------------|
| gareth@aipotential.ai | platform_admin | AI Potential | 6eb05a8c-b759-4d7e-9df5-333e969972e0 |
| garethtestingthings@gmail.com | org_admin | Test Org | b2deeda9-08fa-4141-8170-ef4aefc3f6d4 |
| broadhat@gmail.com | org_member | Test Org | b2deeda9-08fa-4141-8170-ef4aefc3f6d4 |

## 1. Authentication & Authorization Testing

### 1.1 JWT Token Validation
**Objective**: Verify JWT tokens contain correct claims for each user role

**Test Steps**:
1. Sign in as each test user
2. Run JWT inspection code in browser console:
   ```javascript
   window.Clerk.session.getToken().then(token => {
       const payload = JSON.parse(atob(token.split('.')[1]));
       console.log('Role:', payload.role, 'User Role:', payload.user_role, 'Org ID:', payload.org_id);
   });
   ```

**Expected Results**:
- All users should have `role: "authenticated"`
- `user_role` should match assigned role (platform_admin/org_admin/org_member)
- `org_id` should match user's organization ID
- `sub` should match user's Clerk ID

### 1.2 Role-Based Access Control
**Objective**: Verify each role has appropriate permissions

**Test Matrix**:

| Action | Platform Admin | Org Admin | Org Member |
|--------|---------------|-----------|------------|
| View own org recipes | ✅ | ✅ | ✅ |
| View other org recipes | ✅ | ❌ | ❌ |
| Create recipes | ✅ | ✅ | ✅ |
| Edit own recipes | ✅ | ✅ | ✅ |
| Edit other user recipes | ✅ | ⚠️* | ❌ |
| Delete recipes | ✅ | ⚠️* | Own only |

*\*Org Admin permissions depend on implementation*

## 2. Multi-Tenant Isolation Testing

### 2.1 Organization Data Isolation
**Objective**: Ensure users only see data from their organization

**Test Steps**:
1. Sign in as platform_admin (AI Potential org)
2. Create a recipe: "Platform Admin Recipe"
3. Sign in as org_admin (Test Org)
4. Create a recipe: "Org Admin Recipe"
5. Sign in as org_member (Test Org)
6. Verify recipes visible

**Expected Results**:
- Platform admin should see only "Platform Admin Recipe"
- Org admin should see only "Org Admin Recipe"
- Org member should see only "Org Admin Recipe"
- No cross-organization data leakage

### 2.2 Database Query Isolation
**Objective**: Verify RLS policies prevent unauthorized data access

**Test Steps**:
1. Monitor server logs during recipe browsing
2. Verify no "Error fetching user" or RLS violations
3. Check that JWT claims are properly passed to database queries

## 3. Recipe Management Functional Testing

### 3.1 Recipe Creation Workflow
**Test Steps for Each User Role**:
1. Navigate to `/recipes`
2. Click "Create Recipe"
3. Fill form with:
   - Name: "[Role] Test Recipe"
   - Ingredient: "1 cup test flour"
   - Instructions: "Mix and test"
4. Submit form

**Expected Results**:
- Successful redirect to recipe detail page
- Recipe appears in organization's recipe list
- Recipe shows correct author information
- No authentication errors in server logs

### 3.2 Recipe Viewing & Navigation
**Test Steps**:
1. Browse recipes list at `/recipes`
2. Click on individual recipes
3. Verify recipe details load correctly
4. Test navigation back to recipes list

### 3.3 Recipe Unlocking (Premium Feature)
**Test Steps**:
1. Create recipe as one user
2. Sign in as different user (same org)
3. Attempt to view premium recipe
4. Test unlock functionality if implemented

## 4. Security Testing

### 4.1 Authentication Bypass Attempts
**Test Steps**:
1. Sign out completely
2. Attempt to access `/recipes/new` directly
3. Attempt to access individual recipe URLs
4. Verify proper redirects to sign-in

### 4.2 Cross-Organization Access Attempts
**Test Steps**:
1. Sign in as org_member
2. Attempt to access recipe URLs from different organization
3. Attempt to modify URL parameters for org access
4. Verify proper access denial

### 4.3 RLS Policy Validation
**SQL Test Queries** (run in Supabase SQL Editor):
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Test policy enforcement
SELECT COUNT(*) FROM recipes; -- Should respect user context
```

## 5. Error Handling & Edge Cases

### 5.1 Network & Database Errors
**Test Scenarios**:
- Temporary database disconnection
- Network timeouts
- Invalid JWT tokens
- Expired sessions

### 5.2 Malformed Input Testing
**Test Steps**:
1. Submit recipe forms with:
   - Empty required fields
   - Extremely long strings
   - Special characters
   - SQL injection attempts

### 5.3 Concurrent User Actions
**Test Steps**:
1. Multiple users creating recipes simultaneously
2. Multiple users viewing same recipes
3. Stress test with rapid form submissions

## 6. Performance Testing

### 6.1 Database Query Performance
**Metrics to Monitor**:
- Recipe list load time (should be < 1s)
- Individual recipe load time (should be < 500ms)
- User authentication flow (should be < 2s)

### 6.2 Authentication Flow Performance
**Test Steps**:
1. Measure sign-in time
2. Measure JWT token generation time
3. Measure page load time after authentication

## 7. User Experience Testing

### 7.1 Navigation Flow Testing
**Test Complete User Journeys**:
1. New user signs up → views recipes → creates recipe
2. Returning user signs in → manages recipes
3. Cross-role collaboration within organization

### 7.2 Error Message Validation
**Verify User-Friendly Error Messages**:
- Authentication failures
- Permission denials
- Form validation errors
- Network issues

## 8. Regression Testing

### 8.1 Core Functionality Regression
**Test After Any Changes**:
- [ ] Sign in/sign out works
- [ ] Recipe creation works for all roles
- [ ] Recipe viewing works for all roles
- [ ] Organization isolation maintained
- [ ] No authentication errors in logs

### 8.2 Integration Points
**Verify**:
- [ ] Clerk authentication integration
- [ ] Supabase database connectivity
- [ ] Third-party auth token validation
- [ ] Webhook functionality (if implemented)

## 9. Production Readiness Checklist

### 9.1 Security Checklist
- [ ] All RLS policies tested and working
- [ ] No hardcoded secrets in code
- [ ] JWT tokens properly validated
- [ ] HTTPS enforced (for production)
- [ ] Environment variables properly configured

### 9.2 Performance Checklist
- [ ] Database indexes optimized
- [ ] Query performance acceptable
- [ ] No memory leaks in authentication flow
- [ ] Proper error handling implemented

### 9.3 Monitoring & Logging
- [ ] Authentication errors logged
- [ ] Database errors logged
- [ ] User actions logged appropriately
- [ ] No sensitive data in logs

## 10. Test Execution Log

### Test Session: [DATE]
**Tester**: [NAME]
**Environment**: Development
**Version**: [COMMIT_HASH]

| Test Category | Status | Notes | Issues Found |
|---------------|--------|-------|--------------|
| Authentication | ✅ | All JWT tokens correct | None |
| Multi-tenant Isolation | ✅ | No data leakage | None |
| Recipe Management | ✅ | All CRUD operations work | None |
| Security | ⏳ | In progress | TBD |
| Performance | ⏳ | Pending | TBD |
| User Experience | ⏳ | Pending | TBD |

## Test Automation Opportunities

### Future Enhancements
1. **Automated Authentication Tests**: Cypress/Playwright tests for login flows
2. **API Testing**: Direct database query tests with different JWT contexts
3. **Load Testing**: Automated stress testing with multiple concurrent users
4. **Monitoring Integration**: Automated alerts for authentication failures

## Conclusion

This testing plan ensures comprehensive validation of the multi-tenant SaaS system. Regular execution of these tests, especially regression testing, will maintain system reliability and security as new features are added.

**Key Success Metrics**:
- ✅ Zero cross-organization data leakage
- ✅ Sub-second recipe loading times
- ✅ 100% authentication success rate
- ✅ No RLS policy violations
- ✅ All user roles function correctly