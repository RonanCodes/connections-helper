import { axe } from 'vitest-axe'
import { expect } from 'vitest'

/**
 * Run axe against a rendered container and assert zero violations. Use
 * inside any component test that covers an interactive surface:
 *   const { container } = render(<MyComponent />)
 *   await expectNoA11yViolations(container)
 */
export async function expectNoA11yViolations(
  container: Element | string,
): Promise<void> {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}
