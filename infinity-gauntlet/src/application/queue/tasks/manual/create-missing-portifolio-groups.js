import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import PortifolioGroup from 'application/core/services/portifolio/models/portifolio-group'
import { createMissingPortifolioGroups } from 'application/core/services/portifolio/tasks/create-missing-portifolio-groups'
import Company from 'application/core/models/company'

const Logger = createLogger({ name: 'CREATE_MISSING_PORTIFOLIO_GROUPS_TASK' })

const DEPENDENCIES = {
  Logger,
  Company,
  PortifolioGroup
}

export default class CreateMissingPortifolioGroups {
  static type() {
    return 'manual'
  }

  static handler() {
    return Promise.resolve().then(createMissingPortifolioGroups(DEPENDENCIES))
  }
}
