# 📘 Why We Give `civitai_owner` Limited Admin Powers

## 1️⃣ Context

Our Civitai PostgreSQL deployment provisions human users (e.g. `richard`, `alice`) via SQL during container startup. Each login should:

* Use its own database role and password.
* Only perform `SELECT`, `INSERT`, `UPDATE` on application tables.
* Automatically populate audit columns (`created_by`, `updated_by`).
* Be created idempotently by migration scripts (`infra/db-init/*.sql`).

PostgreSQL enforces that only roles with `CREATEROLE` can create or alter other roles, so we need a safe way for migrations to provision logins without handing blanket superuser access to the runtime roles.

---

## 2️⃣ What the Code Does Today

`infra/db-init/01-roles.sql` establishes two structural roles:

```sql
CREATE ROLE civitai_owner NOLOGIN CREATEROLE;
CREATE ROLE civitai_user  NOLOGIN;
GRANT civitai_user TO civitai_owner WITH ADMIN OPTION;
```

`civitai_owner` owns the schema and is marked `CREATEROLE`, which lets it manage downstream login roles. Application connections inherit privileges through `civitai_user`, keeping runtime permissions narrow.

`infra/db-init/02_functions.sql` defines the helper that migrations call:

```sql
CREATE OR REPLACE FUNCTION civitai.create_app_user(p_username text, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- validates, creates or alters the login role, then grants civitai_user
END;
$$;
```

Because the function is `SECURITY DEFINER` and owned by `civitai_owner`, the code executes with `civitai_owner`'s `CREATEROLE` privilege. `infra/db-init/03_init.sql` then provisions seed logins using this helper.

---

## 3️⃣ Why This Shape Works

* **Least privilege at runtime** — client connections still use logins that only have `civitai_user`; they cannot create roles or bypass row-level security.
* **Controlled role creation** — only the migration-time helper inherits `CREATEROLE`, isolating the capability inside a single audited function.
* **Idempotent provisioning** — the function updates existing roles (`ALTER ROLE ... PASSWORD`) when rerun, so migrations stay reentrant.
* **Audit consistency** — the helper hands out `civitai_user`, and our triggers (`set_created_updated_by`, `audit_event`) rely on `current_user` to capture who changed a record.

---

## 4️⃣ Security Guardrails in Place

* `civitai_owner` is `NOLOGIN`, so no one can connect as it directly.
* The helper only grants `civitai_user`, preventing privilege escalation even if it is misused.
* Table-level grants, trigger wiring, and row-level policies are enforced through `civitai.register_audited_table`, ensuring new tables inherit the right protections automatically.

> 📌 We intentionally **do not** introduce an extra `civitai_admin` role in this repository; the existing migrations already give `civitai_owner` the minimal elevated capability required to run `create_app_user` during initialization.

---

## 5️⃣ Call Flow Overview

```
postgres (container superuser)
   │
   ├── executes 01-roles.sql → civitai_owner (NOLOGIN, CREATEROLE)
   │
   ├── executes 02_functions.sql → civitai.create_app_user() [SECURITY DEFINER]
   │
   └── executes 03_init.sql → civitai.create_app_user('richard', '...')
            │
            ▼
         civitai_owner (definer)
            │
            ├── CREATE ROLE richard LOGIN ...
            └── GRANT civitai_user TO richard
```

---

## 6️⃣ Takeaway

Granting `CREATEROLE` directly to the schema owner keeps the privilege surface small while letting our migrations operate unattended. The helper function encapsulates role provisioning, making it safe to rerun and easy to audit. No additional admin role is needed for the current code path.
