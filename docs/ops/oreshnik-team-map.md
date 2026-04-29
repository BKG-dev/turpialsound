# Oreshnik Team Map - Turpial Sound Project

This document outlines the distribution of responsibilities within the Turpial Sound project, following the ORESHNIK 6D philosophy.

## Core Mandate: ORESHNIK 6D
The project leverages a distributed intelligence model where Codex acts as the strategic brain for critical backend and architectural components, while Gemini agents serve as the execution muscle for various specialized tasks.

## Roles and Responsibilities

### AGENT 1 — CODEX (BRAIN)
-   **Focus:** Critical backend systems, database schema, security, core architecture, payment processing logic, and authentication.
-   **Mandate:** Defines structure and contracts.

### GEMINI AGENTS (MUSCLE)

-   **AGENTE 2 — GEMINI (UI)**
    -   **Focus:** User Interface (UI) components, layouts, dashboards, dynamic rendering.
    -   **Mandate:** Implements the user-facing aspects defined by Codex.

-   **AGENTE 3 — GEMINI (DOCS Y HANDOFF) - *This Agent***
    -   **Focus:** Project documentation, handoff procedures, and roadmap management.
    -   **Mandate:** Ensures up-to-date and clear communication regarding project status, processes, and future plans. This agent explicitly **does not touch productive code**.

-   **AGENTE 4 — GEMINI (QA + TESTS)**
    -   **Focus:** Quality Assurance (QA) matrices, smoke tests, edge case testing.
    -   **Mandate:** Verifies the correctness and robustness of implemented features.

-   **AGENTE 5 — GEMINI (SCRIPTS + HELPERS)**
    -   **Focus:** Utility scripts, parsers, and helper functions across the codebase.
    -   **Mandate:** Provides supporting tools and reusable logic.

-   **AGENTE 6 — GEMINI (SECURITY + RED TEAM)**
    -   **Focus:** Security testing, abuse case analysis, and validation of security measures.
    -   **Mandate:** Identifies and mitigates security vulnerabilities.

### External Responsibilities

-   **Marketplace Management (Manuel)**
    -   **Scope:** The entire Marketplace module (including its specific functionalities, database models, and integrations) is solely under the responsibility of Manuel.
    -   **Interaction:** Gemini agents should only mention Marketplace as "out of scope / Manuel / pending user integration" and **must not** document it as part of the core project's responsibilities or make changes to its codebase.

-   **User Responsibilities (Main Integration)**
    -   **Scope:** The user is responsible for critical integration tasks, including:
        -   Managing `main` branch merges.
        -   Database merges (`DB merge`).
        -   Overall UI/UX integration.
        -   Final integration of the Marketplace module into the main application flow.
    -   **Interaction:** Gemini agents facilitate development up to this point but do not execute these final integration steps.

### Areas NOT to be touched by Gemini Agents (Direct Write Prohibited)
-   `prisma/schema.prisma` and database migrations.
-   Critical financial/payment logic.
-   Authentication/Permissions systems.
-   Secret management (`.env` files).
-   Productive code outside of explicitly authorized zones.

This map ensures clear lines of responsibility and efficient parallel development.
