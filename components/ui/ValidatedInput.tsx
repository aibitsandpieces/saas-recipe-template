"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { useSlugValidation, type ValidationOptions, type ValidationState } from "@/lib/hooks/useSlugValidation";

export interface ValidatedInputProps
  extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, state: ValidationState) => void;
  validationOptions: ValidationOptions;
  debounceMs?: number;
  validateOnBlur?: boolean;
  showValidationIcon?: boolean;
  className?: string;
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({
    value,
    onChange,
    onValidationChange,
    validationOptions,
    debounceMs = 300,
    validateOnBlur = true,
    showValidationIcon = true,
    className,
    ...props
  }, ref) => {
    const [shouldValidate, setShouldValidate] = React.useState(false);
    const [hasBlurred, setHasBlurred] = React.useState(false);

    const validation = useSlugValidation(
      shouldValidate ? value : "",
      validationOptions,
      debounceMs
    );

    // Notify parent of validation changes
    React.useEffect(() => {
      if (onValidationChange) {
        onValidationChange(validation.isValid, validation.state);
      }
    }, [validation.isValid, validation.state, onValidationChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Start validation if user has interacted with the field
      if (hasBlurred && newValue.trim().length > 0) {
        setShouldValidate(true);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setHasBlurred(true);

      if (validateOnBlur && value.trim().length > 0) {
        setShouldValidate(true);
      }

      // Call original onBlur if provided
      props.onBlur?.(e);
    };

    const getValidationIcon = () => {
      if (!showValidationIcon || !shouldValidate) return null;

      switch (validation.state) {
        case "checking":
          return (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-r-transparent" />
            </div>
          );
        case "available":
          return (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          );
        case "unavailable":
        case "format-error":
        case "network-error":
          return (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          );
        default:
          return null;
      }
    };

    const getInputClassName = () => {
      if (!shouldValidate) {
        return className;
      }

      const baseClasses = className || "";

      switch (validation.state) {
        case "available":
          return cn(baseClasses, "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/50");
        case "unavailable":
        case "format-error":
          return cn(baseClasses, "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50");
        case "network-error":
          return cn(baseClasses, "border-yellow-500 focus-visible:border-yellow-500 focus-visible:ring-yellow-500/50");
        default:
          return baseClasses;
      }
    };

    const hasError = shouldValidate && (
      validation.state === "unavailable" ||
      validation.state === "format-error" ||
      validation.state === "network-error"
    );

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={cn(
            getInputClassName(),
            showValidationIcon && shouldValidate && "pr-10" // Add right padding for icon
          )}
          aria-invalid={hasError}
          aria-describedby={validation.message ? `${props.id || 'input'}-validation` : undefined}
          {...props}
        />
        {getValidationIcon()}
        {shouldValidate && validation.message && (
          <div
            id={`${props.id || 'input'}-validation`}
            className={cn(
              "mt-1 text-xs font-medium",
              validation.state === "available" && "text-green-600",
              validation.state === "checking" && "text-muted-foreground",
              (validation.state === "unavailable" || validation.state === "format-error") && "text-red-600",
              validation.state === "network-error" && "text-yellow-600"
            )}
            role={hasError ? "alert" : "status"}
            aria-live="polite"
          >
            {validation.message}
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export { ValidatedInput };