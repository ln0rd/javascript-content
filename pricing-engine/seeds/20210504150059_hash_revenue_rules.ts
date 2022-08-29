import { Knex } from 'knex'

export const seed = async (knex: Knex) => {
  return knex('hash_revenue_rules')
    .del()
    .then(() =>
      knex('hash_revenue_rules').insert([
        // MERCHANT A
        {
          merchant_id: 'merchant_a',
          percentage: 125000,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'installmentTransactionData.installmentCount': { $eq: 1 },
            'paymentNetworkData.name': { $eq: 'Visa' },
          },
        },
        {
          merchant_id: 'merchant_a',
          percentage: 150000,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'installmentTransactionData.installmentCount': { $gte: 2, $lte: 6 },
            'paymentNetworkData.name': { $eq: 'Visa' },
          },
        },
        {
          merchant_id: 'merchant_a',
          percentage: 165000,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'installmentTransactionData.installmentCount': { $gte: 7 },
            'paymentNetworkData.name': { $eq: 'Visa' },
          },
        },
        // MERCHANT B
        {
          merchant_id: 'merchant_b',
          percentage: 125000,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'installmentTransactionData.installmentCount': { $eq: 1 },
            'paymentNetworkData.name': { $eq: 'Visa' },
          },
        },
        {
          merchant_id: 'merchant_b',
          percentage: 150000,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'installmentTransactionData.installmentCount': { $gte: 2, $lte: 6 },
            'paymentNetworkData.name': { $eq: 'Visa' },
          },
        },
        {
          merchant_id: 'merchant_b',
          percentage: 165000,
          matching_rule: {
            accountType: { $eq: 'credit' },
            transactionType: { $eq: 'purchase' },
            'installmentTransactionData.installmentCount': { $gte: 7 },
            'paymentNetworkData.name': { $eq: 'Visa' },
          },
        },
      ])
    )
}
