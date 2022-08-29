import { ServerRoute } from '@hapi/hapi'
import { CalculatePricingRoutes } from './calculate-pricing-routes'
import { HashRevenueRoutes } from './hash-revenue-routes'
import { HealthRoutes } from './healthz-routes'
import { IsoRevenueRoutes } from './iso-revenue-routes'
import { SplitRoutes } from './split-rule-routes'

const Routes: ServerRoute[] = [
  HealthRoutes.healthz,
  HealthRoutes.readiness,
  HashRevenueRoutes.createByISO,
  HashRevenueRoutes.createByMerchant,
  IsoRevenueRoutes.isoRevenueForIso,
  IsoRevenueRoutes.isoRevenueForMerchant,
  SplitRoutes.splitForIso,
  SplitRoutes.splitForMerchant,
  CalculatePricingRoutes.calculatePricing,
]

export { Routes }
