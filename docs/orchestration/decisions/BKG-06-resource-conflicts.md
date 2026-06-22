# BKG-06 Resource Conflicts

- SHA reviewed: `262e2adc77b7f25b66ca8cfa58b5a171da51720d`
- Decision: `CONTINUE`

## Rules

- managed temporal services resolve against a canonical resource policy;
- the planner orders the temporal block before resource resolution;
- collision checks use isolated read-only SQL and half-open intervals;
- `resourceId` is not persisted in this sprint;
- holds remain out of scope;
- `video-session` and `consultoria` remain policy gaps until a business decision exists;
- no production writes occur in this sprint.

## Production

- not authorized.
