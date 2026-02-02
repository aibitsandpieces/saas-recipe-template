/**
 * Slug utility functions for course and lesson slug generation and validation
 */

/**
 * Convert text to URL-friendly slug format
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Remove non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, "")
    // Remove multiple consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Validate slug format on the client side
 */
export function isValidSlugFormat(slug: string): boolean {
  if (!slug || slug.length === 0) {
    return false;
  }

  // Must contain only lowercase letters, numbers, and hyphens
  // Cannot start or end with hyphen
  // Cannot contain consecutive hyphens
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Get appropriate error message for slug format issues
 */
export function getSlugFormatError(slug: string): string | null {
  if (!slug || slug.length === 0) {
    return "Slug cannot be empty";
  }

  if (slug.length < 3) {
    return "Slug must be at least 3 characters long";
  }

  if (slug.length > 100) {
    return "Slug cannot be longer than 100 characters";
  }

  if (slug.startsWith("-") || slug.endsWith("-")) {
    return "Slug cannot start or end with a hyphen";
  }

  if (slug.includes("--")) {
    return "Slug cannot contain consecutive hyphens";
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "Slug can only contain lowercase letters, numbers, and hyphens";
  }

  if (/^[0-9-]+$/.test(slug)) {
    return "Slug must contain at least one letter";
  }

  return null;
}

/**
 * Get validation message for specific validation states
 */
export function getSlugValidationMessage(
  type: "course" | "lesson" | "module",
  state: "checking" | "available" | "unavailable" | "format-error" | "network-error",
  formatError?: string
): string {
  const entityName = type === "module" ? "module name" : `${type} slug`;

  switch (state) {
    case "checking":
      return `Checking if ${entityName} is available...`;
    case "available":
      return `✓ ${entityName.charAt(0).toUpperCase() + entityName.slice(1)} is available`;
    case "unavailable":
      return `✗ ${entityName.charAt(0).toUpperCase() + entityName.slice(1)} is already taken`;
    case "format-error":
      return formatError || `Invalid ${entityName} format`;
    case "network-error":
      return `Unable to validate ${entityName}. Please try again.`;
    default:
      return "";
  }
}

/**
 * Reserved slugs that should not be allowed for courses
 */
export const RESERVED_COURSE_SLUGS = [
  "admin",
  "api",
  "app",
  "blog",
  "course",
  "courses",
  "dashboard",
  "docs",
  "help",
  "home",
  "login",
  "logout",
  "new",
  "profile",
  "settings",
  "signup",
  "support",
  "user",
  "users",
  "www",
];

/**
 * Check if a course slug is reserved
 */
export function isReservedCourseSlug(slug: string): boolean {
  return RESERVED_COURSE_SLUGS.includes(slug.toLowerCase());
}

/**
 * Get error message for reserved slugs
 */
export function getReservedSlugError(slug: string): string | null {
  if (isReservedCourseSlug(slug)) {
    return `"${slug}" is a reserved word and cannot be used as a course slug`;
  }
  return null;
}