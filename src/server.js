const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`OPD Token Allocation Engine`);
  console.log(`========================================`);
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Port: ${PORT}`);
  console.log(`Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`========================================\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = server;
