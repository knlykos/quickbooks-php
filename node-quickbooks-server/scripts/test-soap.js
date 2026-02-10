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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const xml2js = __importStar(require("xml2js"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = 'http://localhost:3000/soap';
        const username = 'testuser';
        const password = 'password123';
        console.log(`Testing SOAP Endpoint at ${url}`);
        // 1. Authenticate
        const authXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <authenticate xmlns="http://developer.intuit.com/">
      <strUserName>${username}</strUserName>
      <strPassword>${password}</strPassword>
    </authenticate>
  </soap:Body>
</soap:Envelope>`;
        console.log('Sending authenticate request...');
        try {
            const res = yield axios_1.default.post(url, authXml, {
                headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'http://developer.intuit.com/authenticate' }
            });
            console.log('Response Status:', res.status);
            console.log('Response Body:', res.data);
            // Parse response
            const parser = new xml2js.Parser();
            const result = yield parser.parseStringPromise(res.data);
            // Extract Ticket
            const authResult = result['soap:Envelope']['soap:Body'][0]['authenticateResponse'][0]['authenticateResult'][0]['string'];
            const ticket = authResult[0];
            const status = authResult[1];
            console.log(`Ticket: ${ticket}, Status: ${status}`);
            if (ticket && status !== 'nvu') {
                // 2. Send Request XML (if authorized)
                console.log('Sending sendRequestXML request...');
                const reqXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <sendRequestXML xmlns="http://developer.intuit.com/">
      <ticket>${ticket}</ticket>
      <strHCPResponse></strHCPResponse>
      <strCompanyFileName></strCompanyFileName>
      <qbXMLCountry>US</qbXMLCountry>
      <qbXMLMajorVers>13</qbXMLMajorVers>
      <qbXMLMinorVers>0</qbXMLMinorVers>
    </sendRequestXML>
  </soap:Body>
</soap:Envelope>`;
                const reqRes = yield axios_1.default.post(url, reqXml, {
                    headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'http://developer.intuit.com/sendRequestXML' }
                });
                console.log('Response Status:', reqRes.status);
                console.log('Response Body:', reqRes.data);
            }
            else {
                console.log('Authentication failed or invalid status.');
            }
        }
        catch (err) {
            console.error('Error:', err.message);
            if (err.response) {
                console.error('Response Data:', err.response.data);
            }
        }
    });
}
main();
