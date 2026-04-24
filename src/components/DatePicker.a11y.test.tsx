import { render } from '@testing-library/react'
import { describe, it } from 'vitest'
import { DatePicker } from './DatePicker'
import { expectNoA11yViolations } from '../test/axe-helper'

describe('DatePicker a11y', () => {
  it('renders trigger button with no violations', async () => {
    const { container } = render(
      <DatePicker
        value="2026-04-12"
        onChange={() => {}}
        min="2023-06-12"
        max="2026-04-24"
      />,
    )
    await expectNoA11yViolations(container)
  })
})
