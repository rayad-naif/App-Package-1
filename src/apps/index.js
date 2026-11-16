'use strict';
/* The six apps. Each is its own HighLevel Marketplace listing served under
   its own path on the shared domain: https://<domain>/<slug>/... */
const APPS = [
  require('./lead-scorer'),
  require('./round-robin'),
  require('./contact-cleaner'),
  require('./after-hours'),
  require('./birthday'),
  require('./intent-radar')
];

/* Every app can be installed by an agency into many sub-accounts at once.
   That install returns an agency (Company) token; turning it into a token
   per sub-account needs these two scopes:
     oauth.readonly  GET  /oauth/installedLocations  (which sub-accounts have the app)
     oauth.write     POST /oauth/locationToken       (a token for one sub-account) */
const AGENCY_INSTALL_SCOPES = ['oauth.readonly', 'oauth.write'];
for (const a of APPS) a.scopes = [...new Set(a.scopes.concat(AGENCY_INSTALL_SCOPES))];

module.exports = APPS;
