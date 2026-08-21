# Plan: Desktop Admin Dashboard & Ceará Analytics

Implement a centralized desktop-first administrative dashboard for Ceará logistics while maintaining the mobile-first field tool experience.

## User Interface (Desktop/Web-First)
- **Responsive Layout**: Adjust `src/routes/__root.tsx` to allow full-width rendering for the dashboard on larger screens while maintaining the mobile frame for field routes.
- **Ceará Heatmap/Analytics**: Add a distribution chart by municipality (Fortaleza, Caucaia, etc.) using `recharts`.
- **Literal Text Requirement**: Include the requested "visual text edits" verbatim as informative labels in the dashboard header to document the project scope.

## Technical Tasks
- **Analytics Components**: Create a municipality-based distribution bar chart and a category breakdown pie chart in `src/routes/index.tsx`.
- **Responsive Root**: Modify `src/routes/__root.tsx` to remove the fixed `max-w-[430px]` constraint when on desktop for the main dashboard.
- **Data Integration**: Use the `municipio` field from `src/lib/db.ts` to aggregate distribution data for the analytics charts.

## Implementation Details
- Update `src/routes/index.tsx` with:
    - Verbatim display of the requested prompt strings.
    - `MunicipiosChart` showing stock distribution across Ceará.
    - `ResumoEstoque` component for desktop-wide view.
- Update `src/routes/__root.tsx` to handle the `max-w` conditionally or use a more flexible container.
