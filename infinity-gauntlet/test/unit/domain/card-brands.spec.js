import { expect } from 'chai'
import {
  needsPayables,
  list,
  names
} from '../../../src/application/core/domain/card-brands'

describe('Unit => Domain: Card Brands', () => {
  context('list', () => {
    it('should have all the card brands', () => {
      expect(list().length).to.equal(15)
    })
  })
  context('names', () => {
    it('should have all the known card brand names', () => {
      expect(names().length).to.equal(15)
    })
  })
  context('needsPayables', () => {
    it('should need payables when the card is visa', () => {
      expect(needsPayables('visa')).to.equal(true)
    })

    it('should need payables when the card is sorocred', () => {
      expect(needsPayables('sorocred')).to.equal(true)
    })

    it('should need payables when the card is alelo', () => {
      expect(needsPayables('alelo')).to.equal(false)
    })

    it('should not need payables when the card is vr', () => {
      expect(needsPayables('vr')).to.equal(false)
    })
  })
})
