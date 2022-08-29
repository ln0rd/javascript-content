import cuid from 'cuid'

export default function getUniqueId() {
  return cuid() + cuid()
}
