---
name: Runtime probe side effects
description: A shell probe for a missing runtime may modify the Replit runtime configuration.
---

In this workspace, probing `python3` during Node.js work coincided with Replit adding `python-base-3.13` to `.replit`.

**Why:** An unrelated runtime change created an extra configuration diff that had to be reverted.

**How to apply:** Avoid probing runtimes unless needed. After package or runtime operations, inspect `.replit` for unrelated changes and use the validated replacement flow if it needs restoring.
