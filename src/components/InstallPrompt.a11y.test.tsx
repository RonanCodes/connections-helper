import { render } from '@testing-library/react'
import { describe, it, beforeEach } from 'vitest'
import { InstallPrompt } from './InstallPrompt'
import { expectNoA11yViolations } from '../test/axe-helper'

describe('InstallPrompt a11y', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('renders no violations when banner is visible', async () => {
    window.sessionStorage.setItem('pwa-visit-count', '5')

    const { container } = render(<InstallPrompt />)

    const event = new Event('beforeinstallprompt', {
      bubbles: true,
      cancelable: true,
    }) as Event & {
      prompt?: () => Promise<void>
      userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }
    event.prompt = () => Promise.resolve()
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    window.dispatchEvent(event)

    await new Promise((r) => setTimeout(r, 0))
    await expectNoA11yViolations(container)
  })
})
