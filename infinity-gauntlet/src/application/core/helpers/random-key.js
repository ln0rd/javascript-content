export default function randomKey(length) {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let randomKey = ''

  for (let i = 0; i < length; i += 1) {
    randomKey += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return randomKey
}
