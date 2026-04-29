# Security Specification: MythosForge

## Data Invariants
- A character sheet must always have an owner (`uid`).
- Only the owner or an admin can read or write a character sheet.
- Character IDs must be well-formed strings.
- Timestamps must be server-validated.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a character with someone else's `uid`.
2. **Ghost Field Injection**: Adding an `isVerified: true` field to a character sheet.
3. **ID Poisoning**: Creating a character with a 2KB string as the ID.
4. **Unauthorized Read**: Attempting to `get` a character belonging to another user.
5. **Unauthorized List**: Querying `characters` collection without a `uid` filter.
6. **Bypassing Owner Lock**: Trying to change the `uid` of an existing character.
7. **Resource Exhaustion**: Sending a 1MB string in the `name` field.
8. **Invalid Action**: Updating the `level` of a character by 100 in one go (if level caps existed).
9. **Type Poisoning**: Sending `level: "MAX"` instead of a number.
10. **Timestamp Manipulation**: Sending a manual `updatedAt` from the future.
11. **Admin Escalation**: Attempting to write to `/library` as a non-admin.
12. **Relational Break**: Creating a roll in a campaign that doesn't exist (though rolls are open-read for now, we should harden).

## Test Runner Logic

We will enforce these via `isValidCharacter` and strict `affectedKeys` in `update`.
