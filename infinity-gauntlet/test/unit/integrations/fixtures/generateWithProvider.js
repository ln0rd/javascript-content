export default function generateWithProvider(
  provider,
  brand,
  document_type = 'cnpj'
) {
  const locale = 'pt-BR'
  const variables = {
    password: 'sap',
    url: 'http://localhost',
    user: 'sap',
    card_brand_codes: {
      visa: '001',
      mastercard: '002',
      elo: '003',
      diners: '004',
      hipercard: '005',
      amex: '006'
    }
  }
  const integrationCredential = {
    company_id: 'kawsejwe3823w8',
    name: 'sapleomadeiras',
    password: 'sap',
    username: 'sap',
    key: '1023'
  }
  const data = {
    document_type,
    document_number: '20059126000149',
    is_refund: false,
    transaction: {
      brand,
      created_at: '2017-06-03T11:29:06.158Z',
      id: '8',
      installments: 1,
      leo_amount: 1000,
      total_amount: 1053,
      provider,
      provider_transaction_id: 'AAABA953-9814-4044-A4C5-F178A6C20223',
      status: 'paid',
      nsu: 19292,
      firstInstallment: 3300,
      taxes: 2000,
      authorizationId: 29570494489999
    }
  }

  return { locale, variables, integrationCredential, data }
}
