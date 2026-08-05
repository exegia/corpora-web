import React from 'react'

export type MetadataProps = {
  label: string
  value?: string | React.ReactNode
  action?: React.ReactNode
}

const MetadataBlock = ({ label, value, action }: MetadataProps) => {
  return (
    <div className="flex items-center justify-between">
      <dl>
        <dt className="font-medium capitalize text-sm text-primary/50">{label}</dt>
        <dd>{value ? React.isValidElement(value) ? value : String(value) : '—'}</dd>
      </dl>
      {action && <div>{action}</div>}
    </div>
  )
}

export default MetadataBlock
