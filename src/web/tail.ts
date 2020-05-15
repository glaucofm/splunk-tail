import {EventType, Frequency, TailConfig, TailRequest, Type} from "../model/types";
import {sendEvent} from "../services/events";
import {TabOptions} from "../services/tabs";
import {createLogView} from "./log-viewer";
import {getSplunkEnv} from "./splunk-env";

export function startTail(tailConfig: TailConfig) {
    let tabId = tailConfig.id.substr(0, 8);
    let options: TabOptions = {
        onLoaderClick: id => changeFrequency(tabId, Frequency.High),
        onRemove: id => removeTail(tabId)
    };
    let tempRowId = createLogView(tabId, tailConfig.search, Type.TAIL, options);
    let request: TailRequest = {
        tabId,
        config: tailConfig,
        env: getSplunkEnv(tailConfig.splunkEnv),
        tempRow: tempRowId
    };
    sendEvent(EventType.TAIL_START, request);
}

function removeTail(tabId: string) {
    sendEvent(EventType.TAIL_END, tabId);
}

function changeFrequency(tabId: string, frequency: Frequency) {
    sendEvent(EventType.SET_FREQUENCY, { tabId, frequency });
}
