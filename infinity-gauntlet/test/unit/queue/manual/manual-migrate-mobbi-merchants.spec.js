import Affiliation from 'application/core/models/affiliation'
import Company from 'application/core/models/company'
import Hardware from 'application/core/models/capture-hardware'
import HardwareService from 'application/core/services/hardware'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import mongoose from 'mongoose'
import nock from 'nock'
import sinon from 'sinon'
import 'sinon-mongoose'
import {
  getCSV,
  migrateMerchant
} from 'application/queue/tasks/manual/manual-migrate-mobbi-merchants'

const expect = chai.expect
chai.use(chaiAsPromised)

describe('Unit => Queue => Triggered Task: Manual Migrate Mobbi Merchants', () => {
  context('getCSV', () => {
    afterEach(() => {
      nock.cleanAll()
    })

    it('when the url does not exist', async () => {
      nock('http://example.com')
        .get('/my.csv')
        .reply(404, 'Not Found')

      await expect(getCSV('http://example.com/my.csv')).to.be.rejectedWith(
        'Request failed with status code 404'
      )
    })

    it('when have a empty csv file', async () => {
      nock('http://example.com')
        .get('/my.csv')
        .reply(200, '')

      await expect(getCSV('http://example.com/my.csv')).to.become([])
    })

    it('when have a invalid csv file', async () => {
      const invalidCsv = `
      companyId
      5e2b34d592acff0006f0186d
      `
      nock('http://example.com')
        .get('/my.csv')
        .reply(200, invalidCsv)

      await expect(getCSV('http://example.com/my.csv')).to.rejectedWith(
        'Malformed input CSV. It must have "companyID,serialNumber" fields.'
      )
    })
  })

  context('migrateMerchant', () => {
    const mobbiMerchantId = '59dcd1f57033b90004b32339'
    const companyId = '5f0d9aea5cc37900062b6fcb'
    const company = {
      _id: mongoose.Types.ObjectId(companyId),
      parent_id: mobbiMerchantId
    }
    const companyMock = sinon.mock(new Company(company))
    const affiliationMock = sinon.mock(
      new Affiliation({
        _id: mongoose.Types.ObjectId('5f0d9b719c86860006c49bb9'),
        provider: 'hash',
        internal_merchant_id: '120829421',
        internal_provider: 'stone'
      })
    )
    const hardwares = [
      { _id: mongoose.Types.ObjectId('5f0d9b719c86860006c49bb8') }
    ]

    afterEach(() => sinon.restore())

    it('when the company does not exist', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(null)

      await expect(migrateMerchant(companyId)).to.be.rejectedWith(
        'Cadastro não existe.'
      )
    })

    it('when has error on company update', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(companyMock.object)
      companyMock
        .expects('save')
        .throws(new mongoose.Error('company-save-error'))

      await expect(migrateMerchant(companyId)).to.be.rejectedWith(
        'company-save-error'
      )
    })

    it('when the affiliation does not exist', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(companyMock.object)
      companyMock.expects('save').resolves(true)
      sinon
        .mock(Affiliation)
        .expects('findOne')
        .chain('exec')
        .resolves(null)

      await expect(migrateMerchant(companyId)).to.be.rejectedWith(
        'Afiliação não existe.'
      )
    })

    it('when has error on affiliation update', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(companyMock.object)
      companyMock.expects('save').resolves(true)
      sinon
        .mock(Affiliation)
        .expects('findOne')
        .chain('exec')
        .resolves(affiliationMock.object)
      affiliationMock
        .expects('save')
        .throws(new mongoose.Error('affiliation-save-error'))

      await expect(migrateMerchant(companyId)).to.be.rejectedWith(
        'affiliation-save-error'
      )
    })

    it('when has error on get hardwares for disable', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(companyMock.object)
      companyMock.expects('save').resolves(true)
      sinon
        .mock(Affiliation)
        .expects('findOne')
        .chain('exec')
        .resolves(affiliationMock.object)
      affiliationMock.expects('save').resolves(true)
      sinon
        .mock(Hardware)
        .expects('find')
        .chain('exec')
        .throws(new mongoose.Error('hardware-update-error'))

      await expect(migrateMerchant(companyId)).to.be.rejectedWith(
        'hardware-update-error'
      )
    })

    it('when has error on disable hardwares', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(companyMock.object)
      companyMock.expects('save').resolves(true)
      sinon
        .mock(Affiliation)
        .expects('findOne')
        .chain('exec')
        .resolves(affiliationMock.object)
      affiliationMock.expects('save').resolves(true)
      sinon
        .mock(Hardware)
        .expects('find')
        .chain('exec')
        .resolves(hardwares)
      sinon
        .mock(HardwareService)
        .expects('disableChild')
        .throws(new Error('hardware-disable-error'))

      await expect(migrateMerchant(companyId)).to.be.rejectedWith(
        'hardware-disable-error'
      )
    })

    it('when success', async () => {
      sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')
        .resolves(companyMock.object)
      companyMock.expects('save').resolves(true)
      sinon
        .mock(Affiliation)
        .expects('findOne')
        .chain('exec')
        .resolves(affiliationMock.object)
      affiliationMock.expects('save').resolves(true)
      sinon
        .mock(Hardware)
        .expects('find')
        .chain('exec')
        .resolves(hardwares)
      sinon
        .mock(HardwareService)
        .expects('disableChild')
        .resolves(true)

      const result = await migrateMerchant(companyId)
      expect(result).to.have.property('affiliation_updated')
      expect(result).to.have.property('hardwares_disabled')
    })
  })
})
