import React from 'react'
import { cn } from '@/lib/utils'
import { type ButtonProps, Button } from "@exegia/corpora-ui"
import { Group, GroupSeparator, GroupText } from "@/components/ui/group";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react"

// glassVariant is omitted along with variant: ButtonProps is a discriminated
// union where only `variant: "glass"` accepts it, and this narrower variant
// set never does.
export type MetadataAction = Omit<ButtonProps, "children" | "variant" | "glassVariant"> & { label?: string, icon?: React.ReactNode, variant?: 'default' | 'ghost' | 'outline' }

export type MetadataProps = {
  label: string
  value?: string | React.ReactNode | null
  actions?: Array<MetadataAction> | MetadataAction
  direction?: "row" | "column"
}

const ActionButton = ({ label, icon, variant = 'outline', ...props }: MetadataAction) => {
  return <>
     <GroupSeparator />
     <Button {...props} variant={variant}>{icon}{label}</Button>
  </>
}

const ActionGroup = ({ actions }: { actions: Array<MetadataAction> }) => {
  return actions.map((buttonProps, index) =>
    <ActionButton key={index} {...buttonProps} />
  )
}

const MetadataBlock = ({ label, value, actions, direction = "row" }: MetadataProps) => {

  if (direction === "row") {
    return (
      <Group aria-label="Domain input" className="w-full flex flex-row flex-1 min-h-9">
        <GroupText className="flex-1">
          {label}
        </GroupText>
        <GroupSeparator />
        <GroupText className="flex-1 text-primary">
          {value}
        </GroupText>
        {actions && Array.isArray(actions) ?
          <ActionGroup actions={actions} /> :
          <ActionButton {...actions} />
        }
      </Group>
    )
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
