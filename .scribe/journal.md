# Scribe's Journal

## Ambiguities & Observations

### Database Management

- **Manual Migrations**: The `backend/database.js` file contains a custom `runMigrations` function instead of using the standard Sequelize CLI migration framework. This makes schema versioning less strict and potentially harder to manage in production environments.
- **Seeding**: Initial data is seeded via `seedDatabase()` which checks for `ignoreDuplicates` or `findOrCreate`.

### Frontend/Backend Coupling

- **Shared Logic**: XP calculations (`getExperienceForLevel`) seem to exist in the backend (`rpg.js`). Need to verify if this logic is duplicated in the frontend or if the frontend relies solely on API responses for level data.

### Smart Contract Integration

- **Hardcoded Addresses**: Need to verify if contract addresses are dynamically loaded from environment variables in all places or if there are any hardcoded fallbacks in the frontend source code.

### Docker Environment

- **Root vs Backend Dependencies**: The project requires `npm install` in root AND `npm install --prefix backend`. The Dockerfile likely handles this, but local development instructions need to be explicit about this dual-installation requirement.
