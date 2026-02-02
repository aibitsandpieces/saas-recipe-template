import { useState, useEffect, useRef, useCallback } from "react";

export type ValidationState = "idle" | "checking" | "available" | "unavailable" | "format-error" | "network-error";

export interface ValidationOptions {
  type: "course" | "lesson" | "module";
  excludeId?: string;
  moduleId?: string; // Required for lesson validation
  courseId?: string; // Required for module validation
}

export interface ValidationResult {
  state: ValidationState;
  message: string;
  isValid: boolean;
}

/**
 * Custom hook for debounced slug/name validation
 */
export function useSlugValidation(
  value: string,
  options: ValidationOptions,
  debounceMs: number = 300
): ValidationResult {
  const [state, setState] = useState<ValidationState>("idle");
  const [message, setMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateValue = useCallback(async (
    valueToValidate: string,
    validationOptions: ValidationOptions,
    signal: AbortSignal
  ) => {
    try {
      setState("checking");
      setMessage("Checking availability...");

      // Determine endpoint based on type
      let endpoint: string;
      let requestBody: any;

      switch (validationOptions.type) {
        case "course":
          endpoint = "/api/validate/course-slug";
          requestBody = {
            slug: valueToValidate,
            excludeId: validationOptions.excludeId
          };
          break;
        case "lesson":
          endpoint = "/api/validate/lesson-slug";
          requestBody = {
            slug: valueToValidate,
            moduleId: validationOptions.moduleId,
            excludeId: validationOptions.excludeId
          };
          break;
        case "module":
          endpoint = "/api/validate/module-name";
          requestBody = {
            name: valueToValidate,
            courseId: validationOptions.courseId,
            excludeId: validationOptions.excludeId
          };
          break;
        default:
          throw new Error("Invalid validation type");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Unauthorized access");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (signal.aborted) return;

      if (result.available) {
        setState("available");
        setMessage(getSuccessMessage(validationOptions.type));
      } else {
        setState("unavailable");
        setMessage(getUnavailableMessage(validationOptions.type));
      }
    } catch (error: any) {
      if (signal.aborted) return;

      console.error("Validation error:", error);
      setState("network-error");
      setMessage(getNetworkErrorMessage(validationOptions.type));
    }
  }, []);

  useEffect(() => {
    // Cancel any existing requests and timeouts
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state if value is empty
    if (!value || value.trim().length === 0) {
      setState("idle");
      setMessage("");
      return;
    }

    // Check format first (client-side validation)
    const formatError = getFormatError(value, options.type);
    if (formatError) {
      setState("format-error");
      setMessage(formatError);
      return;
    }

    // Validate required parameters
    if (options.type === "lesson" && !options.moduleId) {
      setState("format-error");
      setMessage("Module ID is required for lesson validation");
      return;
    }

    if (options.type === "module" && !options.courseId) {
      setState("format-error");
      setMessage("Course ID is required for module validation");
      return;
    }

    // Set up debounced validation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    timeoutRef.current = setTimeout(() => {
      validateValue(value.trim(), options, abortController.signal);
    }, debounceMs);

    return () => {
      abortController.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, options.type, options.excludeId, options.moduleId, options.courseId, debounceMs, validateValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isValid = state === "available" || state === "idle";

  return {
    state,
    message,
    isValid
  };
}

/**
 * Get format validation error for client-side checking
 */
function getFormatError(value: string, type: "course" | "lesson" | "module"): string | null {
  if (!value || value.length === 0) {
    return null; // Empty values are handled separately
  }

  if (type === "module") {
    // Module names have more flexible format requirements
    if (value.length < 2) {
      return "Module name must be at least 2 characters long";
    }
    if (value.length > 100) {
      return "Module name cannot be longer than 100 characters";
    }
    return null;
  }

  // Slug validation for courses and lessons
  if (value.length < 3) {
    return "Slug must be at least 3 characters long";
  }

  if (value.length > 100) {
    return "Slug cannot be longer than 100 characters";
  }

  if (value.startsWith("-") || value.endsWith("-")) {
    return "Slug cannot start or end with a hyphen";
  }

  if (value.includes("--")) {
    return "Slug cannot contain consecutive hyphens";
  }

  if (!/^[a-z0-9-]+$/.test(value)) {
    return "Slug can only contain lowercase letters, numbers, and hyphens";
  }

  if (/^[0-9-]+$/.test(value)) {
    return "Slug must contain at least one letter";
  }

  // Check reserved course slugs
  if (type === "course" && isReservedCourseSlug(value)) {
    return `"${value}" is a reserved word and cannot be used as a course slug`;
  }

  return null;
}

/**
 * Reserved course slugs
 */
const RESERVED_COURSE_SLUGS = [
  "admin", "api", "app", "blog", "course", "courses", "dashboard", "docs", "help",
  "home", "login", "logout", "new", "profile", "settings", "signup", "support",
  "user", "users", "www"
];

function isReservedCourseSlug(slug: string): boolean {
  return RESERVED_COURSE_SLUGS.includes(slug.toLowerCase());
}

/**
 * Get success message for available slug/name
 */
function getSuccessMessage(type: "course" | "lesson" | "module"): string {
  const entityName = type === "module" ? "module name" : `${type} slug`;
  return `✓ ${entityName.charAt(0).toUpperCase() + entityName.slice(1)} is available`;
}

/**
 * Get error message for unavailable slug/name
 */
function getUnavailableMessage(type: "course" | "lesson" | "module"): string {
  const entityName = type === "module" ? "module name" : `${type} slug`;
  return `✗ ${entityName.charAt(0).toUpperCase() + entityName.slice(1)} is already taken`;
}

/**
 * Get error message for network issues
 */
function getNetworkErrorMessage(type: "course" | "lesson" | "module"): string {
  const entityName = type === "module" ? "module name" : `${type} slug`;
  return `Unable to validate ${entityName}. Please try again.`;
}