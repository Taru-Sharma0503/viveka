import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { dbService } from './services/db.service.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Viveka Backend Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Healthcheck: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});

// Graceful shutdown handling
const handleGracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    if (dbService.prisma && dbService.isConnectedToPrisma) {
      await dbService.prisma.$disconnect();
    }
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

export default server;
