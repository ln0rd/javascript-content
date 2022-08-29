import AcquirerInterface from 'application/core/interfaces/acquirer'
import PagsAcquirer from 'application/core/providers/acquirers/pags'
import HashAcquirer from 'application/core/providers/acquirers/cardprocessor'
import SubAcquirer from 'application/core/providers/subacquirers/subacquirer'
import SubAcquirerInterface from 'application/core/interfaces/subacquirer'
import InvalidProviderError from 'application/core/errors/invalid-provider-error'
import CaptureSoftwareInterface from 'application/core/interfaces/capture-software'
import CelerCaptureSoftware from 'application/core/providers/capture-software/celer'
import HashCaptureSoftware from 'application/core/providers/capture-software/hash'

export default function connector(locale, provider) {
  switch (provider) {
    case 'pags':
      return new AcquirerInterface(new PagsAcquirer(locale))
    case 'celer':
      return new CaptureSoftwareInterface(new CelerCaptureSoftware(locale))
    case 'hash_capture':
      return new CaptureSoftwareInterface(new HashCaptureSoftware(locale))
    case 'hash':
      return new SubAcquirerInterface(new SubAcquirer(locale))
    case 'cardprocessor':
      return new AcquirerInterface(new HashAcquirer(locale))
    default:
      throw new InvalidProviderError(locale, provider)
  }
}
