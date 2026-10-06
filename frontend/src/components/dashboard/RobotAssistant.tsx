import { createElement, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../../lib/api'
import { useStore } from '../../store/useStore'
import type { ModalType } from '../../store/useStore'

type ChatElement = HTMLElement & { requestAssistant?: typeof fetch; performAction?: (action: unknown) => Promise<string> }
const endpoint = import.meta.env.VITE_ASSISTANT_ENDPOINT || `${(import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '')}/assistant`
const paths: Record<string, string> = { dashboard: '/dashboard', swap: '/dashboard/swap', portfolio: '/dashboard/portfolio', offramp: '/dashboard/offramp' }
const forms = new Set(['send', 'receive', 'scan', 'convert', 'bills'])

export function RobotAssistant() {
  const ref = useRef<ChatElement | null>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const robot = ref.current
    if (!robot) return
    robot.requestAssistant = async (_url, init) => {
      const token = getToken()
      if (!token) throw new Error('Please sign in again to chat with the assistant.')
      const headers = new Headers(init?.headers); headers.set('Authorization', `Bearer ${token}`)
      return fetch(endpoint, { ...init, headers })
    }
    robot.performAction = async raw => {
      if (!getToken()) throw new Error('Please sign in again.')
      if (!raw || typeof raw !== 'object') throw new Error('Invalid app action.')
      const action = raw as Record<string, unknown>
      if (action.kind === 'navigate' && typeof action.target === 'string' && Object.hasOwn(paths, action.target)) {
        navigate(paths[action.target]); return `Opened ${action.target}.`
      }
      if (action.kind === 'open_form' && typeof action.target === 'string' && forms.has(action.target)) {
        useStore.getState().openModal(action.target as ModalType); return `Opened ${action.target} form. Nothing has been submitted.`
      }
      if (action.kind === 'prepare_send' && typeof action.recipientAccountNumber === 'string' && /^\d{10}$/.test(action.recipientAccountNumber) && typeof action.amount === 'number' && Number.isFinite(action.amount) && action.amount >= 1 && action.amount <= 10000000 && Math.abs(action.amount * 100 - Math.round(action.amount * 100)) < 1e-6) {
        useStore.getState().prepareSend({ recipientAccountNumber: action.recipientAccountNumber, amount: action.amount })
        return 'Opened transfer details for review. No money has been sent.'
      }
      throw new Error('This app action is not supported.')
    }
    return () => { delete robot.requestAssistant; delete robot.performAction }
  }, [navigate])
  return createElement('robot-chat', { ref, animated: '', placement: 'left', size: '96', 'assistant-name': 'HashPay Assistant', greeting: 'Hi! I can answer questions, check your account and help you with app tasks. What would you like to do?', endpoint, 'z-index': '35' })
}
