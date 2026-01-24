---
name: frontend-dashboard-design
description: Design and implement clean, fast, repeatable, production-grade frontend dashboards optimized for large datasets, static hosting, and long-term maintainability. Use this skill when building data-heavy UIs, dashboards, tables, filters, analytics interfaces, or performance-sensitive frontend applications.
license: Complete terms in LICENSE.txt
---

This skill guides the design and implementation of **high-performance, production-grade frontend dashboards** with a strong emphasis on **clarity, speed, scalability, and user experience**. It is specifically optimized for **large datasets**, **static hosting environments (e.g., GitHub Pages)**, and **modern frontend architectures**.

The goal is to produce interfaces that are **fast, trustworthy, accessible, and easy to evolve**, avoiding fragile designs, unnecessary complexity, and common performance pitfalls.

The user provides frontend requirements such as a dashboard, table-heavy interface, analytics view, or data exploration tool, along with context about the audience, data size, and technical constraints.

---

## Core Principles

### Performance First
Performance is not an optimization step—it is a design constraint.

- Never assume all data can be loaded, rendered, or searched at once
- Prefer query-driven, paginated, and virtualized interfaces
- Set explicit limits on rows rendered, data fetched, and UI complexity
- Optimize for *time to first meaningful interaction*, not page load alone

If the interface requires loading the full dataset to function, the design is incorrect.

---

## System Design Thinking

Before implementing UI components, establish the following:

- **Purpose**: What decision or task does this dashboard support?
- **Primary User Path**: What is the fastest way for a user to get value?
- **Data Shape**: Row count, column count, text vs numeric fields
- **Hosting Constraints**: Static vs server-backed, bandwidth limits, memory limits
- **Failure Modes**: Slow queries, empty results, partial data, large filters

Design must align with these constraints from the outset.

---

## Frontend Architecture Guidelines

### Component Design
- Single-responsibility components (Table, FilterBar, MetricCard, EmptyState)
- Clear, deterministic inputs and outputs
- Avoid hidden global state or side effects
- Favor composition over inheritance
- Define stable component APIs early

### Rendering Strategy
- Never render unbounded lists or tables
- Use virtualization for rows and columns
- Paginate aggressively (e.g., 50–200 rows)
- Defer expensive operations until explicitly requested

### State Management
- Make state explicit and observable
- Persist view state (filters, sorts, columns) in the URL when possible
- Separate UI state from query/data state

---

## UI/UX Design Principles

### What Makes a Good User Experience
- Fast feedback and visible system status
- Clear explanation of what the user is seeing and why
- Predictable behavior across views
- Easy recovery from errors and empty states
- Low cognitive load through progressive disclosure

A good dashboard minimizes thinking and maximizes confidence.

### Accessibility
- Keyboard navigation is mandatory
- Semantic HTML over div-heavy layouts
- Adequate color contrast and readable typography
- Accessible tables with proper headers and focus behavior

Accessibility improves usability for all users and should not be treated as optional.

---

## Visual Design & Theming

### Design System Mindset
- Use design tokens (colors, spacing, typography) via CSS variables
- Prefer semantic tokens (`--color-surface`, `--color-accent`)
- Enforce consistency through shared components and utilities
- Support dark/light themes via token switching

### Visual Clarity Over Decoration
- Favor whitespace, alignment, and hierarchy
- Use restrained color palettes with intentional accents
- Avoid decorative effects that obscure data
- Typography should prioritize legibility and hierarchy

Visual appeal comes from consistency and restraint, not excess.

---

## Data-Heavy Dashboard Best Practices

- Always show:
  - Active filters
  - Row counts
  - Sort order
  - Data source/version when applicable
- Provide clear empty and loading states
- Avoid “filter walls”; group and prioritize controls
- Separate summary views from detailed drill-downs

Trust is a UX feature.

---

## Recommended Technology Stack (Static Hosting Optimized)

### Core Framework
- **React + Vite** for fast builds and static deployment

### Data Query Layer
- **DuckDB-WASM** for in-browser SQL querying of Parquet/CSV
- Enables server-like querying without a backend

### Data Format
- **Parquet** (preprocessed via Python)
- Columnar, compressed, efficient for wide, text-heavy datasets

### Tables & Virtualization
- **TanStack Table**
- **TanStack Virtual** or `react-window`

### UI Primitives & Accessibility
- **Radix UI** primitives
- **shadcn/ui** for composable, in-repo components

### Styling
- **Tailwind CSS** with design tokens
- CSS variables for theming

### State & Validation
- **Zustand** for application state
- **Zod** for schema validation

### Charts (Optional)
- **ECharts** for performant dashboards
- **Vega-Lite** for declarative, consistent visuals

---

## Non-Negotiable Rules

- Never render the full dataset
- Never ship raw Excel or massive JSON to the browser
- Never block the main thread with heavy computation
- Never hide system state from the user
- Never sacrifice clarity for visual novelty

---

## Outcome

When applied correctly, this skill produces frontend dashboards that are:

- Fast under real-world data sizes
- Clear and predictable for users
- Accessible and trustworthy
- Easy to extend and maintain
- Suitable for static hosting environments

The result is not just a “working UI,” but a **reliable decision-making interface** designed for longevity and scale.
