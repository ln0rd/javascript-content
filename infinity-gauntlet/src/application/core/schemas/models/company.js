import { BANK_ACCOUNT_TYPE } from 'application/core/models/company'
import { companyStatusEnum } from 'application/core/domain/company-status'

export default {
  name: 'company',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1
      },
      document_number: {
        type: 'string',
        format: 'document_number'
      },
      full_name: {
        type: 'string'
      },
      mcc: {
        type: 'string'
      },
      statusV2: {
        type: 'string',
        enum: companyStatusEnum
      },
      site_url: {
        type: 'string'
      },
      estimated_monthly_tpv: {
        type: 'number'
      },
      settlement_type: {
        type: 'string',
        enum: ['prepaid_card', 'bank_account']
      },
      default_split_rules: {
        type: 'array'
      },
      costs: {
        type: 'object'
      },
      transfer_configurations: {
        type: 'object',
        properties: {
          automatic_transfer_enabled: {
            type: 'boolean'
          },
          transfer_frequency: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly']
          },
          transfer_date: {
            type: 'number',
            minimum: 1,
            maximum: 30
          },
          rail: {
            type: 'string',
            enum: ['ted', 'pix', 'hash', 'external']
          }
        }
      },
      contact: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          phone: {
            type: 'string'
          },
          email: {
            type: 'string'
          }
        },
        required: ['name', 'phone', 'email']
      },
      address: {
        type: 'object',
        properties: {
          street: {
            type: 'string'
          },
          street_number: {
            type: 'string'
          },
          complement: {
            type: 'string'
          },
          neighborhood: {
            type: 'string'
          },
          zipcode: {
            type: 'string'
          },
          country: {
            type: 'string'
          },
          state: {
            type: 'string'
          },
          city: {
            type: 'string'
          }
        },
        required: [
          'street',
          'neighborhood',
          'zipcode',
          'street_number',
          'city',
          'state'
        ]
      },
      shipping_address: {
        type: 'object',
        properties: {
          street: {
            type: 'string'
          },
          street_number: {
            type: 'string'
          },
          complement: {
            type: 'string'
          },
          neighborhood: {
            type: 'string'
          },
          zipcode: {
            type: 'string'
          },
          country: {
            type: 'string'
          },
          state: {
            type: 'string'
          },
          city: {
            type: 'string'
          }
        },
        required: [
          'street',
          'neighborhood',
          'zipcode',
          'street_number',
          'city',
          'state'
        ]
      },
      bank_account: {
        type: 'object',
        properties: {
          bank_code: {
            type: 'string',
            pattern: '(^[0-9]{3}$)',
            minLength: 3,
            maxLength: 3
          },
          agencia: {
            type: 'string',
            pattern: '(^[0-9]{4}$)',
            minLength: 4,
            maxLength: 4
          },
          agencia_dv: {
            type: 'string'
          },
          conta: {
            type: 'string',
            minLength: 1,
            maxLength: 19,
            pattern: '(^[0-9]{1,19}$)'
          },
          conta_dv: {
            type: 'string',
            pattern: '(^[0-9]{0,1}$)',
            maxLength: 1
          },
          document_number: {
            type: 'string',
            minLength: 11,
            maxLength: 14
          },
          document_type: {
            type: 'string',
            enum: ['cpf', 'cnpj']
          },
          type: {
            type: 'string',
            enum: BANK_ACCOUNT_TYPE
          }
        },
        anyOf: [
          {
            properties: {
              document_type: { const: 'cpf' },
              document_number: {
                pattern: '(^[0-9]{11}$)',
                minLength: 11,
                maxLength: 11
              }
            }
          },
          {
            properties: {
              document_type: { const: 'cnpj' },
              document_number: {
                pattern: '(^[0-9]{14}$)',
                minLength: 14,
                maxLength: 14
              }
            }
          }
        ],
        required: ['bank_code', 'agencia', 'conta']
      }
    },
    required: ['name', 'document_number', 'contact', 'address', 'full_name']
  }
}
