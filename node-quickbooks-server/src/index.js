"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const soap = __importStar(require("soap"));
const service_1 = require("./soap/service");
const wsdl_1 = require("./soap/wsdl");
const db_1 = require("./db");
const migrator_1 = require("drizzle-orm/postgres-js/migrator");
const app = new hono_1.Hono();
app.get('/', (c) => {
    return c.text('QuickBooks SOAP Server Running');
});
// Serve WSDL
app.get('/wsdl', (c) => {
    return c.text(wsdl_1.WSDL, 200, {
        'Content-Type': 'text/xml',
    });
});
// SOAP Endpoint
app.post('/soap', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const requestBody = yield c.req.text();
    const headers = c.req.header();
    return new Promise((resolve) => {
        // 1. Create a dummy http server mock because soap.Server requires one
        const mockHttpServer = {
            listeners: () => [],
            removeAllListeners: () => { },
            addListener: () => { },
        };
        // 2. Instantiate soap.Server
        const soapServer = new soap.Server(mockHttpServer, '/soap', service_1.service, wsdl_1.WSDL, // Cast to any because TS definition might expect something else but string works
        {
            escapeXML: true,
            returnFault: true,
            enableChunkedEncoding: false,
            path: '/soap',
            services: service_1.service
        });
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
            headers: {},
            setHeader(key, val) {
                this.headers[key] = val;
            },
            write(chunk) {
                // Not used with enableChunkedEncoding: false
            },
            end(chunk) {
                // This is called when SOAP processing is done
                resolve(c.body(chunk, {
                    status: this.statusCode,
                    headers: this.headers,
                }));
            },
        };
        // 5. Trigger the processing manually
        try {
            // @ts-ignore - access private method
            soapServer._processRequestXml(req, res, requestBody);
        }
        catch (err) {
            console.error('SOAP processing error:', err);
            resolve(c.text('Internal Server Error', 500));
        }
    });
}));
const port = 3000;
console.log(`Server is running on port ${port}`);
// Run migrations on start (for dev/demo purposes)
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (process.env.DATABASE_URL) {
            console.log('Running migrations...');
            yield (0, migrator_1.migrate)(db_1.db, { migrationsFolder: './drizzle' });
            console.log('Migrations complete.');
        }
    }
    catch (e) {
        console.error('Migration failed:', e);
    }
    (0, node_server_1.serve)({
        fetch: app.fetch,
        port
    });
}))();
