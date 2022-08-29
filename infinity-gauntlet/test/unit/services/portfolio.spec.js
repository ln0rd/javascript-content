import { expect } from 'chai'
import sinon from 'sinon'
import 'sinon-mongoose'
import { ObjectID } from 'mongodb'

import Company from 'application/core/models/company'
import Portfolio from 'application/core/models/portfolio'
import User from 'application/core/models/user'
import PortfolioService from 'application/core/services/portfolio'

describe('Unit => Services: Portfolio', () => {
  context('getPortfolioIds', () => {
    const companyIdMock = ObjectID()
    const userIdMock = ObjectID()
    const ownerIds = [userIdMock, ObjectID(), ObjectID()]
    const hierarchy = {
      data: [[ownerIds[0], [[ownerIds[1], []], [ownerIds[2], []]]]]
    }

    const companyMockResponse = {
      enabled_features: {
        portfolio: true
      }
    }
    const companyWithHierarchyMockResponse = Object.assign(
      {},
      companyMockResponse,
      {
        hierarchy
      }
    )

    const permissionsMock = [
      {
        company_id: '5cf141b986642840656717f0'
      }
    ]

    let companyFindMock
    let userFindMock

    beforeEach(() => {
      companyFindMock = sinon
        .mock(Company)
        .expects('findOne')
        .chain('exec')

      userFindMock = sinon
        .mock(User)
        .expects('findOne')
        .chain('exec')
    })

    afterEach(() => sinon.restore())

    it('Company with portfolio disabled return null', async () => {
      companyFindMock.resolves({
        enabled_features: {}
      })

      const response = await PortfolioService.getPortfolioIds(companyIdMock)

      expect(response).to.be.null
    })

    it('Company with portfolio enabled without hierarchy return null', async () => {
      companyFindMock.resolves(companyMockResponse)

      const response = await PortfolioService.getPortfolioIds(companyIdMock)

      expect(response).to.be.null
    })

    it('Company with portfolio enabled with hierarchy and not user return null', async () => {
      companyFindMock.resolves(companyWithHierarchyMockResponse)

      const response = await PortfolioService.getPortfolioIds(companyIdMock)

      expect(response).to.be.null
    })

    it('Company with portfolio enabled with hierarchy with admin user return null', async () => {
      companyFindMock.resolves(companyWithHierarchyMockResponse)

      userFindMock.resolves({
        user_metadata: {
          type: 'admin'
        },
        permissions: permissionsMock
      })

      const response = await PortfolioService.getPortfolioIds(
        companyIdMock,
        userIdMock
      )

      expect(response).to.be.null
    })

    it('Company with portfolio enabled with hierarchy without admin user return a portfolio list', async () => {
      companyFindMock.resolves(companyWithHierarchyMockResponse)

      userFindMock.resolves({
        user_metadata: {
          type: 'coordinator'
        },
        permissions: permissionsMock
      })

      const portfolioIds = [ObjectID(), ObjectID()]
      const portfoliosMockResponse = [
        {
          _id: portfolioIds[0]
        },
        {
          _id: portfolioIds[1]
        }
      ]

      sinon
        .mock(Portfolio)
        .expects('find')
        .withArgs({
          $or: [
            { 'owner._id': { $in: ownerIds } },
            { 'viewers._id': userIdMock }
          ]
        })
        .chain('exec')
        .resolves(portfoliosMockResponse)

      const response = await PortfolioService.getPortfolioIds(
        companyIdMock,
        userIdMock
      )

      expect(response).to.deep.equal(portfolioIds)
    })
  })
})
