---
name: api-design-review
description: Use when reviewing REST API designs, gRPC service definitions, or OpenAPI specifications. Focuses on consistency, best practices, and adherence to API design standards.
version: 1.0.0
keywords: [api, rest, grpc, openapi, swagger, endpoint, http, design]
globs: ["**/openapi.yaml", "**/openapi.yml", "**/swagger.yaml", "**/*.proto", "**/routes/**"]
compatible_platforms: []
author: StaffForge
---
# API Design Review

Use when reviewing REST API designs, gRPC service definitions, or OpenAPI specifications.

## REST Checklist

### URL Design
- [ ] Use nouns for resources, not verbs: `/users` not `/getUsers`
- [ ] Plural nouns for collections: `/users`, `/orders`
- [ ] Consistent nesting: `/users/{id}/orders`
- [ ] Versioning strategy is clear (URL path or header)

### HTTP Methods
- [ ] GET for retrieval (idempotent, safe)
- [ ] POST for creation (non-idempotent)
- [ ] PUT for full replacement (idempotent)
- [ ] PATCH for partial update
- [ ] DELETE for removal

### Status Codes
- [ ] 200 for success, 201 for creation
- [ ] 400 for client errors, 404 for not found
- [ ] 409 for conflicts, 422 for validation
- [ ] 500 only for unexpected server errors

### Response Format
- [ ] Consistent error payload: `{ "error": { "code": "...", "message": "..." } }`
- [ ] Pagination metadata: `{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } }`
- [ ] No sensitive data in responses

## gRPC Checklist
- [ ] Package naming follows reverse domain notation
- [ ] Proto files are versioned
- [ ] Requests and responses are defined as separate messages
- [ ] Streams used for large data transfers
- [ ] Error handling uses standard gRPC status codes
