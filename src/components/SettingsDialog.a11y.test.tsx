import { render } from '@testing-library/react'
import { describe, it } from 'vitest'
import { SettingsDialog } from './SettingsDialog'
import { expectNoA11yViolations } from '../test/axe-helper'

describe('SettingsDialog a11y', () => {
  it('renders open dialog with no violations', async () => {
    const { baseElement } = render(
      <SettingsDialog
        open={true}
        onOpenChange={() => {}}
        sources={[
          { key: 'merriam-webster', label: 'Merriam-Webster' },
          { key: 'dictionary', label: 'Wiktionary' },
          { key: 'wikipedia', label: 'Wikipedia' },
        ]}
      />,
    )
    await expectNoA11yViolations(baseElement)
  })
})
