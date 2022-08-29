import { expect } from 'chai'
import forEach from 'mocha-each'
import sinon from 'sinon'
import request from 'request-promise'
import * as queue from 'framework/core/adapters/queue'

import {
  getLiquidationDateFormatted,
  integrationDefaultData,
  integrationStoneData,
  integrationHashData,
  processIntegration
} from 'application/core/integrations/sapleomadeiras'
import * as mailer from 'framework/core/helpers/mailer'

import { generateLeoResponseXML, generateWithProvider } from './fixtures'

describe('Leo SAP Integration', () => {
  let reqStub

  beforeEach(() => {
    reqStub = sinon.stub(request, 'post')
  })

  afterEach(() => {
    sinon.restore()
  })

  forEach([
    [new Date(2019, 7, 1), '02082019'],
    [new Date(2019, 7, 2), '03082019'],
    [new Date(2019, 10, 14), '15112019']
  ]).it(
    'the liquidation date for transaction created in %s should equal %s',
    async (createdAt, liquidation) => {
      const date = await getLiquidationDateFormatted(createdAt)
      expect(date).equal(liquidation)
    }
  )

  describe('Integration Data', () => {
    forEach([['cnpj', 'STCD1'], ['cpf', 'STCD2']]).it(
      'the integrationDefaultData should return an object with formated values and correct key %s == %s',
      async (documentType, key) => {
        const { integrationCredential, data } = generateWithProvider(
          'stone',
          'mastercard',
          documentType
        )
        const obj = await integrationDefaultData(integrationCredential, data)

        expect(obj).to.deep.equal({
          [key]: '20059126000149',
          BUPLA: '1023',
          BLDAT: '03062017',
          ZFBDT: '04062017',
          WRBTR: '0000000000010.00',
          VALORTOTTRANS: '0000000000010.53',
          NUNPARC: '01',
          ESTORNO: '',
          XREF2: 'MASTERCARD',
          XBLNR: '0000000008',
          XREF3: '00000000000000000008',
          XREF1: '000000000008',
          ID_UNICO: 'AAABA953-9814-4044-A4C5-F178A6C20223'
        })
      }
    )
  })

  describe('Stone', () => {
    const {
      locale,
      variables,
      integrationCredential,
      data
    } = generateWithProvider('stone', 'mastercard')

    it('the integrationStoneData should return an object with stone data formated', async () => {
      const obj = await integrationStoneData(data)

      expect(obj).to.deep.equal({
        VERSAO: '1'
      })
    })

    it('transaction with hash provider should send correct XML', async () => {
      reqStub.resolves(generateLeoResponseXML())

      await processIntegration(locale, variables, integrationCredential, data)

      expect(reqStub.called).to.be.true

      const { body } = reqStub.getCall(0).args[0]

      expect(body).contains('<VERSAO>1</VERSAO>')
      expect(body).contains('<STCD1>20059126000149</STCD1>')
      expect(body).contains('<BUPLA>1023</BUPLA>')
      expect(body).contains('<BLDAT>03062017</BLDAT>')
      expect(body).contains('<ZFBDT>04062017</ZFBDT>')
      expect(body).contains('<WRBTR>0000000000010.00</WRBTR>')
      expect(body).contains('<VALORTOTTRANS>0000000000010.53</VALORTOTTRANS>')
      expect(body).contains('<XBLNR>0000000008</XBLNR>')
      expect(body).contains('<XREF3>00000000000000000008</XREF3>')
      expect(body).contains('<XREF1>000000000008</XREF1>')
      expect(body).contains('<XREF2>MASTERCARD</XREF2>')
      expect(body).contains('<NUNPARC>01</NUNPARC>')
      expect(body).contains('<ESTORNO></ESTORNO>')
    })

    it('transaction with stone provider should failed send a email', async () => {
      const mockError = () => {}
      const stdSpy = sinon.spy(mailer, 'scheduleToDeliver')
      // mock queue
      sinon.stub(queue, 'publishMessage').resolves()
      reqStub.resolves(generateLeoResponseXML(false))

      try {
        await processIntegration(locale, variables, integrationCredential, data)
      } catch (e) {
        mockError(e)
      }

      expect(reqStub.called).to.be.true
      expect(stdSpy.called).to.be.true
    })
  })

  describe('Hash', () => {
    const {
      locale,
      variables,
      integrationCredential,
      data
    } = generateWithProvider('hash', 'mastercard')

    it('the integrationStoneData should return an object with stone data formated', async () => {
      const obj = await integrationHashData(data, variables.card_brand_codes)

      expect(obj).to.deep.equal({
        VERSAO: '2',
        BANDEIRA: '002',
        NSU: '000000000000008',
        VALORTAXA: '0000000000020.00',
        VALORPRIMEIRAPARCELA: '0000000000033.00',
        CODAUTORIZA: '',
        DEBIT_CRED: '2'
      })
    })

    it('transaction with hash provider should send a correct XML', async () => {
      reqStub.resolves(generateLeoResponseXML())

      await processIntegration(locale, variables, integrationCredential, data)

      expect(reqStub.called).to.be.true

      const { body } = reqStub.getCall(0).args[0]

      expect(body).contains('<VERSAO>2</VERSAO>')
      expect(body).contains('<STCD1>20059126000149</STCD1>')
      expect(body).contains('<BUPLA>1023</BUPLA>')
      expect(body).contains('<BLDAT>03062017</BLDAT>')
      expect(body).contains('<ZFBDT>04062017</ZFBDT>')
      expect(body).contains('<WRBTR>0000000000010.00</WRBTR>')
      expect(body).contains('<VALORTOTTRANS>0000000000010.53</VALORTOTTRANS>')
      expect(body).contains('<NUNPARC>01</NUNPARC>')
      expect(body).contains('<XREF3>00000000000000000008</XREF3>')
      expect(body).contains('<XREF1>000000000008</XREF1>')
      expect(body).contains('<XREF2>MASTERCARD</XREF2>')
      expect(body).contains('<BANDEIRA>002</BANDEIRA>')
      expect(body).contains('<NSU>000000000000008</NSU>')
      expect(body).contains('<VALORTAXA>0000000000020.00</VALORTAXA>')
      expect(body).contains(
        '<VALORPRIMEIRAPARCELA>0000000000033.00</VALORPRIMEIRAPARCELA>'
      )
      expect(body).contains('<XBLNR>0000000008</XBLNR>')
      expect(body).contains('<CODAUTORIZA></CODAUTORIZA>')
      expect(body).contains('<ESTORNO></ESTORNO>')
      expect(body).contains('<DEBIT_CRED>2</DEBIT_CRED>')
    })
  })
})
