// Re-export everything so existing `import { Analytics } from "@/lib/analytics"` keeps working.
// New code should import directly from the submodule:
//   import { trackInternalEvent } from "@/lib/analytics/client"
//   import type { InternalEventName } from "@/lib/analytics/types"

export * from "./client";
export * from "./types";
