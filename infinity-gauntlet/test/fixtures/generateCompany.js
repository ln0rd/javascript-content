import faker from 'faker'

export default function generateCompany(
  id = faker.random.alphaNumeric(24),
  users = [],
  isISO = false
) {
  const company = {
    _id: id,
    anticipation_days_interval: 1,
    shipping_address: {
      street_number: '394',
      zipcode: `${faker.finance.account(8)}`,
      neighborhood: 'Casa Branca',
      state: 'SP',
      city: 'Santo Andre',
      _id: faker.random.alphaNumeric(24),
      country: `${faker.finance.account(3)}`,
      street: 'Av. Artur de Queiros'
    },
    costs: {
      mdrs: [
        {
          installments: [
            {
              installment: 1,
              fee: 2,
              _id: faker.random.alphaNumeric(24),
              type: 'percentage'
            }
          ],
          capture_method: 'default',
          payment_method: 'debit_card',
          card_brand: 'mastercard',
          _id: faker.random.alphaNumeric(24)
        },
        {
          payment_method: 'debit_card',
          card_brand: 'visa',
          _id: faker.random.alphaNumeric(24),
          installments: [
            {
              installment: 1,
              fee: 2,
              _id: faker.random.alphaNumeric(24),
              type: 'percentage'
            }
          ],
          capture_method: 'default'
        },
        {
          capture_method: 'default',
          payment_method: 'default',
          card_brand: 'mastercard',
          _id: faker.random.alphaNumeric(24),
          installments: [
            {
              _id: faker.random.alphaNumeric(24),
              type: 'percentage',
              installment: 1,
              fee: 2.76
            },
            {
              installment: 2,
              fee: 3.07,
              _id: faker.random.alphaNumeric(24),
              type: 'percentage'
            },
            {
              installment: 7,
              fee: 3.35,
              _id: faker.random.alphaNumeric(24),
              type: 'percentage'
            }
          ]
        },
        {
          capture_method: 'default',
          payment_method: 'default',
          card_brand: 'visa',
          _id: faker.random.alphaNumeric(24),
          installments: [
            {
              installment: 1,
              fee: 2.76,
              _id: faker.random.alphaNumeric(24),
              type: 'percentage'
            },
            {
              installment: 2,
              fee: 3.07,
              _id: faker.random.alphaNumeric(24),
              type: 'percentage'
            },
            {
              type: 'percentage',
              installment: 7,
              fee: 3.35,
              _id: faker.random.alphaNumeric(24)
            }
          ]
        }
      ],
      anticipation_fee: 2.51,
      _id: faker.random.alphaNumeric(24)
    },
    primary: false,
    hash_key: `hash_${faker.random.alphaNumeric(30)}`,
    status: 'pending_confirmation',
    statusV2: 'pending_approval',
    document_type: 'cnpj',
    name: faker.name.findName(),
    estimated_monthly_tpv: 30000,
    parent_id: !isISO ? faker.random.alphaNumeric(24) : null,
    contact: {
      name: faker.name.firstName(),
      phone: faker.phone.phoneNumberFormat(),
      email: faker.internet.email(),
      _id: faker.random.alphaNumeric(24)
    },
    metadata: '{"sap_parent_code":"1023","minimum_leo_percentage":30}',
    settlement_type: 'bank_account',
    address: {
      zipcode: `${faker.finance.account(8)}`,
      complement: 'Bloco 33 ap 34',
      street: 'Rua dos dominicanos',
      neighborhood: 'Jardim Santo André',
      state: 'SP',
      city: 'Santo André',
      _id: faker.random.alphaNumeric(24),
      country: '076',
      street_number: 'sem n'
    },
    updated_at: '2018-08-28T20:31:31.029Z',
    created_at: '2017-06-01T21:18:58.118Z',
    document_number: '14714840000120',
    mcc: `${faker.finance.account(4)}`,
    full_name: faker.name.findName(),
    anticipation_type: 'automatic',
    bank_account: {
      _id: faker.random.alphaNumeric(24),
      type: 'conta_corrente',
      bank_code: `${faker.finance.account(3)}`,
      agencia: `${faker.finance.account(4)}`,
      conta: `${faker.finance.account(5)}`,
      conta_dv: '1',
      legal_name: faker.name.findName(),
      document_number: `${faker.finance.account(14)}`
    },
    providers: [],
    default_split_rules: [
      {
        _id: faker.random.alphaNumeric(24),
        company_id: faker.random.alphaNumeric(24),
        percentage: 70,
        charge_processing_cost: false
      }
    ],
    __v: 2,
    capture_method_hardware_owner: 'company',
    main_capture_method: 'pos',
    app_keys: [],
    company_metadata: {},
    id_str: `${faker.finance.account(24)}`,
    users: users,
    save: () => company
  }

  return company
}
