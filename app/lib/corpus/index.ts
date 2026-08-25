import * as archive from "./archive"
import * as history from "./history"
import * as convert from "./convert"
import * as explore from "./explore"

export * from "./constants"
export * from "./types"
export * from "./utils"

const Corpus = {
    Archive: archive,
    History: history,
    Convert: convert,
    Explore: explore,
}
export default Corpus
