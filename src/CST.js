/**
 * @namespace CST
 * @description A central repository for constants used throughout the game.
 * This helps prevent typos and ensures consistency across different files and scenes.
 */
export const CST = {
  /**
   * @memberof CST
   * @namespace SCENES
   * @description Contains the unique keys for all Phaser scenes in the game.
   * Using these constants (e.g., `CST.SCENES.MENU`) is preferred over using raw strings
   * to avoid errors and improve code maintainability.
   */
  SCENES: {
    TERMS: 'TermsScene',
    LOADING: 'LoadingScene',
    START: 'StartScene',
    AUTH_CHOICE: 'AuthChoiceScene',
    MENU: 'MenuScene',
    GAME: 'GameScene',
    GAME_OVER: 'GameOverScene',
    PROFILE: 'ProfileScene',
    CHARACTER_SELECTION: 'CharacterSelectionScene',
    HUD: 'HUDScene',
    PAUSE: 'PauseScene',
    NOTIFICATION: 'NotificationScene',
    ALTAR: 'AltarScene',
    PVP: 'PvpScene',
    TOURNAMENT_LOBBY: 'TournamentLobbyScene',
    TOURNAMENT_BRACKET: 'TournamentBracketScene',
  },
  /**
   * @memberof CST
   * @namespace ASSETS
   * @description Holds keys for commonly used assets. While most assets are managed
   * by the asset-manifest, constants for frequently accessed or dynamically used
   * assets can be defined here.
   */
  ASSETS: {
    BLACK_BG: 'black_bg',
  },
  /**
   * @memberof CST
   * @namespace CONTRACTS
   * @description Placeholder for contract ABIs and addresses. In this project, these
   * are dynamically imported from 'src/config/contracts.js' where needed.
   */
  CONTRACTS: {
    // ABIs and addresses will be imported from 'src/config/contracts.js'
  },
};
