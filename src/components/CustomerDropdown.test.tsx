import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomerDropdown } from './CustomerDropdown'

const customers = ['WM', 'TG', 'Sally', 'CVS', 'WG', 'Ulta']

describe('CustomerDropdown', () => {
  it('renders selected customer tags', () => {
    render(
      <CustomerDropdown
        allCustomers={customers}
        selected={['WM', 'TG']}
        onChange={() => {}}
      />
    )
    expect(screen.getByText('WM')).toBeInTheDocument()
    expect(screen.getByText('TG')).toBeInTheDocument()
  })

  it('calls onChange with customer removed when tag × is clicked', () => {
    const onChange = vi.fn()
    render(
      <CustomerDropdown
        allCustomers={customers}
        selected={['WM', 'TG']}
        onChange={onChange}
      />
    )
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith(['TG'])
  })

  it('shows placeholder when no customers selected', () => {
    render(
      <CustomerDropdown
        allCustomers={customers}
        selected={[]}
        onChange={() => {}}
      />
    )
    expect(screen.getByText(/all customers/i)).toBeInTheDocument()
  })

  it('calls onChange with all customers when Select All is clicked', () => {
    const onChange = vi.fn()
    const { getByText } = render(
      <CustomerDropdown
        allCustomers={customers}
        selected={[]}
        onChange={onChange}
      />
    )
    // Open dropdown
    fireEvent.click(getByText(/all customers/i))
    // Click Select All
    fireEvent.click(getByText('Select All'))
    expect(onChange).toHaveBeenCalledWith(customers)
  })
})
