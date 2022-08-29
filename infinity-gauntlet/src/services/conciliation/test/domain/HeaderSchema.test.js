const test = require('ava')
const moment = require('moment')
const sinon = require('sinon')

const HeaderSchema = require('../../domain/schema/HeaderSchema')

const companyDataToTest = {
  document_number: '14419777000999',
  name: 'João Marceneiro'
}

const fixMoment = moment('2019-08-01')

/**
 * This content is dedicate to positional file, so is matter maintain this size for content
 * @type {number}
 */
const contentSizeExpected = 108

test('Validate conciliation content size of the Header', t => {
  const headerParams = {
    id: 2,
    name: companyDataToTest.name,
    document_number: companyDataToTest.document_number,
    type: 'settlements'
  }
  const headerSchema = new HeaderSchema(headerParams)

  const contentSize = headerSchema
    .buildToPerformConciliation()
    .reduce((acc, item) => acc + item.length, 0)

  t.is(contentSize, contentSizeExpected)
})

test('Validate conciliation content of the Header', t => {
  const headerParams = {
    id: 1,
    name: companyDataToTest.name,
    document_number: companyDataToTest.document_number,
    type: 'sales'
  }
  const headerSchema = new HeaderSchema(headerParams)

  sinon.useFakeTimers(fixMoment.toDate().getTime())

  t.deepEqual(headerSchema.buildToPerformConciliation(), [
    'HD',
    fixMoment.format('YYYYMMDD'),
    'HASHLAB             ',
    'MOVIMENTO VENDAS    ',
    '14419777000999 ',
    'João Marceneiro          ',
    '001',
    '00',
    'BRL',
    '0000000001'
  ])
})

test('Validate settlements conciliation params', t => {
  const headerParams = {
    id: 3,
    name: companyDataToTest.name,
    document_number: companyDataToTest.document_number,
    type: 'settlements'
  }
  const headerSchema = new HeaderSchema(headerParams)

  sinon.useFakeTimers(fixMoment.toDate().getTime())

  t.deepEqual(headerSchema.buildToPerformConciliation(), [
    'HD',
    fixMoment.format('YYYYMMDD'),
    'HASHLAB             ',
    'MOVIMENTO REPASSE   ',
    '14419777000999 ',
    'João Marceneiro          ',
    '001',
    '01',
    'BRL',
    '0000000003'
  ])
})
