import('./backend/dist/index.js').catch(function(err) {
  console.error('Failed to start app:', err);
  process.exit(1);
});
