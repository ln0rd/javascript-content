export function isProviderAllowed(locale, provider) {
  // TODO check dinamically on database
  switch (provider) {
    case 'stone':
      return true
    case 'rede':
      return true
    case 'guichevirtual':
      return true
    case 'hash':
      return true
    case 'cloudwalk':
      return true
    case 'celer':
      return true
    case 'pags':
      return true
    default:
      return false
  }
}
