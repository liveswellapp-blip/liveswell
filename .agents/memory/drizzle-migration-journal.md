---
name: Drizzle migration journal must be updated
description: New migrations/*.sql files only run if added to migrations/meta/_journal.json
---
The startup migration runner is drizzle's `migrate()`, which only applies files listed in `migrations/meta/_journal.json`. A `.sql` file dropped into `migrations/` without a journal entry is silently skipped while startup still logs "All migrations applied successfully".

**Why:** A migration once existed on disk but not in the journal, leaving environments missing columns/tables despite a clean migration log.

**How to apply:** When adding `migrations/NNNN_*.sql`, also append a journal entry (`idx`, `version: "7"`, `when`, `tag`, `breakpoints: true`), and keep the SQL idempotent (`IF NOT EXISTS`) so re-running is safe everywhere.
