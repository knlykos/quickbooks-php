import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import * as soap from 'soap';
import { service } from './soap/service';
import { WSDL } from './soap/wsdl';
import { logger } from './lib/logger';
import { db } from './db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';


// Initialize WSDL once
const wsdlPromise = new Promise<any>((resolve, reject) => {
  console.log('Initializing WSDL...');
  try {
    const wsdlObj = new soap.WSDL(WSDL, undefined, {});
    wsdlObj.onReady((err) => {
      if (err) {
        console.error('WSDL onReady error:', err);
        reject(err);
      } else {
        console.log('WSDL initialized successfully');
        resolve(wsdlObj);
      }
    });
  } catch (err) {
    console.error('WSDL constructor error:', err);
    reject(err);
  }
});
// Handle potential unhandled rejection if no request comes in immediately
wsdlPromise.catch(err => console.error('Global WSDL Promise rejected:', err));

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

// Serve WSDL at /soap for QBWC verification
app.get('/soap', (c) => {
  return c.text(WSDL, 200, {
    'Content-Type': 'text/xml',
  });
});

// SOAP Endpoint
// SOAP Endpoint
app.post('/soap', async (c) => {
  const requestBody = await c.req.text();
  const headers = c.req.header();

  try {
    const wsdlObj = await wsdlPromise;

    return new Promise((resolve) => {
      // 1. Create a dummy http server mock because soap.Server requires one
      const mockHttpServer = {
        listeners: () => [],
        removeAllListeners: () => { },
        addListener: () => { },
      };

      // 2. Instantiate soap.Server
      const soapServer = new soap.Server(
        mockHttpServer as any,
        '/soap',
        service,
        wsdlObj,
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
          if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'text/xml';
          }
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
  } catch (err) {
    console.error('WSDL initialization error:', err);
    return c.text('Internal Server Error', 500);
  }
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
