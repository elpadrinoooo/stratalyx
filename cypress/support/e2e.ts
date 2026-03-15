// Cypress E2E support file
// Add custom commands and global hooks here

Cypress.on('uncaught:exception', () => {
  // Prevent Cypress from failing on uncaught app errors during E2E
  return false
})
