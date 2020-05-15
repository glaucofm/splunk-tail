import {applyFilterResults} from "../web/filter";
import {processFrequencyChange, processLoadStart, processLoadEnd, addDetailLine, processBackendError, processStatsEnd,} from "../web/log-viewer";
import {EventType} from "../model/types";
const { ipcRenderer} = require("electron");

export function setupEvents() {
    ipcRenderer.on(EventType.LOAD_START, processLoadStart);
    ipcRenderer.on(EventType.LOAD_END, processLoadEnd);
    ipcRenderer.on(EventType.FREQUENCY_CHANGE, processFrequencyChange);
    ipcRenderer.on(EventType.LINE_DETAIL, addDetailLine);
    ipcRenderer.on(EventType.FILTER_RESULT, applyFilterResults);
    ipcRenderer.on(EventType.BACKEND_ERROR, processBackendError);
    ipcRenderer.on(EventType.STATS_END, processStatsEnd);
}

export function sendEvent(type: EventType, data: any = null) {
    ipcRenderer.send(String(type), data);
}
