import {
    Card,
    CardFrame,
    CardFrameAction,
    CardFrameDescription,
    CardFrameHeader,
    CardFrameTitle,
    CardPanel,
} from "@/components/ui/card"
import LinkPicker from "@/components/project/corpus/link-picker"
import List from "@/components/project/corpus/list"
import type { ReferencesProps } from "@/components/project/corpus/types"

/**
 * The project's corpus references (003) in a CardFrame, like the Corpus
 * panel: library corpora loaded alongside this dataset. The picker stays
 * rendered but disabled when the project is read-only.
 */
export default function References({ corpora, options, readOnly }: ReferencesProps) {
    return (
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>References</CardFrameTitle>
                <CardFrameDescription>Library corpora loaded alongside this dataset.</CardFrameDescription>
                <CardFrameAction>
                    <LinkPicker options={options} disabled={readOnly} />
                </CardFrameAction>
            </CardFrameHeader>
            <Card>
                <CardPanel>
                    <List corpora={corpora} readOnly={readOnly} />
                </CardPanel>
            </Card>
        </CardFrame>
    )
}
