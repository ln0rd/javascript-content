import { declareVersion } from 'framework/api/router'
import {
  authenticator,
  publicOrPrivate
} from 'application/api/middlewares/authenticator'
import { authorizer } from 'application/api/middlewares/authorizer'
import cacheMetrics from 'application/api/middlewares/cache-metrics'
import { hashOnlyAuthorizer } from 'application/api/middlewares/hash-only-authorizer'
import { gladosOnlyAuthorizer } from 'application/api/middlewares/glados-only-authorizer'
import { requesterIpAddress } from 'application/api/middlewares/requester-ip-address'
import { checkAuthMode } from 'application/api/middlewares/check-auth-mode'
import redisRateLimiter from 'application/api/middlewares/rate-limit-by-ip'
import { isUserISOMember } from 'application/api/middlewares/is-user-iso-member'
import { canUpdateUser } from 'application/api/middlewares/can-update-user'
import { canInviteUser } from 'application/api/middlewares/can-invite-user'
import { sameUserOnly } from 'application/api/middlewares/same-user-only'
import { bankAccountNormalizer } from 'application/api/middlewares/bank-account-normalizer'
import { byISO } from 'application/api/middlewares/by-iso'

export default function run() {
  const serveCachedResponseMetrics = cacheMetrics.serveCachedResponse()
  const cacheResponseMetrics = cacheMetrics.cacheResponseAfterRequest()

  const routes = [
    // General endpoints
    {
      method: 'GET',
      path: '/',
      handler: 'root.index'
    },
    {
      method: 'GET',
      path: '/healthz',
      handler: 'healthz.liveness'
    },
    {
      method: 'GET',
      path: '/external-healthcheck',
      handler: 'healthz.externalCheck'
    },
    {
      method: 'GET',
      path: '/healthz/readiness',
      handler: 'healthz.readiness'
    },
    {
      method: 'GET',
      path: '/healthz/liveness',
      handler: 'healthz.liveness'
    },
    {
      method: 'GET',
      path: '/zipcodes/:zipcode',
      handler: 'zipcode.get'
    },
    // Application endpoints
    {
      method: 'DELETE',
      path: '/authentication/:user_id/block',
      handler: 'authenticate.manualUnblock',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'POST',
      path: '/authenticate',
      handler: 'authenticate.createToken'
    },
    {
      method: 'GET',
      path: '/app_keys',
      handler: 'app-key.all',
      middlewares: [authenticator, checkAuthMode(['hash_key'])]
    },
    {
      method: 'POST',
      path: '/app_keys',
      handler: 'app-key.create',
      middlewares: [authenticator, checkAuthMode(['hash_key'])]
    },
    {
      method: 'DELETE',
      path: '/app_keys/:id/revoke',
      handler: 'app-key.remove',
      middlewares: [authenticator, checkAuthMode(['hash_key'])]
    },
    {
      method: 'GET',
      path: '/webhooks',
      handler: 'webhook.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/webhooks/:id',
      handler: 'webhook.get',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/webhooks/:id/redeliver',
      handler: 'webhook.redeliver',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/webhooks/:id/deliveries',
      handler: 'webhook.deliveries',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/webhooks/:id/deliveries/:delivery_id',
      handler: 'webhook.delivery',
      middlewares: [authenticator]
    },
    // Remove creation of parent companies via public API
    // {
    //   method: 'POST',
    //   path: '/companies',
    //   handler: 'company.create',
    //   middlewares: [authenticator, hashOnlyAuthorizer, bankAccountNormalizer]
    // },
    // {
    //   method: 'POST',
    //   path: '/children/companies',
    //   handler: 'company.createChild',
    //   middlewares: [authenticator, bankAccountNormalizer]
    // },
    {
      method: 'GET',
      path: '/company',
      handler: 'company.get',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/companies/mcc',
      handler: 'mcc.create',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/companies/mcc',
      handler: 'mcc.all',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/companies/mcc/:mcc_id',
      handler: 'mcc.update',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/companies/:id',
      handler: 'company.get',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/companies/:id',
      handler: 'company.update',
      middlewares: [authenticator, bankAccountNormalizer]
    },
    {
      method: 'PUT',
      path: '/companies/:id/status',
      handler: 'company.updateCompanyStatus',
      middlewares: [authenticator, gladosOnlyAuthorizer]
    },
    {
      method: 'POST',
      path: '/company/hierarchy/edit/allow',
      handler: 'company.allowEditHierarchy',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/company/hierarchy/edit',
      handler: 'company.editHierarchy',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/company/hierarchy/edit/cancel',
      handler: 'company.cancelEditHierarchy',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/company/hierarchy/missing_users',
      handler: 'company.hierarchyMissingUsers',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/children/:child_id',
      handler: 'company.updateChild',
      middlewares: [authenticator, bankAccountNormalizer]
    },
    {
      method: 'PUT',
      path: '/children/:child_id/anticipation',
      handler: 'company.updateChildAnticipation',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'PUT',
      path: '/anticipation',
      handler: 'company.updateAnticipation',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'GET',
      path: '/anticipation',
      handler: 'anticipation.getAnticipations',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/anticipation',
      handler: 'anticipation.anticipate',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'GET',
      path: '/children/:companyId/anticipation',
      handler: 'anticipation.getChildrenAnticipations',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:companyId/anticipation',
      handler: 'anticipation.anticipateChildren',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'POST',
      path: '/children/:companyId/anticipation/simulation',
      handler: 'anticipation.simulateChildren',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'GET',
      path: '/anticipation/summary',
      handler: 'anticipation.getSummary',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/:companyId/anticipation/summary',
      handler: 'anticipation.getChildrenSummary',
      middlewares: [authenticator]
    },
    {
      method: 'DELETE',
      path: '/anticipation/:anticipationId',
      handler: 'anticipation.cancelAnticipation',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'DELETE',
      path: '/children/:companyId/anticipation/:anticipationId',
      handler: 'anticipation.cancelChildrenAnticipation',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'POST',
      path: '/anticipation/simulation',
      handler: 'anticipation.simulate',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'GET',
      path: '/anticipation/next_available_date',
      handler: 'anticipation.getNextAvailableDate',
      middlewares: [authenticator, byISO]
    },
    {
      method: 'GET',
      path: '/children/companies',
      handler: 'company.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/payins',
      handler: 'payin.getChildrenPayins',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/payins',
      handler: 'payin.getPayins',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/wallet/balance',
      handler: 'wallet.getBalance',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/:child_id/wallet/balance',
      handler: 'wallet.getChildrenBalance',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/wallet/freeze',
      handler: 'wallet.freezeChildrenAmount',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/wallet/unfreeze',
      handler: 'wallet.unfreezeChildrenAmount',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/wallet/transfer',
      handler: 'wallet.transferAmount',
      middlewares: [authenticator, authorizer, requesterIpAddress]
    },
    {
      method: 'GET',
      path: '/wallet/transfer',
      handler: 'wallet.getTransfers',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'POST',
      path: '/wallet/transfer/schedule',
      handler: 'wallet.scheduleTransfer',
      middlewares: [authenticator, authorizer, requesterIpAddress]
    },
    {
      method: 'DELETE',
      path: '/wallet/transfer/:transferId',
      handler: 'wallet.cancelScheduledTransfer',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/fee_rule',
      handler: 'fee-rule.createChild',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/children/:child_id/fee_rule',
      handler: 'fee-rule.updateChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/company/fee_rule',
      handler: 'fee-rule.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/fee_rules',
      handler: 'fee-rule.children',
      middlewares: [authenticator]
    },

    {
      method: 'POST',
      path: '/users/credentials',
      handler: 'user.crateCredentials'
    },
    {
      method: 'POST',
      path: '/users/validate_credentials',
      handler: 'user.validateCredentials'
    },
    {
      method: 'POST',
      path: '/users/invite',
      handler: 'user.invite',
      middlewares: [authenticator, canInviteUser]
    },
    {
      method: 'POST',
      path: '/users/activate',
      handler: 'user.activate'
    },
    {
      method: 'PUT',
      path: '/users/:id',
      handler: 'user.update',
      middlewares: [authenticator, canUpdateUser]
    },
    {
      method: 'POST',
      path: '/users/:id/validation/onboarding',
      handler: 'user.onboardingValidation',
      middlewares: [authenticator, sameUserOnly]
    },
    {
      method: 'PUT',
      path: '/users/:id/validation_status',
      handler: 'user.updateValidationStatus',
      middlewares: [authenticator, gladosOnlyAuthorizer]
    },
    {
      method: 'POST',
      path: '/users/:id/disable',
      handler: 'user.disable',
      middlewares: [authenticator, canUpdateUser]
    },
    {
      method: 'POST',
      path: '/users/:id/enable',
      handler: 'user.enable',
      middlewares: [authenticator, canUpdateUser]
    },
    {
      method: 'POST',
      path: '/users/password/reset',
      handler: 'user.resetPassword',
      middlewares: [requesterIpAddress, redisRateLimiter('reset_password')]
    },
    {
      method: 'POST',
      path: '/users/:id/update_password',
      handler: 'user.updatePassword',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/users/:id',
      handler: 'user.get',
      middlewares: [authenticator]
    },
    {
      method: 'DELETE',
      path: '/users/:id/permission',
      handler: 'user.revokePermission',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/users/password/request_reset_token',
      handler: 'user.requestPasswordResetToken'
    },
    {
      method: 'POST',
      path: '/users/password/request_create_token',
      handler: 'user.requestCreatePasswordToken'
    },
    {
      method: 'POST',
      path: '/users/password/reset_via_token',
      handler: 'user.resetPasswordViaToken'
    },
    {
      method: 'POST',
      path: '/integrations',
      handler: 'integration.process',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/integrations/credentials',
      handler: 'integration.create',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:childId/integrations/credentials',
      handler: 'integration.createChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/integrations/credentials',
      handler: 'integration.childrenCredentials',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/children/:childId/integrations/credentials/:credentialId',
      handler: 'integration.updateChildCredential',
      middlewares: [authenticator]
    },
    {
      method: 'DELETE',
      path: '/children/:childId/integrations/credentials/:credentialId',
      handler: 'integration.deleteChildCredential',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/integrations',
      handler: 'integration.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/transactions',
      handler: 'transaction.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/transactions/:id',
      handler: 'transaction.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/disputes',
      handler: 'dispute.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/disputes/:id',
      handler: 'dispute.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/transactions/:transaction_id/payables',
      handler: 'payable.transactionPayables',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/transactions/:transactionId/installments/:companyId',
      handler: 'transaction.installmentInfo',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/transactions',
      handler: 'transaction.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/transactions/:id',
      handler: 'transaction.childrenTransaction',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/transactions/queue_register',
      handler: 'transaction.queueRegister',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/transactions/queue_register',
      handler: 'transaction.queueRegisterChild',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/transactions/queue',
      handler: 'queue.register',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/transactions/:id/register_refund',
      handler: 'transaction.registerRefund',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/transactions/:id/refund',
      handler: 'transaction.refundChild',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/transactions/:id/refund',
      handler: 'transaction.refund',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/transactions/register',
      handler: 'transaction.register',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/transactions/register',
      handler: 'transaction.registerChild',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/affiliations',
      handler: 'affiliation.create',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/affiliations',
      handler: 'affiliation.createChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/affiliations',
      handler: 'affiliation.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/affiliations/:id',
      handler: 'affiliation.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/affiliations',
      handler: 'affiliation.children',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/affiliations/:id',
      handler: 'affiliation.update',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/hardwares/:hardware_id/disable',
      handler: 'hardware.disableChild',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/hardwares',
      handler: 'hardware.create',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/hardwares',
      handler: 'hardware.createChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/hardwares',
      handler: 'hardware.all',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/hardwares/activate',
      handler: 'hardware.activateSerial'
    },
    {
      method: 'GET',
      path: '/hardwares/:id',
      handler: 'hardware.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/hardwares',
      handler: 'hardware.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/payables',
      handler: 'payable.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/payables/:id',
      handler: 'payable.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/payables',
      handler: 'payable.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/banks',
      handler: 'bank.getAll'
    },
    {
      method: 'GET',
      path: '/mccs',
      handler: 'mcc.getRegistered'
    },
    {
      method: 'GET',
      path: '/acquirer_responses',
      handler: 'acquirer.getAllResponses',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/charge_configurations',
      handler: 'charge-configuration.createChild',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/charge_configurations/:config_id/cancel',
      handler: 'charge-configuration.cancelChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/charge_configurations',
      handler: 'charge-configuration.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/charge_configurations/:id',
      handler: 'charge-configuration.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/charge_configurations',
      handler: 'charge-configuration.children',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/charges/:charge_id/cancel',
      handler: 'charge.cancelChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/charges',
      handler: 'charge.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/charges/:id',
      handler: 'charge.get',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/charges',
      handler: 'charge.createChild',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/charges',
      handler: 'charge.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/settlements/:id',
      handler: 'settlement.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/settlements',
      handler: 'settlement.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/settlements',
      handler: 'settlement.children',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/external_webhook',
      handler: 'external-webhook.handle'
    },
    // Payouts endpoints
    {
      method: 'GET',
      path: '/payouts/:id',
      handler: 'payout.get',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/payouts',
      handler: 'payout.all',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/payouts',
      handler: 'payout.children',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/:child_id/payouts/:id',
      handler: 'payout.getChild',
      middlewares: [authenticator]
    },

    // Transaction simulation endpoints
    {
      method: 'POST',
      path: '/transaction/simulation',
      handler: 'transaction.simulate',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/transaction/calculate',
      handler: 'transaction.calculate',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/transaction/calculate',
      handler: 'transaction.calculateChild',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/children/:child_id/transaction/simulation',
      handler: 'transaction.simulateChild',
      middlewares: [authenticator]
    },

    // Api Keys endpoints
    {
      method: 'POST',
      path: '/api_key',
      handler: 'api-key.create',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'GET',
      path: '/api_key',
      handler: 'api-key.get',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'PUT',
      path: '/api_key/:apiKeyId',
      handler: 'api-key.update',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'DELETE',
      path: '/api_key/:apiKeyId',
      handler: 'api-key.delete',
      middlewares: [authenticator, authorizer]
    },

    // Permissions endpoints
    {
      method: 'GET',
      path: '/permissions',
      handler: 'permissions.getPermissions',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'DELETE',
      path: '/permissions/:permissionId',
      handler: 'permissions.deletePermission',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'POST',
      path: '/permissions',
      handler: 'permissions.createPermission',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'PUT',
      path: '/permissions/:permissionId',
      handler: 'permissions.updatePermission',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'GET',
      path: '/permissions/resources',
      handler: 'permissions.getResources',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/permissions/resources',
      handler: 'permissions.createResource',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'PUT',
      path: '/permissions/resources/:resourceId',
      handler: 'permissions.updateResource',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'DELETE',
      path: '/permissions/resources/:resourceId',
      handler: 'permissions.deleteResource',
      middlewares: [authenticator, authorizer]
    },

    // Conciliation endpoints
    {
      method: 'GET',
      path: '/conciliation/transactions',
      handler: 'conciliation.getTransactions',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/conciliation/settlements',
      handler: 'conciliation.getSettlements',
      middlewares: [authenticator]
    },

    // Hashboard endpoints
    {
      method: 'GET',
      path: '/hashboard',
      handler: 'hashboard.getHashboard',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/hashboard',
      handler: 'hashboard.createHashboard',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/hashboard/configuration',
      handler: 'hashboard.getHashboardConfiguration'
    },
    {
      method: 'POST',
      path: '/hashboard/:hashboardId/url',
      handler: 'hashboard.addUrl',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'DELETE',
      path: '/hashboard/cache',
      handler: 'hashboard.clearCache',
      middlewares: [authenticator, authorizer]
    },
    {
      method: 'DELETE',
      path: '/hashboard/:hashboardId',
      handler: 'hashboard.deleteHashboard',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/hashboard/:hashboardId',
      handler: 'hashboard.updateHashboard',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/hashboard/deployment',
      handler: 'hashboard.getDeployment',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/hashboard/deployment',
      handler: 'hashboard.createDeployment',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/hashboard/deployment/:deploymentId',
      handler: 'hashboard.updateDeployment',
      middlewares: [authenticator]
    },
    {
      method: 'DELETE',
      path: '/hashboard/deployment/:deploymentId',
      handler: 'hashboard.deleteDeployment',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/hashboard/deployment/distribution',
      handler: 'hashboard.createDistribution',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/hashboard/deployment/distribution',
      handler: 'hashboard.getDistribution',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/hashboard/deployment/distribution/:distributionId',
      handler: 'hashboard.updateDistribution',
      middlewares: [authenticator]
    },
    {
      method: 'DELETE',
      path: '/hashboard/deployment/distribution/:distributionId',
      handler: 'hashboard.deleteDistribution',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/hashboard/conf',
      handler: 'hashboard.hashboardConf',
      middlewares: [publicOrPrivate]
    },
    // Events endpoints
    {
      method: 'POST',
      path: '/event/source',
      handler: 'event.createSource',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'GET',
      path: '/event/source',
      handler: 'event.getSource',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'PUT',
      path: '/event/source/:eventSourceId',
      handler: 'event.updateSource',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'DELETE',
      path: '/event/source/:eventSourceId',
      handler: 'event.deleteSource',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'POST',
      path: '/event/handler',
      handler: 'event.createHandler',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'GET',
      path: '/event/handler',
      handler: 'event.getHandler',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'PUT',
      path: '/event/handler/:eventHandlerId',
      handler: 'event.updateHandler',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'DELETE',
      path: '/event/handler/:eventHandlerId',
      handler: 'event.deleteHandler',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'GET',
      path: '/company/event',
      handler: 'company.listEvents',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/company/event/:eventId',
      handler: 'company.updateEvent',
      middlewares: [authenticator]
    },
    {
      method: 'DELETE',
      path: '/company/event/:eventId',
      handler: 'company.removeEvent',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/company/event',
      handler: 'company.registerEvent',
      middlewares: [authenticator]
    },

    // Portfolio endpoints
    {
      method: 'POST',
      path: '/portfolio',
      handler: 'portfolio.create',
      middlewares: [authenticator, isUserISOMember]
    },
    {
      method: 'GET',
      path: '/portfolio',
      handler: 'portfolio.list',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/portfolio/merchant',
      handler: 'portfolio.listMerchants',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/portfolio/owner',
      handler: 'portfolio.listPossibleOwners',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/portfolio/merchant/transfer/request',
      handler: 'portfolio.transferMerchant',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/portfolio/:portfolio_id',
      handler: 'portfolio.get',
      middlewares: [authenticator]
    },
    {
      method: 'PUT',
      path: '/portfolio/:portfolio_id',
      handler: 'portfolio.edit',
      middlewares: [authenticator, isUserISOMember]
    },
    {
      method: 'DELETE',
      path: '/portfolio/:portfolio_id',
      handler: 'portfolio.remove',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/children/metrics',
      handler: 'metrics.children',
      middlewares: [authenticator, serveCachedResponseMetrics],
      afterwares: [cacheResponseMetrics]
    },
    {
      method: 'GET',
      path: '/metrics',
      handler: 'metrics.get',
      middlewares: [authenticator, serveCachedResponseMetrics],
      afterwares: [cacheResponseMetrics]
    },
    {
      method: 'GET',
      path: '/metrics/summary',
      handler: 'metrics.summary',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/metrics/balance',
      handler: 'metrics.balance',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/metrics/payables-thirty-days',
      handler: 'metrics.toReceiveNextThirtyDays',
      middlewares: [authenticator, serveCachedResponseMetrics],
      afterwares: [cacheResponseMetrics]
    },
    {
      method: 'POST',
      path: '/sms/send_recovery_code',
      handler: 'sms.forgotPassword'
    },
    {
      method: 'POST',
      path: '/sms/validate_code',
      handler: 'sms.validateCode'
    },

    {
      method: 'PUT',
      path: '/migrate/children/:child_id',
      handler: 'company.migrateChild',
      middlewares: [authenticator]
    },

    // Public endpoints
    // {
    //   method: 'GET',
    //   path: '/public/children/companies',
    //   handler: 'company.publicSearchDocumentNumberChild'
    // },
    // {
    //   method: 'POST',
    //   path: '/public/children/companies',
    //   handler: 'company.publicCreateChild'
    // },
    // Checkout
    {
      method: 'POST',
      path: '/public/checkout/payment_link',
      handler: 'checkout.createPaymentLink'
    },

    // Test endpoints
    {
      method: 'GET',
      path: '/400',
      handler: 'test.badRequest'
    },
    {
      method: 'GET',
      path: '/401',
      handler: 'test.unauthenticated'
    },
    {
      method: 'GET',
      path: '/403',
      handler: 'test.unauthorized'
    },
    {
      method: 'GET',
      path: '/500',
      handler: 'test.internalServer'
    },
    {
      method: 'GET',
      path: '/validation_error',
      handler: 'test.validation'
    },
    {
      method: 'GET',
      path: '/method_not_allowed',
      handler: 'test.methodNotAllowed'
    },
    {
      method: 'GET',
      path: '/version_not_allowed',
      handler: 'test.versionNotAllowed'
    },
    {
      method: 'POST',
      path: '/unsupported_media_type',
      handler: 'test.unsupportedMediaType'
    },
    {
      method: 'GET',
      path: '/generic_error',
      handler: 'test.genericError'
    },
    {
      method: 'GET',
      path: '/agreement',
      handler: 'agreement.getAll',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'PUT',
      path: '/agreement',
      handler: 'agreement.create',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'DELETE',
      path: '/agreement/:agreement_id',
      handler: 'agreement.remove',
      middlewares: [authenticator, hashOnlyAuthorizer]
    },
    {
      method: 'GET',
      path: '/agreement/pending',
      handler: 'agreement.getPending',
      middlewares: [authenticator]
    },
    {
      method: 'GET',
      path: '/agreement/accepted',
      handler: 'agreement.getAccepted',
      middlewares: [authenticator]
    },
    {
      method: 'POST',
      path: '/agreement/accept',
      handler: 'agreement.accept',
      middlewares: [authenticator, requesterIpAddress]
    },
    {
      method: 'GET',
      path: '/company/stores',
      handler: 'company.listStores'
    },
    // Temporary for migrate mobbi merchants from stone to celer
    {
      method: 'POST',
      path: '/migrate/mobbi',
      handler: 'migrate.mobbi',
      middlewares: [authenticator, hashOnlyAuthorizer]
    }
  ]
  return declareVersion('1.0.0', routes)
}
