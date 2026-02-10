
import * as soap from 'soap';

const WSDL = `<?xml version="1.0"?>
<definitions name="StockQuote" targetNamespace="http://example.com/stockquote.wsdl"
  xmlns:tns="http://example.com/stockquote.wsdl"
  xmlns:xsd1="http://example.com/stockquote.xsd"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns="http://schemas.xmlsoap.org/wsdl/">
</definitions>`;

async function main() {
    console.log('Attempting to instantiate soap.Server with string WSDL...');
    try {
        const server = new soap.Server({} as any, '/soap', {}, WSDL as any);
        console.log('Success with string!');
    } catch (e) {
        console.error('Failed with string:', e);
    }

    console.log('Attempting to instantiate WSDL class directly...');
    try {
        // @ts-ignore
        const WSDLClass = soap.WSDL;
        if (!WSDLClass) {
            console.log('soap.WSDL is undefined');
            return;
        }

        const wsdlObj = new WSDLClass(WSDL, undefined, {});
        await new Promise((resolve, reject) => {
            wsdlObj.onReady((err: any) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
        console.log('WSDL object ready');

        const server2 = new soap.Server({} as any, '/soap', {}, wsdlObj);
        console.log('Success with WSDL object!');

    } catch (e) {
        console.error('Failed with WSDL object:', e);
    }
}

main();
