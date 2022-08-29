import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import jwt from 'jsonwebtoken'
import sinon from 'sinon'
import IdentityClient from '@hashlab/identity-client'
import {
  jwtToken,
  authenticator
} from 'application/api/middlewares/authenticator'
import * as IdentityAuthenticator from 'application/api/middlewares/authenticator/identity-bearer-token'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'
import Configs from 'application/core/config'

const expect = chai.expect
chai.use(chaiAsPromised)

const content = { company: { id: '1' }, user: { id: '1' } }

const { secret_key, expires_in } = Configs.middlewares.jwt
const validJwtToken = jwt.sign(content, secret_key, {
  expiresIn: expires_in
})
const invalidJwtToken = jwt.sign('oh loquinho meu', 'faustinho')

const IdentityContext = {
  tokenWithInvalidFormat:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  tokenInactive: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkRJenpXZWdhd1VFZ1REbFV0cFdRYyJ9.eyJpc3MiOiJodHRwczovL3N0YWdpbmcteW91ci1icmFuZC51cy5hdXRoMC5jb20vIiwic3ViIjoiRFUzamdmSmFHSG1yV29MTmhxQngzQ0k4bnNXbzVMeExAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vc3RhZ2luZy15b3VyLWJyYW5kLnVzLmF1dGgwLmNvbS9hcGkvdjIvIiwiaWF0IjoxNjQ1NDc3NTQ3LCJleHAiOjE2NDU1NjM5NDcsImF6cCI6IkRVM2pnZkphR0htcldvTE5ocUJ4M0NJOG5zV281THhMIiwic2NvcGUiOiJyZWFkOmNsaWVudF9ncmFudHMgY3JlYXRlOmNsaWVudF9ncmFudHMgZGVsZXRlOmNsaWVudF9ncmFudHMgdXBkYXRlOmNsaWVudF9ncmFudHMgcmVhZDp1c2VycyB1cGRhdGU6dXNlcnMgZGVsZXRlOnVzZXJzIGNyZWF0ZTp1c2VycyByZWFkOnVzZXJzX2FwcF9tZXRhZGF0YSB1cGRhdGU6dXNlcnNfYXBwX21ldGFkYXRhIGRlbGV0ZTp1c2Vyc19hcHBfbWV0YWRhdGEgY3JlYXRlOnVzZXJzX2FwcF9tZXRhZGF0YSByZWFkOnVzZXJfY3VzdG9tX2Jsb2NrcyBjcmVhdGU6dXNlcl9jdXN0b21fYmxvY2tzIGRlbGV0ZTp1c2VyX2N1c3RvbV9ibG9ja3MgY3JlYXRlOnVzZXJfdGlja2V0cyByZWFkOmNsaWVudHMgdXBkYXRlOmNsaWVudHMgZGVsZXRlOmNsaWVudHMgY3JlYXRlOmNsaWVudHMgcmVhZDpjbGllbnRfa2V5cyB1cGRhdGU6Y2xpZW50X2tleXMgZGVsZXRlOmNsaWVudF9rZXlzIGNyZWF0ZTpjbGllbnRfa2V5cyByZWFkOmNvbm5lY3Rpb25zIHVwZGF0ZTpjb25uZWN0aW9ucyBkZWxldGU6Y29ubmVjdGlvbnMgY3JlYXRlOmNvbm5lY3Rpb25zIHJlYWQ6cmVzb3VyY2Vfc2VydmVycyB1cGRhdGU6cmVzb3VyY2Vfc2VydmVycyBkZWxldGU6cmVzb3VyY2Vfc2VydmVycyBjcmVhdGU6cmVzb3VyY2Vfc2VydmVycyByZWFkOmRldmljZV9jcmVkZW50aWFscyB1cGRhdGU6ZGV2aWNlX2NyZWRlbnRpYWxzIGRlbGV0ZTpkZXZpY2VfY3JlZGVudGlhbHMgY3JlYXRlOmRldmljZV9jcmVkZW50aWFscyByZWFkOnJ1bGVzIHVwZGF0ZTpydWxlcyBkZWxldGU6cnVsZXMgY3JlYXRlOnJ1bGVzIHJlYWQ6cnVsZXNfY29uZmlncyB1cGRhdGU6cnVsZXNfY29uZmlncyBkZWxldGU6cnVsZXNfY29uZmlncyByZWFkOmhvb2tzIHVwZGF0ZTpob29rcyBkZWxldGU6aG9va3MgY3JlYXRlOmhvb2tzIHJlYWQ6YWN0aW9ucyB1cGRhdGU6YWN0aW9ucyBkZWxldGU6YWN0aW9ucyBjcmVhdGU6YWN0aW9ucyByZWFkOmVtYWlsX3Byb3ZpZGVyIHVwZGF0ZTplbWFpbF9wcm92aWRlciBkZWxldGU6ZW1haWxfcHJvdmlkZXIgY3JlYXRlOmVtYWlsX3Byb3ZpZGVyIGJsYWNrbGlzdDp0b2tlbnMgcmVhZDpzdGF0cyByZWFkOmluc2lnaHRzIHJlYWQ6dGVuYW50X3NldHRpbmdzIHVwZGF0ZTp0ZW5hbnRfc2V0dGluZ3MgcmVhZDpsb2dzIHJlYWQ6bG9nc191c2VycyByZWFkOnNoaWVsZHMgY3JlYXRlOnNoaWVsZHMgdXBkYXRlOnNoaWVsZHMgZGVsZXRlOnNoaWVsZHMgcmVhZDphbm9tYWx5X2Jsb2NrcyBkZWxldGU6YW5vbWFseV9ibG9ja3MgdXBkYXRlOnRyaWdnZXJzIHJlYWQ6dHJpZ2dlcnMgcmVhZDpncmFudHMgZGVsZXRlOmdyYW50cyByZWFkOmd1YXJkaWFuX2ZhY3RvcnMgdXBkYXRlOmd1YXJkaWFuX2ZhY3RvcnMgcmVhZDpndWFyZGlhbl9lbnJvbGxtZW50cyBkZWxldGU6Z3VhcmRpYW5fZW5yb2xsbWVudHMgY3JlYXRlOmd1YXJkaWFuX2Vucm9sbG1lbnRfdGlja2V0cyByZWFkOnVzZXJfaWRwX3Rva2VucyBjcmVhdGU6cGFzc3dvcmRzX2NoZWNraW5nX2pvYiBkZWxldGU6cGFzc3dvcmRzX2NoZWNraW5nX2pvYiByZWFkOmN1c3RvbV9kb21haW5zIGRlbGV0ZTpjdXN0b21fZG9tYWlucyBjcmVhdGU6Y3VzdG9tX2RvbWFpbnMgdXBkYXRlOmN1c3RvbV9kb21haW5zIHJlYWQ6ZW1haWxfdGVtcGxhdGVzIGNyZWF0ZTplbWFpbF90ZW1wbGF0ZXMgdXBkYXRlOmVtYWlsX3RlbXBsYXRlcyByZWFkOm1mYV9wb2xpY2llcyB1cGRhdGU6bWZhX3BvbGljaWVzIHJlYWQ6cm9sZXMgY3JlYXRlOnJvbGVzIGRlbGV0ZTpyb2xlcyB1cGRhdGU6cm9sZXMgcmVhZDpwcm9tcHRzIHVwZGF0ZTpwcm9tcHRzIHJlYWQ6YnJhbmRpbmcgdXBkYXRlOmJyYW5kaW5nIGRlbGV0ZTpicmFuZGluZyByZWFkOmxvZ19zdHJlYW1zIGNyZWF0ZTpsb2dfc3RyZWFtcyBkZWxldGU6bFAnX3N0cmVhbXMgdXBkYXRlOmxvZ19zdHJlYW1zIGNyZWF0ZTpzaWduaW5nX2tleXMgcmVhZDpzaWduaW5nX2tleXMgdXBkYXRlOnNpZ25pbmdfa2V5cyByZWAkOmxpbWl0cyB1cGRhdGU6bGltaXRzIGNyZWF0ZTpyb2xlX21lbWJlcnMgcmVhZDpyb2xlX21lbWJlcnMgZGVsZXRlOnJvbGVfbWVtYmVycyByZWFkOmVudGl0bGVtZW50cyByZWFkOmF0dGFja19wcm90ZWN0aW9uIHVwZGF0ZTphdHRhY2tfcHJvdGVjdGlvbiByZWFkOm9yZ2FuaXphdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbnMgZGVsZXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcnMgZGVsZXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIGNyZWF0ZTpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgcmVhZDpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbl9jb25uZWN0aW9ucyBkZWxldGU6b3JnYW5pemF0aW9uX2Nvbm5lY3Rpb25zIGNyZWF0ZTpvcmdhbml6YXRpb25fbWVtYmVyX3JvbGVzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBkZWxldGU6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBjcmVhdGU6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIHJlYWQ6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIGRlbGV0ZTpvcmdhbml6YXRpb25faW52aXRhdGlvbnMiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMifQ.latRl-9i4A_JvqeUUsugIFDqTC-F-x7qdG08vRH7N7Y7ztqVQgjFg8t4-u7Ov2pFxUtSZvruMazpXNb86V4mNBQr5S7h4nQRCPVB5zL1uwwUjhz8S9_99m9TNDuCr5TkFC1yDDYFtpLhrjsiEPBwHxbPIIljrk1efupYBjv59Jpfm6MrCI2H3C8qLObouGIlewiiJW-ulsmdIail-1UhVLn3ZuOMYw4-q7NZny2VwaqD-nypeMCYRNF5hT_itzvNV7za7uHbfwf9TSPnYgB7RuguuRwErvvXqtDT2v_lGI43rfo64IHF0g_4HRMGIOj6elySubWICYNgJuCl-Tc96y`,
  tokenValid: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkRJenpXZWdhd1VFZ1REbFV0cFdRYyJ9.eyJpc3MiOiJodHRwczovL3N0YWdpbmcteW91ci1icmFuZC51cy5hdXRoMC5jb20vIiwic3ViIjoiRFUzamdmSmFHSG1yV29MTmhxQngzQ0k4bnNXbzVMeExAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vc3RhZ2luZy15b3VyLWJyYW5kLnVzLmF1dGgwLmNvbS9hcGkvdjIvIiwiaWF0IjoxNjQ1NDc3NTQ3LCJleHAiOjE2NDU1NjM5NDcsImF6cCI6IkRVM2pnZkphR0htcldvTE5ocUJ4M0NJOG5zV281THhMIiwic2NvcGUiOiJyZWFkOmNsaWVudF9ncmFudHMgY3JlYXRlOmNsaWVudF9ncmFudHMgZGVsZXRlOmNsaWVudF9ncmFudHMgdXBkYXRlOmNsaWVudF9ncmFudHMgcmVhZDp1c2VycyB1cGRhdGU6dXNlcnMgZGVsZXRlOnVzZXJzIGNyZWF0ZTp1c2VycyByZWFkOnVzZXJzX2FwcF9tZXRhZGF0YSB1cGRhdGU6dXNlcnNfYXBwX21ldGFkYXRhIGRlbGV0ZTp1c2Vyc19hcHBfbWV0YWRhdGEgY3JlYXRlOnVzZXJzX2FwcF9tZXRhZGF0YSByZWFkOnVzZXJfY3VzdG9tX2Jsb2NrcyBjcmVhdGU6dXNlcl9jdXN0b21fYmxvY2tzIGRlbGV0ZTp1c2VyX2N1c3RvbV9ibG9ja3MgY3JlYXRlOnVzZXJfdGlja2V0cyByZWFkOmNsaWVudHMgdXBkYXRlOmNsaWVudHMgZGVsZXRlOmNsaWVudHMgY3JlYXRlOmNsaWVudHMgcmVhZDpjbGllbnRfa2V5cyB1cGRhdGU6Y2xpZW50X2tleXMgZGVsZXRlOmNsaWVudF9rZXlzIGNyZWF0ZTpjbGllbnRfa2V5cyByZWFkOmNvbm5lY3Rpb25zIHVwZGF0ZTpjb25uZWN0aW9ucyBkZWxldGU6Y29ubmVjdGlvbnMgY3JlYXRlOmNvbm5lY3Rpb25zIHJlYWQ6cmVzb3VyY2Vfc2VydmVycyB1cGRhdGU6cmVzb3VyY2Vfc2VydmVycyBkZWxldGU6cmVzb3VyY2Vfc2VydmVycyBjcmVhdGU6cmVzb3VyY2Vfc2VydmVycyByZWFkOmRldmljZV9jcmVkZW50aWFscyB1cGRhdGU6ZGV2aWNlX2NyZWRlbnRpYWxzIGRlbGV0ZTpkZXZpY2VfY3JlZGVudGlhbHMgY3JlYXRlOmRldmljZV9jcmVkZW50aWFscyByZWFkOnJ1bGVzIHVwZGF0ZTpydWxlcyBkZWxldGU6cnVsZXMgY3JlYXRlOnJ1bGVzIHJlYWQ6cnVsZXNfY29uZmlncyB1cGRhdGU6cnVsZXNfY29uZmlncyBkZWxldGU6cnVsZXNfY29uZmlncyByZWFkOmhvb2tzIHVwZGF0ZTpob29rcyBkZWxldGU6aG9va3MgY3JlYXRlOmhvb2tzIHJlYWQ6YWN0aW9ucyB1cGRhdGU6YWN0aW9ucyBkZWxldGU6YWN0aW9ucyBjcmVhdGU6YWN0aW9ucyByZWFkOmVtYWlsX3Byb3ZpZGVyIHVwZGF0ZTplbWFpbF9wcm92aWRlciBkZWxldGU6ZW1haWxfcHJvdmlkZXIgY3JlYXRlOmVtYWlsX3Byb3ZpZGVyIGJsYWNrbGlzdDp0b2tlbnMgcmVhZDpzdGF0cyByZWFkOmluc2lnaHRzIHJlYWQ6dGVuYW50X3NldHRpbmdzIHVwZGF0ZTp0ZW5hbnRfc2V0dGluZ3MgcmVhZDpsb2dzIHJlYWQ6bG9nc191c2VycyByZWFkOnNoaWVsZHMgY3JlYXRlOnNoaWVsZHMgdXBkYXRlOnNoaWVsZHMgZGVsZXRlOnNoaWVsZHMgcmVhZDphbm9tYWx5X2Jsb2NrcyBkZWxldGU6YW5vbWFseV9ibG9ja3MgdXBkYXRlOnRyaWdnZXJzIHJlYWQ6dHJpZ2dlcnMgcmVhZDpncmFudHMgZGVsZXRlOmdyYW50cyByZWFkOmd1YXJkaWFuX2ZhY3RvcnMgdXBkYXRlOmd1YXJkaWFuX2ZhY3RvcnMgcmVhZDpndWFyZGlhbl9lbnJvbGxtZW50cyBkZWxldGU6Z3VhcmRpYW5fZW5yb2xsbWVudHMgY3JlYXRlOmd1YXJkaWFuX2Vucm9sbG1lbnRfdGlja2V0cyByZWFkOnVzZXJfaWRwX3Rva2VucyBjcmVhdGU6cGFzc3dvcmRzX2NoZWNraW5nX2pvYiBkZWxldGU6cGFzc3dvcmRzX2NoZWNraW5nX2pvYiByZWFkOmN1c3RvbV9kb21haW5zIGRlbGV0ZTpjdXN0b21fZG9tYWlucyBjcmVhdGU6Y3VzdG9tX2RvbWFpbnMgdXBkYXRlOmN1c3RvbV9kb21haW5zIHJlYWQ6ZW1haWxfdGVtcGxhdGVzIGNyZWF0ZTplbWFpbF90ZW1wbGF0ZXMgdXBkYXRlOmVtYWlsX3RlbXBsYXRlcyByZWFkOm1mYV9wb2xpY2llcyB1cGRhdGU6bWZhX3BvbGljaWVzIHJlYWQ6cm9sZXMgY3JlYXRlOnJvbGVzIGRlbGV0ZTpyb2xlcyB1cGRhdGU6cm9sZXMgcmVhZDpwcm9tcHRzIHVwZGF0ZTpwcm9tcHRzIHJlYWQ6YnJhbmRpbmcgdXBkYXRlOmJyYW5kaW5nIGRlbGV0ZTpicmFuZGluZyByZWFkOmxvZ19zdHJlYW1zIGNyZWF0ZTpsb2dfc3RyZWFtcyBkZWxldGU6bG9nX3N0cmVhbXMgdXBkYXRlOmxvZ19zdHJlYW1zIGNyZWF0ZTpzaWduaW5nX2tleXMgcmVhZDpzaWduaW5nX2tleXMgdXBkYXRlOnNpZ25pbmdfa2V5cyByZWFkOmxpbWl0cyB1cGRhdGU6bGltaXRzIGNyZWF0ZTpyb2xlX21lbWJlcnMgcmVhZDpyb2xlX21lbWJlcnMgZGVsZXRlOnJvbGVfbWVtYmVycyByZWFkOmVudGl0bGVtZW50cyByZWFkOmF0dGFja19wcm90ZWN0aW9uIHVwZGF0ZTphdHRhY2tfcHJvdGVjdGlvbiByZWFkOm9yZ2FuaXphdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbnMgZGVsZXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcnMgZGVsZXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIGNyZWF0ZTpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgcmVhZDpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbl9jb25uZWN0aW9ucyBkZWxldGU6b3JnYW5pemF0aW9uX2Nvbm5lY3Rpb25zIGNyZWF0ZTpvcmdhbml6YXRpb25fbWVtYmVyX3JvbGVzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBkZWxldGU6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBjcmVhdGU6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIHJlYWQ6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIGRlbGV0ZTpvcmdhbml6YXRpb25faW52aXRhdGlvbnMiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMifQ.latRl-9i4A_JvqeUUsugIFDqTC-F-x7qdG08vRH7N7Y7ztqVQgjFg8t4-u7Ov2pFxUtSZvruMazpXNb86V4mNBQr5S7h4nQRCPVB5zL1uwwUjhz8S9_99m9TNDuCr5TkFC1yDDYFtpLhrjsiEPBwHxbPIIljrk1efupYBjv59Jpfm6MrCI2H3C8qLObouGIlewiiJW-ulsmdIail-1UhVLn3ZuOMYw4-q7NZny2VwaqD-nypeMCYRNF5hT_itzvNV7za7uHbfwf9TSPnYgB7RuguuRwErvvXqtDT2v_lGI43rfo64IHF0g_4HRMGIOj6elySubWICYNgJuCl-Tc96w`,
  company_id: '60ca0314024cb700062a6ab8',
  user_id: '69cae314053cb800062a2abc',
  responseWithCompany: {
    active: true,
    user_profiles: [],
    organization_profiles: [
      {
        external_profile_id: '60ca0314024cb700062a6ab8'
      }
    ]
  },
  responseWithCompanyAndUser: {
    active: true,
    user_profiles: [
      {
        external_profile_id: '69cae314053cb800062a2abc'
      }
    ],
    organization_profiles: [
      {
        external_profile_id: '60ca0314024cb700062a6ab8'
      }
    ]
  }
}

describe('Authenticator', () => {
  const req = {
    authorization: {
      basic: {
        username: 'jwt'
      }
    },
    get: () => {},
    set: () => {}
  }

  describe('authenticator', () => {
    it('expect to call identityBearerToken when AuthenticationMethod is Bearer', async () => {
      const req = {
        authorization: {
          scheme: 'Bearer'
        }
      }
      const res = null
      const next = () => {}
      const identityBearerTokenStub = sinon.stub(
        IdentityAuthenticator,
        'identityBearerToken'
      )

      authenticator(req, res, next)

      expect(identityBearerTokenStub.called).to.be.true
      expect(identityBearerTokenStub.callCount).to.be.eq(1)

      const [
        returnedReq,
        returnedRes,
        returnedNext
      ] = identityBearerTokenStub.args[0]
      expect(req).to.be.deep.eq(returnedReq)
      expect(res).to.be.deep.eq(returnedRes)
      expect(next).to.be.deep.eq(returnedNext)

      identityBearerTokenStub.restore()
    })
  })

  describe('jwtToken', () => {
    beforeEach(() => {
      sinon.spy(req, 'set')
    })

    afterEach(() => {
      req.set.restore()
    })

    it('should check a valid token', () => {
      const next = sinon.spy()

      req.authorization.basic.password = validJwtToken

      jwtToken(req, {}, next)

      const setCompanyCall = req.set.getCall(0)
      const setUserCall = req.set.getCall(1)
      const setAuthMethod = req.set.getCall(2)

      expect(next.called).to.be.true
      expect(setCompanyCall.args).to.deep.equal([
        'company',
        {
          id: content.company.id,
          _id: content.company.id
        }
      ])
      expect(setUserCall.args).to.deep.equal([
        'user',
        {
          id: content.user.id,
          _id: content.user.id
        }
      ])
      expect(setAuthMethod.args).to.deep.equal(['authenticationMethod', 'jwt'])
    })

    it('should check and get a error to invalid token', () => {
      const next = sinon.spy()

      req.authorization.basic.password = invalidJwtToken

      jwtToken(req, {}, next)

      expect(next.called).to.be.true
      expect(next.getCall(0).args[0]).to.be.an.instanceOf(UnauthenticatedError)
    })
  })

  describe('identityBearerToken', () => {
    const createReq = token => ({
      credentials: token,
      get: () => {},
      set: () => {}
    })

    it('expect to be a valid token and return a company', async () => {
      const req = createReq(IdentityContext.tokenValid)
      sinon.spy(req, 'set')

      const next = sinon.mock()
      const introspectTokenMock = sinon
        .mock()
        .resolves(Promise.resolve(IdentityContext.responseWithCompany))

      const identityClientCreateStub = sinon
        .stub(IdentityClient, 'create')
        .returns({
          introspectToken: introspectTokenMock
        })

      const getUserAndCompanyStub = sinon
        .stub(IdentityAuthenticator, 'getUserAndCompany')
        .resolves(
          Promise.resolve({
            user: null,
            company: { _id: IdentityContext.company_id }
          })
        )

      await IdentityAuthenticator.identityBearerToken(req, null, next)

      expect(getUserAndCompanyStub.called).to.be.true
      expect(getUserAndCompanyStub.callCount).to.be.eq(1)

      expect(req.set.called).to.be.true
      expect(req.set.callCount).to.be.eq(2)

      const [companyTag, companyValue] = req.set.args[0]
      expect(companyTag).to.be.eq('company')
      expect(companyValue).to.be.an('object')
      expect(companyValue).to.have.keys(['id', '_id'])
      expect(companyValue.id).to.be.eq(IdentityContext.company_id)
      expect(companyValue._id).to.be.eq(IdentityContext.company_id)

      const [authMethodTag, authMethodValue] = req.set.args[1]
      expect(authMethodTag).to.be.eq('authenticationMethod')
      expect(authMethodValue).to.be.eq('bearer')

      expect(next.called).to.be.true
      expect(next.callCount).to.be.eq(1)
      expect(identityClientCreateStub.called).to.be.true
      expect(identityClientCreateStub.callCount).to.be.eq(1)
      expect(introspectTokenMock.called).to.be.true
      expect(introspectTokenMock.callCount).to.be.eq(1)

      identityClientCreateStub.restore()
      getUserAndCompanyStub.restore()
    })

    it('expect to be a valid token and return a company and an user', async () => {
      const req = createReq(IdentityContext.tokenValid)
      sinon.spy(req, 'set')

      const next = sinon.mock()
      const introspectTokenMock = sinon
        .mock()
        .resolves(Promise.resolve(IdentityContext.responseWithCompanyAndUser))

      const identityClientCreateStub = sinon
        .stub(IdentityClient, 'create')
        .returns({
          introspectToken: introspectTokenMock
        })

      const getUserAndCompanyStub = sinon
        .stub(IdentityAuthenticator, 'getUserAndCompany')
        .resolves(
          Promise.resolve({
            user: { _id: IdentityContext.user_id },
            company: { _id: IdentityContext.company_id }
          })
        )

      await IdentityAuthenticator.identityBearerToken(req, null, next)

      expect(getUserAndCompanyStub.called).to.be.true
      expect(getUserAndCompanyStub.callCount).to.be.eq(1)

      expect(req.set.called).to.be.true
      expect(req.set.callCount).to.be.eq(3)

      const [userTag, userValue] = req.set.args[0]
      expect(userTag).to.be.eq('user')
      expect(userValue).to.be.an('object')
      expect(userValue).to.have.keys(['id', '_id'])
      expect(userValue.id).to.be.eq(IdentityContext.user_id)
      expect(userValue._id).to.be.eq(IdentityContext.user_id)

      const [companyTag, companyValue] = req.set.args[1]
      expect(companyTag).to.be.eq('company')
      expect(companyValue).to.be.an('object')
      expect(companyValue).to.have.keys(['id', '_id'])
      expect(companyValue.id).to.be.eq(IdentityContext.company_id)
      expect(companyValue._id).to.be.eq(IdentityContext.company_id)

      const [authMethodTag, authMethodValue] = req.set.args[2]
      expect(authMethodTag).to.be.eq('authenticationMethod')
      expect(authMethodValue).to.be.eq('bearer')

      expect(next.called).to.be.true
      expect(next.callCount).to.be.eq(1)
      expect(identityClientCreateStub.called).to.be.true
      expect(identityClientCreateStub.callCount).to.be.eq(1)
      expect(introspectTokenMock.called).to.be.true
      expect(introspectTokenMock.callCount).to.be.eq(1)

      identityClientCreateStub.restore()
      getUserAndCompanyStub.restore()
    })

    it('expect to throws an error with invalid token', async () => {
      const req = createReq(IdentityContext.tokenWithInvalidFormat)
      const expectedInstropectTokenError = new Error('Invalid Token')

      const spyLogError = sinon.spy(IdentityAuthenticator.Logger, 'error')

      const next = sinon.mock()
      const introspectTokenMock = sinon
        .mock()
        .rejects(expectedInstropectTokenError)

      const identityClientCreateStub = sinon
        .stub(IdentityClient, 'create')
        .returns({
          introspectToken: introspectTokenMock
        })

      await IdentityAuthenticator.identityBearerToken(req, null, next)

      expect(next.called).to.be.true
      expect(next.callCount).to.be.eq(1)
      expect(introspectTokenMock.called).to.be.true
      expect(introspectTokenMock.callCount).to.be.eq(1)

      expect(spyLogError.called).to.be.true
      expect(spyLogError.callCount).to.be.eq(1)

      const [logParams, logTag] = spyLogError.getCall(0).args
      expect(logParams).to.be.an('object')
      expect(logParams).to.have.key('err')
      expect(logParams.err).to.be.eq(expectedInstropectTokenError)
      expect(logTag).to.be.eq('jwt-identity-api-middleware-failed')

      expect(next.getCall(0).args[0]).to.be.an.instanceOf(UnauthenticatedError)

      identityClientCreateStub.restore()
      spyLogError.restore()
    })

    it('expect to throws an error with inactive token', async () => {
      const req = createReq(IdentityContext.tokenInactive)
      const expectedInstropectTokenError = new Error('Token inactive')

      const spyLogError = sinon.spy(IdentityAuthenticator.Logger, 'error')

      const next = sinon.mock()
      const introspectTokenMock = sinon
        .mock()
        .rejects(expectedInstropectTokenError)

      const identityClientCreateStub = sinon
        .stub(IdentityClient, 'create')
        .returns({
          introspectToken: introspectTokenMock
        })

      await IdentityAuthenticator.identityBearerToken(req, null, next)

      expect(next.called).to.be.true
      expect(next.callCount).to.be.eq(1)
      expect(introspectTokenMock.called).to.be.true
      expect(introspectTokenMock.callCount).to.be.eq(1)

      expect(spyLogError.called).to.be.true
      expect(spyLogError.callCount).to.be.eq(1)

      const [logParams, logTag] = spyLogError.getCall(0).args
      expect(logParams).to.be.an('object')
      expect(logParams).to.have.key('err')
      expect(logParams.err).to.be.eq(expectedInstropectTokenError)
      expect(logTag).to.be.eq('jwt-identity-api-middleware-failed')

      expect(next.getCall(0).args[0]).to.be.an.instanceOf(UnauthenticatedError)

      identityClientCreateStub.restore()
      spyLogError.restore()
    })

    it("expect to throws an error when company doesn't exist", async () => {
      const req = createReq(IdentityContext.tokenValid)
      const expectedGetCompanyErrorMessage = `Company doesn't exist`

      const spyLogError = sinon.spy(IdentityAuthenticator.Logger, 'error')

      const next = sinon.mock()
      const introspectTokenMock = sinon
        .mock()
        .resolves(Promise.resolve(IdentityContext.responseWithCompany))

      const identityClientCreateStub = sinon
        .stub(IdentityClient, 'create')
        .returns({
          introspectToken: introspectTokenMock
        })

      const getCompanyStub = sinon
        .stub(IdentityAuthenticator, 'getCompany')
        .resolves(Promise.resolve(null))

      const getUserStub = sinon
        .stub(IdentityAuthenticator, 'getUser')
        .resolves(Promise.resolve(null))

      const getUserAndCompanyStub = sinon.spy(
        IdentityAuthenticator,
        'getUserAndCompany'
      )

      await IdentityAuthenticator.identityBearerToken(req, null, next)

      expect(getCompanyStub.called).to.be.true
      expect(getCompanyStub.callCount).to.be.eq(1)
      expect(getUserStub.called).to.be.true
      expect(getUserStub.callCount).to.be.eq(1)
      expect(getUserAndCompanyStub.called).to.be.true
      expect(getUserAndCompanyStub.callCount).to.be.eq(1)

      expect(next.called).to.be.true
      expect(next.callCount).to.be.eq(1)
      expect(introspectTokenMock.called).to.be.true
      expect(introspectTokenMock.callCount).to.be.eq(1)

      expect(spyLogError.called).to.be.true
      expect(spyLogError.callCount).to.be.eq(1)

      const [logParams, logTag] = spyLogError.getCall(0).args
      expect(logParams).to.be.an('object')
      expect(logParams).to.have.key('err')
      expect(logParams.err.message).to.be.eq(expectedGetCompanyErrorMessage)
      expect(logTag).to.be.eq('jwt-identity-api-middleware-failed')

      expect(next.getCall(0).args[0]).to.be.an.instanceOf(UnauthenticatedError)

      getCompanyStub.restore()
      getUserStub.restore()
      getUserAndCompanyStub.restore()
      identityClientCreateStub.restore()
      spyLogError.restore()
    })

    it("expect to throws an error when company and user doesn't exist", async () => {
      const req = createReq(IdentityContext.tokenValid)
      const expectedErrorMessage = `User and company doesn't exist`

      const spyLogError = sinon.spy(IdentityAuthenticator.Logger, 'error')

      const next = sinon.mock()
      const introspectTokenMock = sinon
        .mock()
        .resolves(Promise.resolve(IdentityContext.responseWithCompanyAndUser))

      const identityClientCreateStub = sinon
        .stub(IdentityClient, 'create')
        .returns({
          introspectToken: introspectTokenMock
        })

      const getCompanyStub = sinon
        .stub(IdentityAuthenticator, 'getCompany')
        .resolves(Promise.resolve(null))

      const getUserStub = sinon
        .stub(IdentityAuthenticator, 'getUser')
        .resolves(Promise.resolve(null))

      const getUserAndCompanyStub = sinon.spy(
        IdentityAuthenticator,
        'getUserAndCompany'
      )

      await IdentityAuthenticator.identityBearerToken(req, null, next)

      expect(getCompanyStub.called).to.be.true
      expect(getCompanyStub.callCount).to.be.eq(1)

      expect(getUserStub.called).to.be.true
      expect(getUserStub.callCount).to.be.eq(1)

      expect(getUserAndCompanyStub.called).to.be.true
      expect(getUserAndCompanyStub.callCount).to.be.eq(1)

      expect(next.called).to.be.true
      expect(next.callCount).to.be.eq(1)
      expect(introspectTokenMock.called).to.be.true
      expect(introspectTokenMock.callCount).to.be.eq(1)

      expect(spyLogError.called).to.be.true
      expect(spyLogError.callCount).to.be.eq(1)

      const [logParams, logTag] = spyLogError.getCall(0).args
      expect(logParams).to.be.an('object')
      expect(logParams).to.have.key('err')
      expect(logParams.err.message).to.be.eq(expectedErrorMessage)
      expect(logTag).to.be.eq('jwt-identity-api-middleware-failed')

      expect(next.getCall(0).args[0]).to.be.an.instanceOf(UnauthenticatedError)

      getCompanyStub.restore()
      getUserStub.restore()
      getUserAndCompanyStub.restore()
      identityClientCreateStub.restore()
      spyLogError.restore()
    })
  })
})
