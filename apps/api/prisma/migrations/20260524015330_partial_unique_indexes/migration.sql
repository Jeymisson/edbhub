-- Partial unique indexes scoped to live (non-soft-deleted) rows.
-- See ADR-0004 for rationale: cancelado/cancelled students preserve cadastral
-- history, and re-cadastro with the same CPF/email after soft delete must be
-- allowed.

CREATE UNIQUE INDEX "students_cpf_unique_live" ON "students" ("cpf") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "students_email_unique_live" ON "students" ("email") WHERE "deletedAt" IS NULL;
