"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Building,
  GraduationCap,
  Shield,
  Loader2
} from "lucide-react"
import {
  DeletionImpact,
  DeletionSeverity,
  DeleteTarget
} from "@/lib/types/deletion"
import {
  validateCourseDeletion,
  validateModuleDeletion,
  validateLessonDeletion
} from "@/lib/validation/deletion-validation"

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (confirmationText: string, bypassWarnings: boolean) => Promise<void>
  target: DeleteTarget
  entityId: string
  entityName: string
  isDeleting?: boolean
}

const SEVERITY_CONFIG = {
  [DeletionSeverity.SAFE]: {
    color: "bg-green-100 text-green-800",
    icon: Shield,
    label: "Safe to Delete"
  },
  [DeletionSeverity.WARNING]: {
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertTriangle,
    label: "Caution Required"
  },
  [DeletionSeverity.DANGEROUS]: {
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
    label: "High Risk"
  },
  [DeletionSeverity.BLOCKED]: {
    color: "bg-gray-100 text-gray-800",
    icon: Shield,
    label: "Blocked"
  }
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  target,
  entityId,
  entityName,
  isDeleting = false
}: DeleteConfirmationDialogProps) {
  const [step, setStep] = useState<'validation' | 'confirmation' | 'final'>('validation')
  const [confirmationText, setConfirmationText] = useState('')
  const [bypassWarnings, setBypassWarnings] = useState(false)
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('validation')
      setConfirmationText('')
      setBypassWarnings(false)
      setImpact(null)
      setValidationError(null)
      validateDeletion()
    }
  }, [isOpen, entityId])

  const validateDeletion = async () => {
    setIsValidating(true)
    setValidationError(null)

    try {
      let validationFunction
      switch (target) {
        case 'course':
          validationFunction = validateCourseDeletion
          break
        case 'module':
          validationFunction = validateModuleDeletion
          break
        case 'lesson':
          validationFunction = validateLessonDeletion
          break
      }

      const result = await validationFunction(entityId)
      setImpact(result)

      if (result.canDelete) {
        setStep('confirmation')
      } else {
        setStep('validation')
      }
    } catch (error) {
      console.error('Validation error:', error)
      setValidationError('Failed to validate deletion. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirm = async () => {
    if (confirmationText === entityName) {
      setStep('final')
      await onConfirm(confirmationText, bypassWarnings)
    }
  }

  const canProceed = confirmationText === entityName && impact?.canDelete

  const SeverityIcon = impact ? SEVERITY_CONFIG[impact.severity].icon : Shield

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => !isDeleting && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Delete {target.charAt(0).toUpperCase() + target.slice(1)}</span>
          </DialogTitle>
          <DialogDescription>
            Permanently delete "{entityName}". This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {step === 'validation' && (
          <div className="space-y-4">
            {isValidating ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Validating deletion impact...</span>
              </div>
            ) : validationError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : impact && !impact.canDelete ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cannot delete this {target}</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-900">Blocking Issues:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                    {impact.blockers.map((blocker, index) => (
                      <li key={index}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {step === 'confirmation' && impact && (
          <div className="space-y-6">
            {/* Impact Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Deletion Impact Assessment</h4>
                <Badge className={SEVERITY_CONFIG[impact.severity].color}>
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {SEVERITY_CONFIG[impact.severity].label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {impact.affectedUsers > 0 && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{impact.affectedUsers} users</span>
                  </div>
                )}
                {impact.affectedEnrollments > 0 && (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span>{impact.affectedEnrollments} enrollments</span>
                  </div>
                )}
                {impact.affectedLessons > 0 && (
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                    <span>{impact.affectedLessons} lessons</span>
                  </div>
                )}
                {impact.affectedFiles > 0 && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <span>{impact.affectedFiles} files</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Estimated time: {impact.estimatedTime}</span>
              </div>
            </div>

            {/* Warnings */}
            {impact.warnings.length > 0 && (
              <Alert variant={impact.severity === DeletionSeverity.DANGEROUS ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <strong>Please review these warnings:</strong>
                    <ul className="list-disc list-inside space-y-1">
                      {impact.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Bypass warnings checkbox for dangerous deletions */}
            {impact.severity === DeletionSeverity.DANGEROUS && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bypass-warnings"
                  checked={bypassWarnings}
                  onCheckedChange={(checked) => setBypassWarnings(checked === true)}
                />
                <Label htmlFor="bypass-warnings" className="text-sm">
                  I understand the risks and want to proceed anyway
                </Label>
              </div>
            )}

            {/* Confirmation input */}
            <div className="space-y-2">
              <Label htmlFor="confirmation-text">
                Type <strong>{entityName}</strong> to confirm deletion:
              </Label>
              <Input
                id="confirmation-text"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={entityName}
                className={confirmationText === entityName ? "border-green-500" : ""}
              />
            </div>

            {/* Final warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action is permanent and cannot be undone. All associated data will be permanently deleted.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'final' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Deleting {target}...</span>
          </div>
        )}

        <DialogFooter>
          {step === 'validation' && !isValidating && impact && !impact.canDelete && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}

          {step === 'confirmation' && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!canProceed || (impact.severity === DeletionSeverity.DANGEROUS && !bypassWarnings) || isDeleting}
              >
                Delete {target.charAt(0).toUpperCase() + target.slice(1)}
              </Button>
            </>
          )}

          {step === 'final' && (
            <Button variant="outline" disabled>
              Deleting...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}