# EDU SMART Firestore Security Specification

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`private`, `studyTasks`, `thinkEntries`, `factChecks`, `selfTests`, `surveys`) belongs strictly to the authenticated, email-verified user matching `{userId}` unless accessed by a verified admin.
2. Users cannot self-assign `teacherApproved: true` or elevate themselves to an `admin` role.
3. PII (`email`, `phone`, `birthDate`) is isolated in `/users/{userId}/private/info` and is readable/writable only by the owner or verified admin.
4. Immutable ownership (`userId`, `uid`) and creation timestamps (`createdAt == request.time`) are enforced on every write.
5. Every string and array enforces strict bounded `.size()` limits to prevent payload poisoning.
6. Updates strictly use `affectedKeys().hasOnly(...)` paired with the entity validation helper.

## 2. Dirty Dozen Adversarial Payloads
1. **Self-Admin / Teacher Approval Escalation**: Creating `/users/u1` with `teacherApproved: true`.
2. **Ghost Field Shadow Write**: Creating `/users/u1/studyTasks/t1` with extra key `isAdmin: true`.
3. **Unverified Email Spoofing**: Writing `/users/u1` when `request.auth.token.email_verified == false`.
4. **Cross-Tenant Task Spoofing**: User `u2` creating `/users/u1/studyTasks/t1` with `userId: "u1"`.
5. **Cross-Tenant PII Read**: User `u2` reading `/users/u1/private/info`.
6. **Oversized ID Poisoning**: Creating `/users/u1/studyTasks/<150-char-invalid-id>` or special chars `../etc`.
7. **1MB String Exhaustion**: Creating `/users/u1/thinkEntries/e1` with `answer` exceeding 3000 characters.
8. **Invalid Survey Array Length**: Creating `/users/u1/surveys/s1` with `answers: [5, 5]` (fewer than 7 items).
9. **Client Timestamp Forgery**: Creating `/users/u1/studyTasks/t1` with `createdAt` not equal to `request.time`.
10. **Immutable Owner Mutation**: Updating `/users/u1/studyTasks/t1` to change `userId` to `"u2"`.
11. **Unlisted Update Key**: Updating `/users/u1` with `affectedKeys` including `uid` or `createdAt`.
12. **Blanket Collection Listing**: Executing list query on `/users` or `/users/u1/studyTasks` as `u2`.
