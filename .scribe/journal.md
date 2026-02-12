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

### Database Discrepancies
- **Missing Models in ERD**: `GameSetting` and `AltarStatus` exist in `backend/database.js` but were missing from the initial `docs/ARCHITECTURE.md`.
- **Hero Attributes**: The `Hero` model has detailed combat stats (`fireRate`, `bombSize`, `multiShot`, `extraLives`, `hp`, `maxHp`, `damage`, `speed`) that need to be reflected in the ERD.
- **SoloGameHistory**: Has `claimed` and `timestamp` fields relevant to the reward cycle.

### Magic Numbers
- **Wager Tiers**: Costs (e.g., Bronze: 10 BCOIN, 20 XP) are hardcoded in `seedDatabase()` within `backend/database.js`. These should ideally be in a config file or smart contract.

### PvP Implementation
- **Protocol**: The `backend/routes/pvp.js` uses standard HTTP POST requests for `wager/enter` and `wager/report`, implying a polling mechanism or simple request/response flow rather than real-time WebSockets. This simplifies the architecture but might limit "instant" feel.
