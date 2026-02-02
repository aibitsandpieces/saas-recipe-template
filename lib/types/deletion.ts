// Shared deletion types that can be used by both client and server components

export enum DeletionSeverity {
  SAFE = 'safe',           // No impact
  WARNING = 'warning',     // Some impact, but safe to proceed
  DANGEROUS = 'dangerous', // High impact, requires extra confirmation
  BLOCKED = 'blocked'      // Cannot delete due to business rules
}

export interface DeletionImpact {
  canDelete: boolean
  severity: DeletionSeverity
  warnings: string[]
  blockers: string[]
  affectedUsers: number
  affectedEnrollments: number
  affectedLessons: number
  affectedFiles: number
  estimatedTime: string
  requiresApproval: boolean
}

export type DeleteTarget = 'course' | 'module' | 'lesson'