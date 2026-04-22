const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\nAggiungi queste variabili su Railway e nel tuo server/.env:\n');
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_EMAIL="mailto:tu@esempio.it"\n`);
