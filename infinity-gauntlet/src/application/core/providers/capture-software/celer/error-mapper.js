import { cond, equals, always, T } from 'ramda'
import CelerCommunicationFailureError from 'application/core/errors/celer-communication-failure-error'
import CelerUnableToCreateMerchant from 'application/core/errors/celer-unable-to-create-merchant'
import CelerUnableToCreateTerminal from 'application/core/errors/celer-unable-to-create-terminal'
import CelerUnableToLinkTerminal from 'application/core/errors/celer-unable-to-link-terminal'
import CelerUnableToUnlinkTerminal from 'application/core/errors/celer-unable-to-unlink-terminal'
import CelerTerminalAlreadyLinked from 'application/core/errors/celer-terminal-already-linked'
import CelerNoTerminalFound from 'application/core/errors/celer-no-terminal-found'
import CelerUnableToListTransactions from 'application/core/errors/celer-unable-to-list-transactions'
import CelerUnableToGetMerchantData from 'application/core/errors/celer-unable-to-get-merchant-data'
import CelerUnableToGetTerminalData from 'application/core/errors/celer-unable-to-get-terminal-data'
import CelerGenericError from 'application/core/errors/celer-generic-error'

export default function celerErrorMapper(locale, error) {
  return cond([
    [equals('CEL-0001'), always(new CelerCommunicationFailureError(locale))],
    [equals('CEL-0002'), always(new CelerUnableToCreateMerchant(locale))],
    [equals('CEL-0003'), always(new CelerUnableToCreateTerminal(locale))],
    // We skip CEL-0004 because TIDS are created manually currently.
    [equals('CEL-0005'), always(new CelerUnableToLinkTerminal(locale))],
    [equals('CEL-0006'), always(new CelerTerminalAlreadyLinked(locale))],
    [equals('CEL-0007'), always(new CelerNoTerminalFound(locale))],
    [equals('CEL-0008'), always(new CelerUnableToUnlinkTerminal(locale))],
    [equals('CEL-0009'), always(new CelerUnableToListTransactions(locale))],
    [equals('CEL-0010'), always(new CelerUnableToGetMerchantData(locale))],
    [equals('CEL-0012'), always(new CelerUnableToGetTerminalData(locale))],
    [T, always(new CelerGenericError(locale, { message: '' }))]
  ])(error.code)
}
