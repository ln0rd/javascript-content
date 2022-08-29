import R from 'ramda'
import { mapModel } from 'application/core/helpers/responder'
import { hashboardDeploymentResponder } from 'application/core/responders/hashboard-deployment'

export function hashboardResponder(model, skipConfiguration) {
  return mapModel(model, hashboard => {
    return {
      object: 'hashboard',
      id: hashboard._id,
      company: {
        name: R.path(['company', 'name'], hashboard) || '',
        id: R.path(['company', '_id'], hashboard) || ''
      },
      type: hashboard.type,
      name: hashboard.name,
      description: hashboard.description,
      enabled: hashboard.enabled,
      configuration: skipConfiguration ? {} : hashboard.configuration,
      deployments: hashboard.deployments
        ? hashboardDeploymentResponder(hashboard.deployments)
        : []
    }
  })
}

export function hashboardConfResponder(model, authenticated = false) {
  if (!authenticated) {
    const { api, content, domains, scripts, style, dashboard } = model
    const { customBaseUrl, routes, measurePerformance } = api
    const { login, companies, user } = routes
    const {
      client,
      description,
      isMerchant,
      publicResetPassword,
      title,
      isoId
    } = dashboard
    const { pages } = content

    return {
      api: {
        customBaseUrl,
        measurePerformance,
        routes: {
          login,
          companies: {
            getOne: companies.getOne
          },
          user: {
            passwordReset: user.passwordReset,
            redefinePassword: user.redefinePassword,
            resetPassword: user.resetPassword
          }
        }
      },
      dashboard: {
        client,
        description,
        isMerchant,
        publicResetPassword,
        title,
        loginLimitedBy: isoId
          ? Buffer.from(isoId).toString('base64')
          : undefined
      },
      content: {
        pages
      },
      domains,
      scripts,
      style
    }
  }

  return model
}
