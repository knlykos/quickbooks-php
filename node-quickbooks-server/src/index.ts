import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import * as soap from 'soap';
import { service } from './soap/service';
import { WSDL } from './soap/wsdl';
import { logger } from './lib/logger';
import { db } from './db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const app = new Hono();

app.get('/', (c) => {
  return c.text('QuickBooks SOAP Server Running');
});

// Serve WSDL
app.get('/wsdl', (c) => {
  return c.text(WSDL, 200, {
    'Content-Type': 'text/xml',
  });
});

// SOAP Endpoint
app.post('/soap', async (c) => {
  const requestBody = await c.req.text();
  const headers = c.req.header();

  return new Promise((resolve) => {
    // 1. Create a dummy http server mock because soap.Server requires one
    const mockHttpServer = {
      listeners: () => [],
      removeAllListeners: () => {},
      addListener: () => {},
    };

    // 2. Instantiate soap.Server
    const soapServer = new soap.Server(
      mockHttpServer as any,
      '/soap',
      service,
      WSDL as any, // Cast to any because TS definition might expect something else but string works
      {
         escapeXML: true,
         returnFault: true,
         enableChunkedEncoding: false,
         path: '/soap',
         services: service
      }
    );

    // 3. Mock the Request object
    const req = {
      url: '/soap',
      method: 'POST',
      headers: headers,
      body: requestBody,
    };

    // 4. Mock the Response object
    const res = {
      statusCode: 200,
      headers: {} as any,
      setHeader(key: string, val: string) {
        this.headers[key] = val;
      },
      write(chunk: any) {
         // Not used with enableChunkedEncoding: false
      },
      end(chunk: any) {
        // This is called when SOAP processing is done
        resolve(
          c.body(chunk, {
            status: this.statusCode,
            headers: this.headers,
          }) as any
        );
      },
    };

    // 5. Trigger the processing manually
    try {
      // @ts-ignore - access private method
      soapServer._processRequestXml(req, res, requestBody);
    } catch (err) {
      console.error('SOAP processing error:', err);
      resolve(c.text('Internal Server Error', 500) as any);
    }
  });
});

const port = 3000;
console.log(`Server is running on port ${port}`);

// Run migrations on start (for dev/demo purposes)
(async () => {
    try {
        if (process.env.DATABASE_URL) {
            console.log('Running migrations...');
            await migrate(db, { migrationsFolder: './drizzle' });
            console.log('Migrations complete.');
        }
    } catch (e) {
        console.error('Migration failed:', e);
    }

    serve({
      fetch: app.fetch,
      port
    });
})();
