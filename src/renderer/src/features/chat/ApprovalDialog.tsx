import { Show, type JSX } from 'solid-js'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ComputerTerminal01Icon from '@hugeicons/core-free-icons/ComputerTerminal01Icon'
import type { ApprovalDecision, ApprovalRequest } from '@shared/ai'

export interface ApprovalDialogProps {
  approval: ApprovalRequest | undefined
  /** Called once per shown dialog; the dialog closes itself afterwards. */
  onDecide: (decision: ApprovalDecision) => void
}

/**
 * An opencode-style permission prompt: the agent's next shell command waits
 * until the user allows it once, allows it for the session, or denies it.
 */
export function ApprovalDialog(props: ApprovalDialogProps): JSX.Element {
  return (
    <Show when={props.approval}>
      {(approval) => (
        <Dialog open onOpenChange={(open) => !open && props.onDecide('deny')}>
          <DialogContent class="max-w-xl gap-0 p-0">
            <DialogHeader class="border-b border-line px-4 py-3 text-left">
              <DialogTitle class="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <HugeiconsIcon icon={ComputerTerminal01Icon} size={15} />
                Approval required
              </DialogTitle>
              <DialogDescription class="text-[12.5px] text-foreground-muted">
                The agent wants to run this shell command.
              </DialogDescription>
            </DialogHeader>

            <div class="max-h-64 overflow-auto bg-surface-soft px-4 py-3">
              <pre class="whitespace-pre-wrap break-all font-mono text-[12px] leading-[1.55] text-foreground-secondary">
                {approval().command}
              </pre>
            </div>

            <DialogFooter class="gap-2 border-t border-line px-4 py-3">
              <Button variant="ghost" size="sm" onClick={() => props.onDecide('deny')}>
                Deny
              </Button>
              <Button variant="outline" size="sm" onClick={() => props.onDecide('allow-session')}>
                Allow for session
              </Button>
              <Button size="sm" onClick={() => props.onDecide('allow')}>
                Allow once
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Show>
  )
}
