# Resource Policy Decision Request

The policies already approved are:

## sala-ensayo

1. `sala-3-ensayo`
2. `sala-1-grande`

## grabacion

1. `sala-1-grande`

## podcast-locucion

1. `sala-2-podcast-locucion`

Two decisions remain.

For each service, the owner must define one of these modes:

## physical

The service needs a physical resource.

It must specify an ordered list using only:

- `sala-1-grande`
- `sala-2-podcast-locucion`
- `sala-3-ensayo`

## no_physical_resource

The service consumes schedule time, but does not block any physical room.

This option will require an explicit schedule policy without `resourceId` before BKG-07.

Do not choose automatically.
Do not assume policies from the service name.
Do not use aliases.
Do not invent new rooms.

## RESOURCE POLICY OWNER RESPONSE

video-session:
mode: PENDING_OWNER
candidateResourceSlugs: []

consultoria:
mode: PENDING_OWNER
candidateResourceSlugs: []

Valid format for a physical response:

video-session:
mode: physical
candidateResourceSlugs:

* `sala-1-grande`

Valid format for a no-resource response:

consultoria:
mode: no_physical_resource
candidateResourceSlugs: []

BKG-07 remains blocked until both `mode` values stop being `PENDING_OWNER`.
