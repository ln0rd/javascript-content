const R = require('ramda')

const {
  APPLICATION_TIMEZONE,
  API_URL,
  PAGINATION_MAX_LIMIT,
  PROVIDER_STONE_ONLINE_API_URL,
  PROVIDER_STONE_CONCILIATION_API_URL,
  PROVIDER_STONE_INTERNAL_TRANSFER_API_URL,
  PROVIDER_STONE_AFFILIATION_API_URL,
  PROVIDER_STONE_AFFILIATION_CREDENTIALS_USER_ID,
  PROVIDER_STONE_AFFILIATION_CREDENTIALS_SECRET_KEY,
  PROVIDER_STONE_PORTAL_API_URL,
  PROVIDER_STONE_PORTAL_API_EMAIL,
  PROVIDER_STONE_PORTAL_API_PASSWORD,
  PROVIDER_STONE_TMS_API_URL,
  PROVIDER_STONE_TMS_API_PUBLIC_KEY,
  PROVIDER_STONE_TMS_API_PRIVATE_KEY,
  PROVIDER_STONE_PARTNER_KEY,
  PROVIDER_STONE_CONTACT_EMAIL,
  PROVIDER_STONE_CONTACT_EMAIL_CC,
  PROVIDER_PAGS_API_URL,
  PROVIDER_PAGS_API_EMAIL,
  PROVIDER_PAGS_API_TOKEN,
  PROVIDER_HASH_STONE_AFFILIATION_API_URL,
  PROVIDER_HASH_STONE_AFFILIATION_API_CREDENTIALS_USER_ID,
  PROVIDER_HASH_STONE_AFFILIATION_API_CREDENTIALS_SECRET_KEY,
  PROVIDER_CELER_API_URL,
  PROVIDER_CELER_USERNAME,
  PROVIDER_CELER_PASSWORD,
  PROVIDER_CELER_CLIENT_ID,
  PROVIDER_CELER_ACCESS_KEY,
  SOFTWARE_PROVIDER_HASH_GRPC_URL,
  PROVIDER_PAGS_ACQUISITION_API_URL,
  PROVIDER_PAGS_ACQUISITION_API_EMAIL,
  PROVIDER_PAGS_ACQUISITION_API_TOKEN,
  WALLET_SERVICE_ENDPOINT,
  ACCOUNTS_SERVICE_ENDPOINT,
  PIX_MERCHANT_SERVICE_ENDPOINT,
  PAYOUT_SERVICE_ENDPOINT,
  BANKS_SERVICE_ENDPOINT,
  SMS_SERVICE_ENDPOINT,
  CHECKOUT_SERVICE_ENDPOINT,
  AGREEMENT_SERVICE_ENDPOINT,
  REVERT_TRANSFER_TIMEOUT_BASE_MILLISECONDS,
  REVERT_TRANSFER_ATTEMPTS,
  MAX_RETRY_TRIGGER_EVENT_ATTEMPTS,
  RETRY_EVENT_TIMEOUT_BASE_MILLISECONDS,
  SYSTEM_PAYOUT_FAILED_NOTIFICATION_EMAIL_CC,
  HASH_COMPANY_ID,
  GLADOS_COMPANY_ID,
  LEO_OLD_COMPANY_ID,
  LEO_NEW_COMPANY_ID,
  ANTICIPATION_AMOUNT_THRESHOLD,
  ANTICIPATION_MIN_PAYABLE_NET_AMOUNT,
  JWT_SECRET_KEY,
  JWT_EXPIRES_IN,
  CARD_PROCESSOR_TOKEN,
  TRANSACTION_EVENT_SUBSCRIPTION_ID,
  TRANSACTION_EVENT_AUDIENCE,
  TRANSACTION_SERVICE_URL,
  TRANSACTION_SERVICE_AUTH_USER,
  TRANSACTION_SERVICE_AUTH_PASSWORD,
  AUTHENTICATION_RETRY_LIMIT,
  AUTHENTICATION_RETRY_TIMEOUT_SECONDS,
  AUTHENTICATION_BLOCK_USER_MULTIPLIER,
  AUTHENTICATION_BLOCK_USER_BASE,
  AUTHENTICATION_BLOCK_USER_MAX_EXPONENT,
  PASSWORD_MIN_LENGTH,
  PASSWORD_INCLUDE_NUMBERS,
  PASSWORD_INCLUDE_LOWER_CASE,
  PASSWORD_INCLUDE_UPPER_CASE,
  PASSWORD_INCLUDE_SYMBOLS,
  PASSWORD_EXCLUDE_SIMILAR,
  PASSWORD_STRICT,
  USER_UPDATE_DATA_REQUEST_DAYS,
  RL_RESET_PASSWORD_ENABLED,
  RL_RESET_PASSWORD_KEY_PREFIX,
  RL_RESET_PASSWORD_MAX_REQUESTS,
  RL_RESET_PASSWORD_DURATION_WINDOW_SECONDS,
  RL_RESET_PASSWORD_BLOCK_DURATION,
  HASHBOARD_CACHE_CONFIG_EXPIRES_IN,
  CIP_INTEGRATION_TIMEOUT,
  CIP_INTEGRATION_URL,
  AFFILIATION_CREATED_SOURCE_EMAIL
} = process.env

const Configs = {
  company_name: 'Hash Payment Solutions Holding, LLC',
  timezone: APPLICATION_TIMEZONE || 'America/Sao_Paulo',
  api_url: API_URL,

  password: {
    min_length: PASSWORD_MIN_LENGTH || 8,
    include_symbols: PASSWORD_INCLUDE_SYMBOLS || false,
    include_numbers: PASSWORD_INCLUDE_NUMBERS === false ? false : true,
    include_lower_case: PASSWORD_INCLUDE_LOWER_CASE === false ? false : true,
    include_upper_case: PASSWORD_INCLUDE_UPPER_CASE === false ? false : true,
    exclude_similar: PASSWORD_EXCLUDE_SIMILAR === false ? false : true,
    // strict indicates if password must include at least one character from each pool.
    strict: PASSWORD_STRICT === false ? false : true
  },

  affiliation: {
    affiliation_created_source_email:
      AFFILIATION_CREATED_SOURCE_EMAIL || 'no-reply@hash.com.br'
  },

  middlewares: {
    jwt: {
      secret_key: JWT_SECRET_KEY,
      expires_in: JWT_EXPIRES_IN || '7d'
    },
    auth: {
      retry_limit: AUTHENTICATION_RETRY_LIMIT || 3,
      retry_timeout: AUTHENTICATION_RETRY_TIMEOUT_SECONDS || 60,
      ban_multiplier: AUTHENTICATION_BLOCK_USER_MULTIPLIER || 90,
      ban_base: AUTHENTICATION_BLOCK_USER_BASE || 2,
      ban_max_exp: AUTHENTICATION_BLOCK_USER_MAX_EXPONENT || 10
    },
    rate_limiter: {
      reset_password: {
        enabled: RL_RESET_PASSWORD_ENABLED || true,
        key_prefix: RL_RESET_PASSWORD_KEY_PREFIX || 'rlIGResetPassword',
        max_requests: RL_RESET_PASSWORD_MAX_REQUESTS || 10,
        duration_window_seconds:
          RL_RESET_PASSWORD_DURATION_WINDOW_SECONDS || 30,
        block_duration: RL_RESET_PASSWORD_BLOCK_DURATION || 60
      }
    }
  },

  pagination: {
    max_limit: Number(PAGINATION_MAX_LIMIT) || 100,
    default_page: 1,
    default_per_page: 10
  },

  services: {
    wallet_endpoint: WALLET_SERVICE_ENDPOINT,
    accounts_endpoint: ACCOUNTS_SERVICE_ENDPOINT,
    pix_merchant_endpoint: PIX_MERCHANT_SERVICE_ENDPOINT,
    payout_endpoint: PAYOUT_SERVICE_ENDPOINT,
    banks_endpoint: BANKS_SERVICE_ENDPOINT,
    sms_endpoint: SMS_SERVICE_ENDPOINT,
    checkout_endpoint: CHECKOUT_SERVICE_ENDPOINT,
    agreement_endpoint: AGREEMENT_SERVICE_ENDPOINT
  },

  wallet: {
    revert: {
      timeout_base: REVERT_TRANSFER_TIMEOUT_BASE_MILLISECONDS || 25,
      attempts: REVERT_TRANSFER_ATTEMPTS || 3
    }
  },

  anticipation: {
    spot: {
      amountThreshold: ANTICIPATION_AMOUNT_THRESHOLD || 200000000,
      minPayableNetAmount: ANTICIPATION_MIN_PAYABLE_NET_AMOUNT || 1,
      revert: {
        timeout_base: REVERT_TRANSFER_TIMEOUT_BASE_MILLISECONDS || 25,
        attempts: REVERT_TRANSFER_ATTEMPTS || 3
      },
      cipIntegration: {
        url: CIP_INTEGRATION_URL,
        timeout: CIP_INTEGRATION_TIMEOUT || 1000
      }
    }
  },

  permissions: {
    hash_id: HASH_COMPANY_ID || '5ba0433ffdf09c0008870ee7',
    glados_id: GLADOS_COMPANY_ID || '60f85a3a2bc99900077f9354'
  },

  events: {
    max_trigger_retries: MAX_RETRY_TRIGGER_EVENT_ATTEMPTS || 3,
    revert_timeout_base: RETRY_EVENT_TIMEOUT_BASE_MILLISECONDS || 15
  },

  providers: {
    acquirers: {
      stone: {
        online_api_url: PROVIDER_STONE_ONLINE_API_URL,
        conciliation_api_url: PROVIDER_STONE_CONCILIATION_API_URL,
        internal_transfer_api_url: PROVIDER_STONE_INTERNAL_TRANSFER_API_URL,
        affiliation_api_url: PROVIDER_STONE_AFFILIATION_API_URL,
        affiliation_credentials: {
          user_id: PROVIDER_STONE_AFFILIATION_CREDENTIALS_USER_ID,
          secret_key: PROVIDER_STONE_AFFILIATION_CREDENTIALS_SECRET_KEY
        },
        portal_api_url: PROVIDER_STONE_PORTAL_API_URL,
        portal_api_credentials: {
          email: PROVIDER_STONE_PORTAL_API_EMAIL,
          password: PROVIDER_STONE_PORTAL_API_PASSWORD
        },
        partner_key: PROVIDER_STONE_PARTNER_KEY,
        contact_email: PROVIDER_STONE_CONTACT_EMAIL,
        contact_email_cc: PROVIDER_STONE_CONTACT_EMAIL_CC,
        tms_api: {
          url: PROVIDER_STONE_TMS_API_URL,
          public_key: PROVIDER_STONE_TMS_API_PUBLIC_KEY,
          private_key: PROVIDER_STONE_TMS_API_PRIVATE_KEY
        }
      },
      pags: {
        api_url: PROVIDER_PAGS_API_URL,
        api_email: PROVIDER_PAGS_API_EMAIL,
        api_token: PROVIDER_PAGS_API_TOKEN
      },
      hash: {
        transaction_service_url: TRANSACTION_SERVICE_URL,
        transaction_service_auth_user: TRANSACTION_SERVICE_AUTH_USER,
        transaction_service_auth_password: TRANSACTION_SERVICE_AUTH_PASSWORD
      }
    },
    subacquirers: {
      hash: {
        stone: {
          affiliation_api_url: PROVIDER_HASH_STONE_AFFILIATION_API_URL,
          affiliation_api_credentials: {
            user_id: PROVIDER_HASH_STONE_AFFILIATION_API_CREDENTIALS_USER_ID,
            secret_key: PROVIDER_HASH_STONE_AFFILIATION_API_CREDENTIALS_SECRET_KEY
          }
        }
      }
    },
    capture_softwares: {
      celer: {
        api_url: PROVIDER_CELER_API_URL,
        username: PROVIDER_CELER_USERNAME,
        password: PROVIDER_CELER_PASSWORD,
        client_id: PROVIDER_CELER_CLIENT_ID,
        access_key: PROVIDER_CELER_ACCESS_KEY
      },
      card_processor: {
        token: CARD_PROCESSOR_TOKEN || 'secret-token'
      },
      hash: {
        grpc_url: SOFTWARE_PROVIDER_HASH_GRPC_URL,
        transaction_event_subscription_id:
          TRANSACTION_EVENT_SUBSCRIPTION_ID || 'subscription-id',
        transaction_event_audience:
          TRANSACTION_EVENT_AUDIENCE ||
          'https://api.hash.com.br/external_webhook'
      }
    },
    acquisition: {
      pags: {
        api_url: PROVIDER_PAGS_ACQUISITION_API_URL,
        api_email: PROVIDER_PAGS_ACQUISITION_API_EMAIL,
        api_token: PROVIDER_PAGS_ACQUISITION_API_TOKEN
      }
    }
  },

  users: {
    update_data_timeout: USER_UPDATE_DATA_REQUEST_DAYS || 180
  },

  system: {
    payout: {
      /**
       * Must be a string that is a list of emails separated by commas.
       * Example: john.doe@hash.com.br,ana.doe@hash.com.br
       */
      failed_notification_email_cc: SYSTEM_PAYOUT_FAILED_NOTIFICATION_EMAIL_CC
    }
  },

  main_banks: ['341', '033', '237', '104', '001'],
  migrate_client: {
    leo: {
      oldCompanyId: LEO_OLD_COMPANY_ID,
      newCompanyId: LEO_NEW_COMPANY_ID
    }
  },

  hashboard: {
    config: {
      cache_expires_in: HASHBOARD_CACHE_CONFIG_EXPIRES_IN || 300
    }
  }
}

function configError(msg) {
  let err = new Error(msg)
  err.name = 'ApplicationConfigError'
  return err
}

Configs.getTruthyOrThrow = function getOrThrow(path) {
  const v = R.pathOr('@@NOT_FOUND@@', path.split('.'), Configs)
  if (v === '@@NOT_FOUND@@') {
    throw configError(`Missing required config value for path=${path}`)
  }
  if (!v) {
    throw configError(`Config value for path=${path} is falsy`)
  }
  return v
}

/**
 *
 * Reads config variable specified by path expecting an string
 * which is split by comma and returned as an Array
 *
 * If the config specified by path DOES NOT EXISTS this
 * function returns an empty list
 *
 * @param {String} path
 *
 * @returns Array[String]
 */
Configs.getList = function getList(path) {
  const v = R.pathOr('', path.split('.'), Configs)

  if (typeof v === 'string') {
    if (v.length === 0) {
      return v.split(',')
    } else {
      return []
    }
  } else {
    throw configError(
      `Config value for path=[${path}] is not a list of string separated by commas. Value is [${v}]`
    )
  }
}

export default Configs
