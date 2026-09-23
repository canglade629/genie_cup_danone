import { createApp, analytics, files, genie, lakebase, server } from '@databricks/appkit';
import { setupLakebaseRoutes } from './routes/lakebase/recommendation-routes';
import { setupShelfRoutes } from './routes/shelf/analyze-routes';

const genieSpaceId = process.env.DATABRICKS_GENIE_SPACE_ID;

if (!genieSpaceId) {
  throw new Error('DATABRICKS_GENIE_SPACE_ID is required');
}

await createApp({
  plugins: [
    analytics(),
    files({
      volumes: {
        files: {
          policy: files.policy.publicRead(),
        },
      },
    }),
    genie({ spaces: { default: genieSpaceId } }),
    lakebase(),
    server(),
  ],
  async onPluginsReady(appkit) {
    await setupLakebaseRoutes(appkit);
    setupShelfRoutes(appkit);
    appkit.server.extend((app) => {
      app.get('/api/whoami', (req, res) => {
        const forwardedIdentity = req.header('x-forwarded-email') ?? req.header('x-forwarded-user') ?? null;

        res.json({
          user: forwardedIdentity ?? 'Local developer',
          executionMode: forwardedIdentity ? 'on_behalf_of' : 'local',
        });
      });
    });
  },
});
