import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Ban,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { FileItem } from '@/features/files/types';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/app/providers/useToast';
import { cn } from '@/utils/cn';
import { EXPIRATION_OPTIONS } from '@/features/sharing/types';
import { useShare } from '@/features/sharing/hooks/useShare';

export interface ShareModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Formats a share link expiration timestamp into a user-friendly absolute string
 * and human-readable relative urgency label (e.g. "Expires in ~23h", "Expires in 6 days", "Expired").
 */
function formatExpirationDisplay(
  expiresAt: string | null | undefined,
  now: number = Date.now()
): {
  absoluteDate: string;
  relativeLabel: string;
  isExpired: boolean;
} {
  if (!expiresAt) {
    return {
      absoluteDate: 'Unknown expiration',
      relativeLabel: '',
      isExpired: false,
    };
  }

  const date = new Date(expiresAt);
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return {
      absoluteDate: 'Invalid expiration date',
      relativeLabel: '',
      isExpired: false,
    };
  }

  const absoluteDate = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const diffMs = time - now;
  if (diffMs <= 0) {
    return {
      absoluteDate,
      relativeLabel: 'Expired',
      isExpired: true,
    };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relativeLabel = '';
  if (diffMinutes < 1) {
    relativeLabel = 'Expires in <1 minute';
  } else if (diffMinutes < 60) {
    relativeLabel = `Expires in ${diffMinutes}m`;
  } else if (diffHours < 24) {
    relativeLabel = `Expires in ~${diffHours}h`;
  } else {
    relativeLabel = diffDays === 1 ? 'Expires in 1 day' : `Expires in ${diffDays} days`;
  }

  return {
    absoluteDate,
    relativeLabel,
    isExpired: false,
  };
}

/**
 * Formats a creation date safely into a localized date/time string.
 */
function formatCreationDisplay(createdAt: string | null | undefined): string {
  if (!createdAt) return 'Unknown date';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, isOpen, onClose }) => {
  const toast = useToast();
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [, setClockTick] = useState<number>(0);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const {
    links,
    isLoadingLinks,
    isCreating,
    revokingId,
    createError,
    listError,
    revokeError,
    selectedHours,
    setSelectedHours,
    newlyCreatedLink,
    isCopied,
    createLink,
    revokeLink,
    copyToClipboard,
    clearErrors,
  } = useShare({ file, isOpen });

  // Clear pending revocation confirmation when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setConfirmRevokeId(null);
    }
  }, [isOpen]);

  // Refresh relative expiration labels every 30 seconds while open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setClockTick((prev) => prev + 1);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  const handleCopy = async (url: string) => {
    try {
      await copyToClipboard(url);
      toast.success('Share link copied to clipboard.', 'Link Copied');
    } catch {
      toast.error('Could not copy link to clipboard. Please copy manually.', 'Copy Failed');
    }
  };

  const handleRadioKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = EXPIRATION_OPTIONS.findIndex((opt) => opt.hours === selectedHours);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % EXPIRATION_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + EXPIRATION_OPTIONS.length) % EXPIRATION_OPTIONS.length;
    }

    if (nextIndex !== -1) {
      const nextOption = EXPIRATION_OPTIONS[nextIndex];
      setSelectedHours(nextOption.hours);
      radioRefs.current[nextIndex]?.focus();
    }
  };

  const handleConfirmRevoke = async (linkId: string) => {
    if (revokingId) return; // Guard against duplicate submissions while in progress

    const ok = await revokeLink(linkId);
    if (ok) {
      toast.success('Share link has been revoked.', 'Link Revoked');
      setConfirmRevokeId(null);
    } else {
      toast.error(revokeError || 'Failed to revoke share link. Please try again.', 'Revocation Failed');
    }
  };

  if (!isOpen || !file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${file.fileName}"`}
      description="Generate secure, time-limited download links for guests"
      size="xl"
      className="max-w-xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Error Banner */}
        {(createError || revokeError || listError) && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in duration-150"
          >
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-destructive">Sharing Operation Error</p>
                <p className="text-destructive/90 break-words">{createError || revokeError || listError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearErrors}
              className="rounded p-0.5 text-destructive/70 hover:text-destructive hover:bg-destructive/20 transition-colors focus:outline-none focus:ring-1 focus:ring-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Newly Created Link Notification */}
        {newlyCreatedLink && (
          <Card className="border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Share link generated successfully!</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Anyone with this link can access and download this file until{' '}
              <strong className="text-foreground font-medium">
                {formatExpirationDisplay(newlyCreatedLink.expiresAt).absoluteDate}
              </strong>
              {formatExpirationDisplay(newlyCreatedLink.expiresAt).relativeLabel && (
                <span> ({formatExpirationDisplay(newlyCreatedLink.expiresAt).relativeLabel})</span>
              )}
              .
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedLink.shareUrl}
                aria-label="Generated share URL"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground select-all focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void handleCopy(newlyCreatedLink.shareUrl)}
                className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
                aria-label="Copy share link to clipboard"
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
            </div>

            <div className="flex items-start gap-1.5 text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>
                <strong>Important:</strong> For security, this link and raw token are displayed only once. CloudShare stores only cryptographic SHA-256 hashes.
              </span>
            </div>
          </Card>
        )}

        {/* Expiration Duration Selection */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Select Link Expiration Duration
            </label>
            <p className="text-xs text-muted-foreground">
              Choose how long guest access will remain valid before automatically expiring.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Link expiration duration"
            onKeyDown={handleRadioKeyDown}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            {EXPIRATION_OPTIONS.map((option, index) => {
              const isSelected = selectedHours === option.hours;
              return (
                <button
                  key={option.hours}
                  ref={(el) => {
                    radioRefs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedHours(option.hours)}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-xs'
                      : 'border-border bg-card text-foreground hover:bg-muted/50 hover:border-muted-foreground/30'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Clock
                        className={cn(
                          'h-3.5 w-3.5',
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span>{option.label}</span>
                    </div>
                    {isSelected && (
                      <span className="flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void createLink()}
              disabled={isCreating}
              className="w-full gap-2 shadow-sm"
              aria-label={isCreating ? 'Generating secure share link' : 'Create share link'}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Secure Token...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Create Share Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Existing Share Links for this File */}
        <div className="border-t border-border pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active &amp; Historical Links
            </h4>
            <span className="text-xs text-muted-foreground font-medium">
              {links.length} {links.length === 1 ? 'link' : 'links'}
            </span>
          </div>

          {isLoadingLinks ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading links...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No previous share links generated for this file.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {links.map((link) => {
                const createdDisplay = formatCreationDisplay(link.createdAt);
                const exp = formatExpirationDisplay(link.expiresAt);
                const isConfirmingRevoke = confirmRevokeId === link.id;

                return (
                  <div
                    key={link.id}
                    className={cn(
                      'rounded-xl border p-3 text-xs transition-colors',
                      isConfirmingRevoke
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'border-border bg-card'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              link.status === 'active'
                                ? 'success'
                                : link.status === 'revoked'
                                ? 'destructive'
                                : 'secondary'
                            }
                            size="sm"
                            className="capitalize font-medium"
                          >
                            {link.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            Created {createdDisplay}
                          </span>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          {link.status === 'active' && (
                            <span>
                              Expires {exp.absoluteDate}
                              {exp.relativeLabel && (
                                <span className="text-primary font-medium ml-1">
                                  ({exp.relativeLabel})
                                </span>
                              )}
                            </span>
                          )}
                          {link.status === 'expired' && (
                            <span>Expired {exp.absoluteDate}</span>
                          )}
                          {link.status === 'revoked' && (
                            <span>Revoked link (originally set to expire {exp.absoluteDate})</span>
                          )}
                        </div>
                      </div>

                      {link.status === 'active' && !isConfirmingRevoke && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmRevokeId(link.id)}
                          disabled={revokingId === link.id}
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 text-xs shrink-0"
                          aria-label={`Revoke share link created on ${createdDisplay}`}
                        >
                          <Ban className="h-3 w-3" />
                          <span>Revoke</span>
                        </Button>
                      )}
                    </div>

                    {/* Safe Two-Step Revocation Confirmation Panel */}
                    {isConfirmingRevoke && (
                      <div
                        role="region"
                        aria-label="Revocation confirmation"
                        className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-2.5 animate-in fade-in duration-150"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-xs">
                            <p className="font-semibold text-destructive">
                              Revoke this share link?
                            </p>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              Anyone with this link will immediately lose access to{' '}
                              <strong className="text-foreground font-medium">&ldquo;{file.fileName}&rdquo;</strong>.
                              This action cannot be undone.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmRevokeId(null)}
                            disabled={revokingId === link.id}
                            className="text-xs h-7 px-2.5"
                            aria-label="Cancel revocation"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => void handleConfirmRevoke(link.id)}
                            disabled={revokingId === link.id}
                            className="text-xs h-7 px-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive gap-1"
                            aria-label="Confirm revocation of share link"
                          >
                            {revokingId === link.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Revoking...</span>
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3" />
                                <span>Confirm Revoke</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
