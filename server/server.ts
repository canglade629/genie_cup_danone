import { createApp, analytics, lakebase, server } from '@databricks/appkit';
import { setupLakebaseRoutes } from './routes/lakebase/recommendation-routes';
import { setupShelfRoutes } from './routes/shelf/analyze-routes';

await createApp({
  plugins: [analytics(), lakebase(), server()],
  async onPluginsReady(appkit) {
    await setupLakebaseRoutes(appkit);
    setupShelfRoutes(appkit);
  },
});
