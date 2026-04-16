import express from 'express';

export const registerTerminalApiMiddlewares = (app: express.Express) => {
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[agent-system-backend] request error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: error?.message || 'Unexpected backend error',
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'endpoint_not_found' });
  });
};

export const startControlApiServer = async (input: {
  app: express.Express;
  host: string;
  port: number;
  hydrateControlApiFromPostgres: () => Promise<void>;
  initializeAssetRegistry: () => Promise<void>;
}) => {
  await input.hydrateControlApiFromPostgres();
  try {
    await input.initializeAssetRegistry();
  } catch (error) {
    console.error('[agent-system-backend] asset registry initialization error:', error);
  }
  input.app.listen(input.port, input.host, () => {
    console.log(`[agent-system-backend] listening on http://${input.host}:${input.port}`);
  });
};
