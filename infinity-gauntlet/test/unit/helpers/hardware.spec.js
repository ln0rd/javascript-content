import { expect } from 'chai'
import { verifySerialNumber } from 'application/core/helpers/hardware'

describe('Unit => Helpers: Hardware', () => {
  context('verifySerialNumber', () => {
    const tests = [
      { serial: '', model: 'd195', expectedResult: false },
      { serial: '', model: 'd190', expectedResult: false },
      { serial: '', model: 'd175', expectedResult: false },
      { serial: '', model: 's920', expectedResult: false },
      { serial: '', model: 'a920', expectedResult: false },
      { serial: '', model: 'd150', expectedResult: false },
      { serial: '', model: 'mobipin10', expectedResult: false },
      { serial: '', model: 'move5000', expectedResult: false },
      { serial: '1261145109', model: 'd190', expectedResult: true },
      { serial: '1261145109', model: 'd195', expectedResult: false },
      { serial: '1261145109', model: 'd175', expectedResult: false },
      { serial: '1261145109', model: 's920', expectedResult: false },
      { serial: '1261145109', model: 'a920', expectedResult: false },
      { serial: '1261145109', model: 'd150', expectedResult: false },
      { serial: '1261145109', model: 'mobipin10', expectedResult: false },
      { serial: '1261145109', model: 'move5000', expectedResult: false },
      { serial: '1470519935', model: 'd195', expectedResult: true },
      { serial: '1483832895', model: 'd175', expectedResult: true },
      { serial: '1470519935', model: 'd190', expectedResult: false },
      { serial: '1470516874', model: 's920', expectedResult: false },
      { serial: '1470519128', model: 'a920', expectedResult: false },
      { serial: '1470519128', model: 'd150', expectedResult: false },
      { serial: '1470519128', model: 'mobipin10', expectedResult: false },
      { serial: '1470519128', model: 'move5000', expectedResult: false },
      { serial: '6C354788', model: 's920', expectedResult: true },
      { serial: '6C354788', model: 'd190', expectedResult: false },
      { serial: '6C354788', model: 'd195', expectedResult: false },
      { serial: '6C354788', model: 'd175', expectedResult: false },
      { serial: '6C354788', model: 'a920', expectedResult: false },
      { serial: '6C354788', model: 'd150', expectedResult: false },
      { serial: '6C354788', model: 'mobipin10', expectedResult: false },
      { serial: '6C354788', model: 'move5000', expectedResult: false },
      { serial: '0820479388', model: 'a920', expectedResult: true },
      { serial: '0820479388', model: 'd190', expectedResult: false },
      { serial: '0820479388', model: 'd195', expectedResult: false },
      { serial: '0820479388', model: 'd175', expectedResult: false },
      { serial: '0820479388', model: 's920', expectedResult: false },
      { serial: '0820479388', model: 'd150', expectedResult: false },
      { serial: '0820479388', model: 'mobipin10', expectedResult: false },
      { serial: '0820479388', model: 'move5000', expectedResult: false },
      { serial: '7D332473', model: 'd150', expectedResult: true },
      { serial: '7D332473', model: 'd190', expectedResult: false },
      { serial: '7D332473', model: 'd195', expectedResult: false },
      { serial: '7D332473', model: 'd175', expectedResult: false },
      { serial: '7D332473', model: 's920', expectedResult: false },
      { serial: '7D332473', model: 'a920', expectedResult: false },
      { serial: '7D332473', model: 'mobipin10', expectedResult: false },
      { serial: '7D332473', model: 'move5000', expectedResult: false },
      { serial: '8000021806006568', model: 'mobipin10', expectedResult: true },
      { serial: '8000021806006568', model: 'd190', expectedResult: false },
      { serial: '8000021806006568', model: 'd195', expectedResult: false },
      { serial: '8000021806006568', model: 'd175', expectedResult: false },
      { serial: '8000021806006568', model: 's920', expectedResult: false },
      { serial: '8000021806006568', model: 'a920', expectedResult: false },
      { serial: '8000021806006568', model: 'd150', expectedResult: false },
      { serial: '8000021806006568', model: 'move5000', expectedResult: false },
      {
        serial: '180476933191028205348069',
        model: 'move5000',
        expectedResult: true
      },
      {
        serial: '180476933191028205348069',
        model: 'd190',
        expectedResult: false
      },
      {
        serial: '180476933191028205348069',
        model: 'd195',
        expectedResult: false
      },
      {
        serial: '180476933191028205348069',
        model: 'd175',
        expectedResult: false
      },
      {
        serial: '180476933191028205348069',
        model: 's920',
        expectedResult: false
      },
      {
        serial: '180476933191028205348069',
        model: 'a920',
        expectedResult: false
      },
      {
        serial: '180476933191028205348069',
        model: 'd150',
        expectedResult: false
      },
      {
        serial: '180476933191028205348069',
        model: 'mobipin10',
        expectedResult: false
      }
    ]

    tests.forEach(test => {
      const itStr = `should be ${test.expectedResult} when the serial is ${
        test.serial
      } and models is ${test.model}`
      it(itStr, () => {
        const result = verifySerialNumber(test.serial, test.model)
        expect(result).to.be.equal(test.expectedResult)
      })
    })
  })
})
