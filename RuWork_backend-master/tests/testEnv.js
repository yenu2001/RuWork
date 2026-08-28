/**
 * Loaded through `node --import` before any test module, so the explicit Phase 10 test gate is
 * set before `utils/env.js` is first evaluated. This replaces the former implicit
 * `mongoose.connection.readyState === 0` inference: test-only fallbacks are now opt-in and can
 * never activate in a deployed environment.
 */
process.env.NODE_ENV = "test";
process.env.RUWORK_TEST_MODE = "true";
