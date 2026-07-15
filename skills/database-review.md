---
name: database-review
description: Use when reviewing database schema changes, migrations, or query performance. Applies to SQL schema files, migration scripts, and data model definitions.
version: 1.0.0
keywords: [database, sql, migration, schema, query, performance, ddl, dml]
globs: ["*.sql", "migrations/**", "prisma/**", "**/schema.prisma"]
compatible_platforms: []
author: StaffForge
---
# Database Review

Use when reviewing database schema changes, migrations, or query performance.

## Review Checklist

### Schema
- [ ] Every table has a primary key
- [ ] Foreign keys are indexed
- [ ] Columns use appropriate data types (no overly large types)
- [ ] NOT NULL with defaults where applicable
- [ ] Naming follows project conventions (snake_case or camelCase)

### Migrations
- [ ] One logical change per migration
- [ ] Rollback script is provided
- [ ] No destructive changes without data migration plan
- [ ] Migration is reversible (up/down)

### Performance
- [ ] Queries use indexes (check with EXPLAIN ANALYZE)
- [ ] No SELECT * in production queries
- [ ] JOINs use indexed columns
- [ ] Pagination uses keyset pagination, not OFFSET for large datasets

### Security
- [ ] No raw SQL concatenation (use parameterized queries)
- [ ] Least-privilege database user for application
- [ ] Sensitive columns are encrypted at rest
