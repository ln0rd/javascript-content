import { CompanyFactory, UserFactory } from 'test/factories'
import chai from 'chai'

const { expect } = chai

describe('Integration => Models: User', () => {
  describe('#save', () => {
    it('clean extra characters from document number when document exists', async () => {
      const documentWithMask = '290.278.090-70'
      const expectedDocumentNumber = '29027809070'
      const company = await CompanyFactory()
      const userWithDocument = await UserFactory(company)
      userWithDocument.document_number = documentWithMask

      await userWithDocument.save()

      expect(userWithDocument.document_number).to.be.equal(
        expectedDocumentNumber
      )
    })

    it('clean extra characters from document number when document does not exists', async () => {
      const company = await CompanyFactory()
      const userWithDocument = await UserFactory(company)
      userWithDocument.document_number = null

      await userWithDocument.save()

      expect(userWithDocument.document_number).to.be.equal(null)
    })
  })
})
