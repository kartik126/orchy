import { Router } from 'express'
import { getToolNames } from '../runtime/toolRegistry'

const router = Router()

router.get('/', (req, res) => {
  res.json(getToolNames())
})

export default router
