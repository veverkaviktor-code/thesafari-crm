# Task Completion Checklist

When a coding task is completed, verify:

1. **Code style**: PHP follows PSR-12 / Laravel conventions, TS follows project patterns
2. **TypeScript**: No type errors (check with `npx tsc --noEmit` if available)
3. **Routes**: If new routes added, follow Czech naming convention
4. **Migrations**: If DB changes, create proper migration with VARCHAR+CHECK (no ENUM)
5. **Inertia props**: Backend and frontend prop names must match
6. **Soft deletes**: Use on entity models (customers, orders, invoices, subscriptions)
7. **Activity log**: Add `LogsActivity` trait to new models if they need audit trail
8. **Security**: Validate inputs server-side, use parameterized queries, no secrets in frontend
9. **Design**: Follow Safari Dark palette (#0a0a08, #D97706, #F5F0E8), Apple-inspired style
10. **Build**: `npm run build` should succeed
11. **Deploy**: Changes need to be deployed to VPS after verification
