# Plan: Implement Inventory Audit Feature

Add a new "Physical Inventory Audit" feature to the Materials module to allow correcting stock discrepancies.

## Database Changes
1. Create a new table `historico_estoque` to track all inventory changes (adjustments, exits, etc.).
2. Update existing tables if necessary (e.g., adding a `tipo` column to `saidas` is an alternative, but a dedicated history table is cleaner for "auditoria").

## Store Updates (`src/lib/store.tsx`)
1. Add `processarInventario` action to:
   - Update `materiais` stock levels.
   - Insert records into `historico_estoque` with the tag "Ajuste de Inventário".
2. Add `historico_estoque` to the global state and `fetchAll` logic.

## UI Components
1. **Materials Screen (`src/routes/materiais.tsx`)**:
   - Add a "Realizar Inventário" button next to "Novo Material".
   - Implement `InventarioModal`:
     - List all active items.
     - Inputs for "Quantidade Real Contada".
     - Automatic calculation of "Diferença".
     - "Salvar Inventário" button.
2. **Dashboard/History**:
   - (Optional/Next Step) Ensure the new adjustments are visible in a history view.

## Refinement
- Ensure the "Ajuste de Inventário" tag is prominently displayed in the logs.
- Use Sonner for success/error feedback.
