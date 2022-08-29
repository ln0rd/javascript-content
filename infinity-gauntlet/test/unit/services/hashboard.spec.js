import chai from 'chai'
import sinon from 'sinon'

import frameworkConfig from 'framework/core/config'
import * as AWS from 'application/core/helpers/aws'
import HashboardService from 'application/core/services/hashboard'
import adminConfig from '../../mocks/admin.config.json'

const { expect } = chai
const locale = frameworkConfig.core.i18n.defaultLocale

describe('Unit => Services: Hashboard', () => {
  const s3Stub = sinon.stub(AWS, 's3GetHashboardFile')
  before(() => {
    s3Stub.withArgs('config/url.index.json').resolves({ localhost: 'admin' })
    s3Stub.withArgs('config/admin.config.json').resolves(adminConfig)
  })

  it('should hashboard/conf without auth returns minimal informations', async () => {
    const auth = false
    const response = await HashboardService.getConfigFile(
      locale,
      { origin: 'http://localhost' },
      auth
    )

    // cleaned values
    expect(response.accessControle).to.be.undefined
    expect(response.modules).to.be.undefined
    expect(response.newViews).to.be.undefined
    expect(response.newViews).to.be.undefined
    expect(response.content.views).to.be.undefined
    expect(response.content.views).to.be.undefined
    expect(response.dashboard.isoId).to.be.undefined
    expect(response.dashboard.defaultIntegrationCredential).to.be.undefined

    // not cleaned
    expect(response.api.routes.login).to.not.be.undefined
    expect(response.api.routes.user).to.not.be.undefined
    expect(response.dashboard.client).to.equal(adminConfig.dashboard.client)
    expect(response.dashboard.loginLimitedBy).to.be.string
  })

  it('should hashboard/conf auth returns all informations', async () => {
    const auth = true
    const response = await HashboardService.getConfigFile(
      locale,
      { origin: 'http://localhost' },
      auth
    )

    expect(response).to.deep.equal(adminConfig)
  })
})
