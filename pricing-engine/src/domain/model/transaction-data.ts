// TODO move to external library?
// TODO add other properties

interface AntifraudData {
  name?: string
  requestID?: string
  flaggedAsSuspicious?: boolean
}

interface PaymentLinkData {
  creationTimestamp?: string
}

interface CardholderData {
  panFirstDigits: string
  panLastDigits: string
  panSequenceNumber?: string
  cardExpirationDate?: string
  cardholderName?: string
  verificationMethod?: string
  issuerCountryCode?: string
}

interface InstallmentTransactionData {
  installmentCount: number
  installmentQualifier?: string
}

interface SpecificData {
  affiliationID?: string
}

interface CaptureChannelData {
  name: string
  paymentLinkData?: PaymentLinkData
}

interface PaymentNetworkData {
  name: string
  numericCode: string
  alphaCode: string
}

interface AuthorizerData {
  name: string
  uniqueID?: string
  dateTime?: string
  responseCode: string
  authorizationCode: string
  specificData?: SpecificData
}

export interface TransactionData {
  id: string
  hashCorrelationKey: string
  isoID: string
  merchantID: string
  amount: number
  merchantCategoryCode: string
  terminalID?: string
  authorizerData: AuthorizerData
  captureChannelData?: CaptureChannelData
  paymentNetworkData: PaymentNetworkData
  dateTime: string
  transactionType: string
  accountType: string
  approved: boolean
  crossBorder: boolean
  entryMode: string
  currencyCode: string
  installmentTransactionData?: InstallmentTransactionData
  cardholderData: CardholderData
  referenceTransactionId?: string
  antifraudData?: AntifraudData
}
