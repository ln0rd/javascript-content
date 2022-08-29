export default function generateLeoResponseXML(isSuccess = true) {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <SOAP-ENV:Envelope xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
      <SOAP-ENV:Body>
        <urn:ZSPLIT_HASHLAB.Response xmlns:urn="urn:sap-com:document:sap:rfc:functions">
          <E_ERROR>${!isSuccess ? 'errow' : ''}</E_ERROR>
          <E_SUCESSO>${isSuccess ? 'success' : ''}</E_SUCESSO>
        </urn:ZSPLIT_HASHLAB.Response>
      </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>
  `
}
