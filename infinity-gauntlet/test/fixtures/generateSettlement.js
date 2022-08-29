import moment from 'moment'
import faker from 'faker'
import mongoose from 'mongoose'

const { Types } = mongoose
const { ObjectId } = Types

export function generateSettlementBrands(brands) {
  return [
    'visa',
    'mastercard',
    'hiper',
    'diners',
    'discover',
    'aura',
    'elo'
  ].reduce((newBrands, brand) => {
    if (!brands || !brands[brand.toString()]) {
      return newBrands
    }

    const newBrand = {
      brand,
      _id: ObjectId(),
      debit: brands[brand.toString()].debit || 0,
      credit: brands[brand.toString()].credit || 0,
      installment_credit: brands[brand.toString()].installment_credit || 0,
      anticipated_credit: brands[brand.toString()].anticipated_credit || 0
    }
    return newBrands.concat(newBrand)
  }, [])
}

export default function generateSettlement({
  _id,
  amount,
  settled_amount,
  brands,
  company_id,
  date,
  charges,
  received_charges
}) {
  const fakeObjectId = () => `${faker.random.alphaNumeric(40)}`
  const randomAmount = () => Number(faker.finance.amount(100, 1000, 0))
  const fakeAmount = amount || randomAmount()
  const settleAmount = Number.isInteger(settled_amount)
    ? settled_amount
    : fakeAmount
  // Between 1 and 5
  const numberOfCharges = () => Math.floor(Math.random() * 6)
  const randomSizedArray = () => [...Array(numberOfCharges())]

  const outgoingCharges =
    charges ||
    randomSizedArray().map((_, index) => ({
      id: index + 1,
      description: `Test Outgoing Charge #${index}`,
      amount: randomAmount(),
      destination_company_id: fakeObjectId(),
      partial_charge: false
    }))

  const receivedCharges =
    received_charges ||
    randomSizedArray().map((_, index) => ({
      id: index + 1,
      description: `Test Received Charge #${index}`,
      amount: randomAmount(),
      origin_company_id: fakeObjectId(),
      partial_charge: false
    }))

  return {
    _id: _id || fakeObjectId(),
    boleto: {
      payables: [],
      amount: 0
    },
    affiliations: [fakeObjectId()],
    settlement_type: 'wallet',
    last_negative_amount: 0,
    cip_escrowed_amount: 0,
    provider: 'hash',
    status: 'settled',
    date: date || moment(faker.date.past()).format('YYYY-MM-DD'),
    amount: fakeAmount,
    settled_amount: settleAmount,
    company_id: company_id || fakeObjectId(),
    brands: generateSettlementBrands(
      brands || {
        mastercard: {
          debit: fakeAmount
        }
      }
    ),
    charges: outgoingCharges,
    received_charges: receivedCharges,
    created_at: faker.date.past(),
    updated_at: faker.date.past(),
    wallet_id: fakeObjectId(),
    __v: 1
  }
}
