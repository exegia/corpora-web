import React from 'react'
import { cn } from '@/lib/utils'
import { type ButtonProps, Button } from "@exegia/corpora-ui"
import { Group, GroupSeparator, GroupText } from "@/components/ui/group";
import { Label } from "@/components/ui/label";

// glassVariant is omitted along with variant: ButtonProps is a discriminated
// union where only `variant: "glass"` accepts it, and this narrower variant
// set never does.
export type MetadataAction = Omit<ButtonProps, "children" | "variant" | "glassVariant"> & { label?: string, icon?: React.ReactNode, variant?: 'default' | 'ghost' | 'outline' }

export type MetadataProps = {
  label: string
  value?: string | React.ReactNode | null
  actions?: Array<MetadataAction>
  direction?: "row" | "column"
}

const ActionButton = ({ label, icon, variant = 'ghost', ...props }: MetadataAction) => {
  return <Button {...props} variant={variant}>{icon}{label}</Button>
}

const ActionGroup = ({ actions }: { actions: Array<MetadataAction> }) => {
  return (
    <Group aria-label="File actions">
      {actions.map((buttonProps, index) =>
        <>
          <ActionButton key={index}  {...buttonProps} variant="ghost" />
          {actions.length > 1 && <GroupSeparator />}
        </>
      )}
    </Group>
  )
}

const MetadataBlock = ({ label, value, actions, direction = "row" }: MetadataProps) => {


  if (direction === "row") {
    return (<Group aria-label="Domain input">
      <GroupText render={<Label aria-label="Domain" htmlFor="domain" />}>{value}</GroupText>
       <GroupSeparator />
      {actions && <ActionGroup actions={actions} />}
    </Group>)
  }

  return (
    <div className="flex items-center justify-between gap-x-2 gap-y-0">
    <dl className="flex text-xs flex-row flex-1 justify-between items-center">
        <dt className="font-medium capitalize text-primary/50">{label}</dt>
        <dd>{value ? React.isValidElement(value) ? value : String(value) : <span className="text-muted-foreground capitalize italic">no {label}</span>}</dd>
      </dl>
      {actions ? actions.length > 1 ? <ActionGroup actions={actions} /> : <ActionButton variant="outline" {...actions[0]} /> : null}
    </div>
  )
}

export default MetadataBlock
