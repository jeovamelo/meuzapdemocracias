# Plan: Apoiador Self-Registration Link

Create a public registration page for supporters to sign up with their name, WhatsApp number, and address. This link can be shared via WhatsApp or QR code.

## User Steps
1. Navigate to the new public registration route `/cadastro`.
2. Enter full name, WhatsApp number, and address (neighborhood/zone).
3. Submit the form to be added to the database.
4. See a confirmation message.

## Technical Details
- **New Route**: `src/routes/cadastro.tsx` for the public registration form.
- **Data Update**: Use `addPessoa` from the store to save new supporters.
- **Navigation Update**: Add a "Share Link" button in the `Pessoas` list or `Dashboard` to easily copy the registration URL.
- **UI/UX**: Maintain the "High Visibility" design system (orange primary, large buttons, clean inputs).

## Changes
- Create `src/routes/cadastro.tsx`.
- Update `src/routes/index.tsx` to include a button for copying/viewing the registration link.
- Update `src/routes/pessoas.tsx` to include the same link for coordinators.
