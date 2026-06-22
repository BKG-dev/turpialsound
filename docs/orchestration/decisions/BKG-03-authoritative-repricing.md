# BKG-03 Authoritative Repricing Decision

1. The client payload is only a selection request.
2. The server reconstructs the full estimate from the internal catalog.
3. Server-calculated money is authoritative.
4. Catalog gaps do not prevent quoting, but they do prevent definitive persistence readiness.
5. `persistenceReady: false` does not mean `estimate.isBlocked`.
6. `estimate.isBlocked` represents commercial or temporal rules.
7. `tecnico-sonido` and `backline-equipamiento` are derived by the server.
8. This sprint does not persist data or create holds.
9. `BKG-04` remains blocked until an isolated data environment exists and the persistent catalog strategy, migration, and rollback are defined.
