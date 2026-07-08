# 11 · TD-014 & TD-016 — Final Polish (i18n + Inline Action)

**Priority:** P3  
**Effort:** Tiny (< 20 min)  
**Touches:** `features/live-session/components/Scoreboard.tsx`, `locales/en.json`, `locales/pt.json`

---

## TD-014 — Hardcoded `"Swap Sides"` in `Scoreboard.tsx`

### Problem

Line 445 in `Scoreboard.tsx` contains a hardcoded English string not routed through `next-intl`:

```tsx
<ArrowLeftRight className="w-4 h-4" /> Swap Sides
```

### Fix

#### Step 1 — Add key to both locale files

**`locales/en.json`** — add under the `Scoreboard` namespace:
```json
{
  "Scoreboard": {
    ...
    "swapSides": "Swap Sides"
  }
}
```

**`locales/pt.json`** — add the Portuguese translation under the same namespace:
```json
{
  "Scoreboard": {
    ...
    "swapSides": "Trocar Lados"
  }
}
```

> Both files must be updated together — never add a key to one without the other (AGENTS §6).

#### Step 2 — Update `Scoreboard.tsx`

The component already imports `useTranslations('Scoreboard')` as `t`. Simply replace the hardcoded string:

```diff
- <ArrowLeftRight className="w-4 h-4" /> Swap Sides
+ <ArrowLeftRight className="w-4 h-4" /> {t('swapSides')}
```

---

## TD-016 — Inline `signOut` in `dashboard/page.tsx` (Low Priority / Tracked Only)

### Problem

`signOut` is defined as an inline `'use server'` function inside `page.tsx`. AGENTS §3.1 allows this for trivial one-off mutations.

### Recommendation

If `app/dashboard/page.tsx` is refactored as part of Plan 09 (TD-005), move `signOut` into `features/dashboard/actions.ts` at that time. This avoids the extra line count and sets a cleaner precedent.

```ts
// features/dashboard/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

This is **not required** independently — only do it as part of the TD-005 refactor.

---

## Verification

```bash
# Confirm no hardcoded English strings remain in Scoreboard
grep -n '"Swap Sides"\|Swap Sides' src/features/live-session/components/Scoreboard.tsx

# Confirm both locale files have the key
node -e "const en = require('./locales/en.json'); const pt = require('./locales/pt.json'); console.log(en.Scoreboard?.swapSides, pt.Scoreboard?.swapSides)"

npm run build
```

---

## Files Modified

| File | Change |
|---|---|
| `locales/en.json` | Add `Scoreboard.swapSides` |
| `locales/pt.json` | Add `Scoreboard.swapSides` (Portuguese) |
| `features/live-session/components/Scoreboard.tsx` | Replace hardcoded string with `{t('swapSides')}` |
| `features/dashboard/actions.ts` | *(optional)* Move `signOut` if Plan 09 is in progress |

## Acceptance Criteria

- [ ] `"Swap Sides"` hardcoded string is removed from `Scoreboard.tsx`
- [ ] `locales/en.json` and `locales/pt.json` both contain `Scoreboard.swapSides`
- [ ] `npm run build` passes
- [ ] Swap Sides button still renders and works in the UI
