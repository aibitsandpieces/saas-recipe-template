// Type definitions for Recipe Emporium SaaS Template

export interface Recipe {
  id?: string;
  created_at?: string;
  name: string;
  ingredients: string[];
  instructions: string;
  user_id?: string;
  organisation_id?: string;
  // Extended properties added by server actions
  userFirstName?: string;
  userImageUrl?: string;
  unlocked?: boolean;
}

export interface Comment {
  id?: string;
  created_at?: string;
  comment: string;
  user_id: string;
  recipe_id: string;
  organisation_id?: string;
  // Extended properties added by server actions
  userFirstName?: string;
  userImageUrl?: string;
}

export interface RecipeUnlocked {
  id?: string;
  created_at?: string;
  recipe_id: string;
  user_id: string;
  organisation_id?: string;
}

// Workflow Library System Types
// These extend the base Supabase types with additional functionality

export interface WorkflowCategory {
  id?: string;
  name: string;
  description?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  // Extended properties added by server actions
  departmentCount?: number;
  workflowCount?: number;
}

export interface WorkflowDepartment {
  id?: string;
  category_id: string;
  name: string;
  description?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  // Extended properties added by server actions
  categoryName?: string;
  workflowCount?: number;
}

export interface Workflow {
  id?: string;
  department_id: string;
  name: string;
  description?: string;
  ai_mba?: string;
  topic?: string;
  source_book?: string;
  source_author?: string;
  external_url?: string;
  is_published?: boolean;
  sort_order?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Extended properties added by server actions
  departmentName?: string;
  categoryName?: string;
  categoryId?: string;
  files?: WorkflowFile[];
  fileCount?: number;
}

export interface WorkflowFile {
  id?: string;
  workflow_id: string;
  file_name: string;
  display_name: string;
  storage_path: string;
  file_size_bytes?: number;
  content_type?: string;
  sort_order?: number;
  uploaded_by?: string;
  created_at?: string;
  // Extended properties added by server actions
  uploaderName?: string;
  downloadUrl?: string;
}

export interface WorkflowImportLog {
  id?: string;
  file_name: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  categories_created?: number;
  departments_created?: number;
  workflows_created?: number;
  error_summary?: any;
  imported_by?: string;
  started_at?: string;
  completed_at?: string;
  // Extended properties added by server actions
  importerName?: string;
  duration?: number;
  status?: 'pending' | 'completed' | 'failed';
}

// CSV Import Types
export interface CSVWorkflowRow {
  ai_mba: string;       // Maps to category
  category: string;     // Maps to department
  topic: string;        // Maps to workflow name
  workflow?: string;    // Maps to content file/description
  course?: string;      // Maps to source_book
  author?: string;      // Maps to source_author
  link?: string;        // Maps to external_url
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface ImportPreviewResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: ImportError[];
  summary: {
    categoriesToCreate: string[];
    departmentsToCreate: string[];
    workflowsToCreate: number;
    existingCategories: string[];
    existingDepartments: string[];
  };
  sampleData: CSVWorkflowRow[];
}

// Workflow Search Types
export interface WorkflowSearchFilters {
  query?: string;
  categoryId?: string;
  departmentId?: string;
  sourceAuthor?: string;
  sourceBook?: string;
  isPublished?: boolean;
  // Pagination parameters
  page?: number;
  limit?: number;
}

export interface WorkflowSearchResult {
  workflows: Workflow[];
  totalCount: number;
  categories: WorkflowCategory[];
  departments: WorkflowDepartment[];
  // Pagination metadata
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Hierarchical Workflow Types (for navigation)
export interface WorkflowCategoryWithDepartments extends WorkflowCategory {
  departments: (WorkflowDepartment & {
    workflows?: Workflow[];
  })[];
}

// Phase C: User Management System Types

export interface UserInvitation {
  id?: string;
  email: string;
  organisation_id: string;
  role_name: 'org_admin' | 'org_member';
  status: 'pending' | 'accepted' | 'expired' | 'failed';
  clerk_invitation_id?: string;
  courses: string[]; // Array of course IDs for individual enrollment
  invited_by: string;
  invited_at?: string;
  accepted_at?: string;
  expires_at?: string;
  // Extended properties added by server actions
  inviterName?: string;
  organisationName?: string;
  courseNames?: string[];
}

export interface CourseUserEnrollment {
  id?: string;
  user_id: string;
  course_id: string;
  enrolled_by: string;
  enrolled_at?: string;
  // Extended properties added by server actions
  userName?: string;
  courseName?: string;
  enrolledByName?: string;
}

export interface UserWithRole {
  id: string;
  clerk_id: string;
  email?: string;
  name?: string;
  organisation_id?: string;
  created_at?: string;
  updated_at?: string;
  // Extended properties added by server actions
  role?: string;
  organisationName?: string;
  courseEnrollments?: CourseUserEnrollment[];
  invitationStatus?: 'invited' | 'registered';
}

// CSV User Import Types
export interface CSVUserRow {
  email: string;        // User email (required, must be unique within org)
  name: string;         // User full name (required)
  role: 'org_admin' | 'org_member'; // User role (required)
  organisation: string; // Organisation name (required, must exist)
  courses?: string;     // Comma-separated course names for individual enrollment (optional)
}

export interface UserImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface UserImportPreviewResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: UserImportError[];
  summary: {
    usersToInvite: number;
    organisationsFound: string[];
    coursesFound: string[];
    rolesAssigned: { [role: string]: number };
    duplicateEmails: string[];
  };
  sampleData: CSVUserRow[];
}

export interface UserImportLog {
  id?: string;
  file_name: string;
  total_rows: number;
  successful_invitations: number;
  failed_invitations: number;
  organisations_processed: number;
  individual_enrollments: number;
  error_summary?: any;
  imported_by?: string;
  started_at?: string;
  completed_at?: string;
  // Extended properties added by server actions
  importerName?: string;
  duration?: number;
  status?: 'pending' | 'completed' | 'failed';
}

// User Management Search and Filters
export interface UserSearchFilters {
  query?: string;
  organisationId?: string;
  role?: string;
  invitationStatus?: 'all' | 'pending' | 'accepted' | 'expired';
  hasIndividualEnrollments?: boolean;
  // Pagination parameters
  page?: number;
  limit?: number;
}

export interface UserSearchResult {
  users: UserWithRole[];
  invitations: UserInvitation[];
  totalUserCount: number;
  totalInvitationCount: number;
  // Pagination metadata
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}