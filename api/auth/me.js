import { route, send } from '../_lib/http.js'
import { currentUser, publicUser } from '../_lib/auth.js'

export default route(['GET'], async (req, res) => {
  const user = await currentUser(req)
  send(res, 200, { user: user ? publicUser(user) : null })
})
