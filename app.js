const fs = require('fs');
const path = require('path');

const logFile = path.join(process.cwd(), 'debug.log');

function log(msg) {
  fs.appendFileSync(logFile, new Date().toISOString() + ' ' + msg + '\n');
}

try {
  log('app.js starting');
  log('cwd: ' + process.cwd());
  log('__dirname: ' + __dirname);
  log('NODE_ENV: ' + process.env.NODE_ENV);
  log('Loading backend...');
  require('./backend/dist/index.js');
  log('Backend loaded');
} catch (err) {
  log('FATAL: ' + err.stack);
}
