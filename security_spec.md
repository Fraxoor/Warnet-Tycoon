# Security Specification — Warnet Tycoon Global Leaderboard

## 1. Data Invariants
1. **Identity Integrity**: Every document in `/leaderboard/{entryId}` and `/users/{userId}` must use the caller's own `request.auth.uid` as both the document ID and the `uid` field. Verified Google accounts (`request.auth.token.email_verified == true`) are required for all writes.
2. **Zero PII on Public Leaderboard**: `/leaderboard/{entryId}` strictly forbids email, phone, or address fields via `keys().hasOnly(...)` and `keys().hasAll(...)`.
3. **Immutable Ownership & Creation Time**: `uid` and `createdAt` cannot be changed after creation.
4. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time` (server timestamp).
5. **Bounded Numeric & String Payloads**: All strings (`uid`, `playerName`, `cafeName`) enforce strict `.size()` bounds; all game metrics (`score`, `balance`, `reputation`, `businessRating`, `stage`, `pcCount`, `day`, `totalCustomersServed`) enforce realistic numeric bounds.
6. **Secure List Queries**: `allow list` on `/leaderboard` evaluates `resource.data.score >= 0` directly rather than delegating filtering to the client. `/users` disallows `list` entirely.

## 2. "Dirty Dozen" Adversarial Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Write**: Create `/leaderboard/attacker` with `request.auth == null`.
2. **Unverified Email Write**: Create `/leaderboard/user1` with `email_verified: false`.
3. **Identity Spoofing (Doc ID mismatch)**: Signed in as `userA`, write `/leaderboard/userB` with `uid: "userA"`.
4. **Identity Spoofing (UID field mismatch)**: Signed in as `userA`, write `/leaderboard/userA` with `uid: "userB"`.
5. **Shadow / Ghost Field Injection**: Signed in as `userA`, create `/leaderboard/userA` with an extra field `isAdmin: true` or `email: "leak@example.com"`.
6. **Client Timestamp Forgery**: Create `/leaderboard/userA` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
7. **Immutable `createdAt` Tampering**: Update `/leaderboard/userA` attempting to alter `createdAt`.
8. **Immutable `uid` Tampering**: Update `/leaderboard/userA` attempting to alter `uid`.
9. **Resource Poisoning (Oversized Name)**: Create `/leaderboard/userA` with a 500-character `cafeName`.
10. **Value Poisoning (Invalid Score / Type)**: Update `/leaderboard/userA` with `score: "999999999"` (string) or `score: -500` or `stage: 99`.
11. **Path ID Poisoning**: Attempt `get` or `create` at `/leaderboard/bad$id!` failing `isValidId()`.
12. **Blanket List Query Bypass / User Profile Scraping**: Attempt `list` on `/users` or un-filtered `list` on `/leaderboard` without `where('score', '>=', 0)`.
