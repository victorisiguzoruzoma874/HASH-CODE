import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { DeepSeekAssistant, chatInput } from '../services/assistant/DeepSeekAssistant'
import { assistantToolDefinitions, executeAssistantTool } from '../services/assistant/AssistantTools'

export const assistantRouter = Router()
assistantRouter.use(requireAuth)
assistantRouter.use(rateLimit({ windowMs: 5 * 60_000, limit: 20, keyGenerator: (req: AuthRequest) => req.user!.id, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many assistant messages. Please wait a few minutes.' } }))
assistantRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = chatInput.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Send up to 24 user/assistant messages, at most 32,000 characters total, ending with a user message.' }); return }
  if (!process.env.DEEPSEEK_API_KEY) { res.status(503).json({ error: 'Assistant is not configured. Set DEEPSEEK_API_KEY on the backend.' }); return }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  const close = () => controller.abort()
  res.on('close', close)
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' }); res.flushHeaders()
  const emit = (event: unknown) => { if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`) }
  const heartbeat = setInterval(() => { if (!res.destroyed) res.write(': heartbeat\n\n') }, 15_000)
  try {
    await new DeepSeekAssistant(assistantToolDefinitions, (name, args) => executeAssistantTool(req.user!.id, name, args)).run(parsed.data, emit, controller.signal)
    if (!res.destroyed) res.write('data: [DONE]\n\n')
  } catch (error) {
    emit({ error: controller.signal.aborted ? 'Assistant response timed out or was cancelled. Please retry.' : error instanceof Error ? error.message : 'Assistant is unavailable. Please retry.' })
  } finally { clearTimeout(timer); clearInterval(heartbeat); res.off('close', close); res.end() }
})
