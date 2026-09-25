import { app } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'

const server = app.listen(config.port, () => console.log(`БАЗИС CRM API listening on port ${config.port}`))
async function shutdown() { server.close(); await prisma.$disconnect(); process.exit(0) }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown)
