
import axios from 'axios';
import * as soap from 'soap';
import * as xml2js from 'xml2js';

async function main() {
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
    const res = await axios.post(url, authXml, {
      headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'http://developer.intuit.com/authenticate' }
    });

    console.log('Response Status:', res.status);
    console.log('Response Body:', res.data);

    // Parse response
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(res.data);

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

        const reqRes = await axios.post(url, reqXml, {
          headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'http://developer.intuit.com/sendRequestXML' }
        });

        console.log('Response Status:', reqRes.status);
        console.log('Response Body:', reqRes.data);
    } else {
        console.log('Authentication failed or invalid status.');
    }

  } catch (err: any) {
    console.error('Error:', err.message);
    if (err.response) {
        console.error('Response Data:', err.response.data);
    }
  }
}

main();
