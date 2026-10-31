import { HugeiconsIcon } from '@hugeicons/solid-js'
import {
  ArrowUp01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  GitBranchIcon,
  MonitorIcon,
  PlusSignIcon
} from '@hugeicons/core-free-icons'
import { PixelText } from '@renderer/components/ui/PixelText'

// Static placeholders — wired up to real data later.
const PROJECT_NAME = 'yoke'
const PROJECT_PATH = '/home/rahul/Projects/open-source/yoke'
const GIT_BRANCH = 'main'
const MODEL_NAME = 'Big Pickle'

function HomeView() {
  return (
    <div class="flex h-full flex-col bg-surface-soft">
      <div class="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <PixelText text="yoke" pixel={14} class="text-neutral-200" />

        <div class="flex w-full max-w-180 flex-col gap-3">
          {/* Prompt box */}
          <div class="flex flex-col rounded-xl border border-line bg-surface p-3 shadow-sm">
            <input
              type="text"
              placeholder="Ask anything, / for commands, @ for context..."
              class="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-neutral-400"
            />

            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Add attachment"
                  class="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                </button>
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {MODEL_NAME}
                  <HugeiconsIcon icon={ChevronDownIcon} size={14} class="text-neutral-400" />
                </button>
              </div>

              <button
                type="button"
                aria-label="Send"
                disabled
                class="flex size-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-500"
              >
                <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
              </button>
            </div>
          </div>

          {/* Project / branch / path row */}
          <div class="flex items-center justify-between px-1 text-[12.5px] text-neutral-500">
            <div class="flex items-center gap-2.5">
              <span class="flex size-4.5 items-center justify-center rounded-[5px] bg-neutral-900">
                <PixelText text="y" pixel={2} class="text-white" />
              </span>
              <span class="text-neutral-700">{PROJECT_NAME}</span>
              <span class="size-1.5 rounded-full bg-blue-500" />
              <span class="flex items-center gap-1">
                <HugeiconsIcon icon={GitBranchIcon} size={13} class="text-neutral-400" />
                {GIT_BRANCH}
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <HugeiconsIcon icon={MonitorIcon} size={13} class="text-neutral-400" />
              <span class="truncate">{PROJECT_PATH}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <footer class="flex justify-center pb-6">
        <button
          type="button"
          class="flex items-center gap-1 text-[13px] text-neutral-500 transition hover:text-neutral-700"
        >
          Connect to 75+ providers to use other models, including Claude, GPT, Gemini, etc
          <HugeiconsIcon icon={ChevronRightIcon} size={14} class="text-neutral-400" />
        </button>
      </footer>
    </div>
  )
}
export default HomeView
