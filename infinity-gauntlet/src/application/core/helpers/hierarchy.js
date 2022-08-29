import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import Promise from 'bluebird'
import R from 'ramda'

export function getValidCompanies(userId, companyIds) {
  return Promise.resolve()
    .then(getUser)
    .then(filterCompanies)
    .spread(filterCustomUsers)

  function getUser() {
    return User.findOne({
      _id: userId
    })
      .lean()
      .exec()
  }

  function checkCustomRoles(user, roles) {
    return (
      R.path(['user_metadata', 'type'], user) &&
      !R.includes(user.user_metadata.type, roles)
    )
  }

  function filterCompanies(user) {
    const query = {
      _id: {
        $in: companyIds
      }
    }

    const customRoles = ['assistant', 'admin', 'master', 'viewer', 'sales']

    if (checkCustomRoles(user, customRoles)) {
      query[`company_metadata.${user.user_metadata.type}`] = user._id.toString()
    }

    return [
      user,
      Company.find(query)
        .lean()
        .exec()
    ]
  }

  function filterCustomUsers(user, companies) {
    const filteredCompanies = []
    const customRoles = ['viewer', 'sales']

    if (
      R.path(['user_metadata', 'type'], user) &&
      R.includes(user.user_metadata.type, customRoles)
    ) {
      R.forEach(company => {
        if (R.path(['company_metadata', user.user_metadata.type], company)) {
          if (
            R.includes(
              userId.toString(),
              company.company_metadata[user.user_metadata.type].split(';')
            )
          ) {
            filteredCompanies.push(company)
          }
        }
      }, companies)

      return filteredCompanies
    } else {
      return companies
    }
  }
}
