// One time: node store/keys/make-keypair.mjs
// Prints the PRIVATE key (goes ONLY into Supabase secrets as PLS_KEY_PRIVATE_JWK) and the PUBLIC key (goes into
// store-config.js and into every app). Never commit the private key anywhere.
import { newKeyPair } from '../../supabase/functions/paddle-webhook/lib.js';
const k = await newKeyPair();
console.log('PRIVATE (Supabase secret PLS_KEY_PRIVATE_JWK):\n' + JSON.stringify(k.privateJwk) + '\n');
console.log('PUBLIC (store-config.js pulseKeyPublic, and the apps):\n' + k.publicRaw);
