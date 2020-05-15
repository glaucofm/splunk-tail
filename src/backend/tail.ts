import {
    BackendError,
    EventType,
    Frequency,
    GetMoreRowsRequest,
    LogLine,
    QueryResult,
    SplunkLines, SplunkQuery,
    TailInfo,
    TailRequest
} from "../model/types";
import {
    cacheLines,
    filterLines,
    getSplunkQuery,
    loadMoreSearchRows,
    removeLineCache,
    search,
    sendError
} from "./search";

var moment = require('moment');

let window: any;
let tails: TailInfo[] = [];

export function log(...messages: any) {
    console.log(moment().format(), ...messages);
}

export function initTail(iwindow: any) {
    window = iwindow;
    setInterval(async () => { await followAllTails(Frequency.High); }, 5000);
    setInterval(async () => { await followAllTails(Frequency.Low);  }, 60000);
}

export async function addTail(request: TailRequest) {
    let tail: TailInfo = {
        tabId: request.tabId,
        id: request.config.id,
        search: request.config.search + ' ' + request.config.additionalSearch,
        filter: null,
        earliest: '-1d',
        exclusion: request.config.exclusions? request.config.exclusions.split(/ +/).map(x => 'NOT ' + x).join(' ') : '',
        splunkEnv: request.env,
        isLoading: false,
        frequency: Frequency.Low,
        hfCount: 0,
        maxHf: 12,
        maxLines: 200
    };
    tails.push(tail);
    log('Added tail ' + request.config.search);
    await followTail(tail, request.tempRow, true);
}

export async function removeTail(tabId: string) {
    let tail = tails.find(x => x.tabId == tabId);
    if (!tail) {
        return;
    }
    tails = tails.filter(x => x.tabId != tabId);
    removeLineCache(tabId);
    log('Removed tail ' + tail.search);
}

export async function setFrequency(tabId: string, frequency: Frequency) {
    let tail = tails.find(x => x.tabId == tabId);
    tail.hfCount = 0;
    tail.frequency = frequency;
    window.webContents.send(EventType.FREQUENCY_CHANGE, tail.tabId, frequency);
    log('Frequency changed to ' + frequency);
}

async function followAllTails(frequency: Frequency) {
    if (tails.length == 0) {
        return;
    }
    let tail: TailInfo;
    for (tail of tails.filter(x => x.frequency == frequency)) {
        if (tail.isLoading) {
            continue;
        }
        await followTail(tail);
        if (tail.frequency == Frequency.High) {
            tail.hfCount++;
            if (tail.hfCount > tail.maxHf) {
                tail.frequency = Frequency.Low;
                window.webContents.send(EventType.FREQUENCY_CHANGE, tail.tabId, Frequency.Low);
            }
        }
    }
}

async function followTail(tail: TailInfo, tempRow: string = null, isFirstLoad: boolean = false) {
    try {
        if (tail.isLoading) {
            return;
        }
        tail.isLoading = true;
        window.webContents.send(EventType.LOAD_START, tail.tabId);
        let logLines = await getTailLines(tail);
        let tailedData: SplunkLines = {
            tabId: tail.tabId,
            lines: logLines.lines,
            isLoadMore: false,
            tempRow,
            isFirstLoad,
            earliest: logLines.absoluteEarliest
        };
        window.webContents.send(EventType.LOAD_END, tailedData);
        cacheLines(tail.tabId, tailedData.lines, 'after');
    } catch (e) {
        log(e);
        sendError(tail.tabId, e.toString(), tempRow);
    } finally {
        tail.isLoading = false;
    }
}

async function getTailLines(tail: TailInfo): Promise<QueryResult> {
    let query = getSplunkQuery(tail.search, tail.exclusion, tail.earliest, null, tail.maxLines);
    let queryResult = await search(tail.splunkEnv, query);
    tail.earliest = '-5m'; // resetting to -5m
    if (queryResult && queryResult.lines.length) {
        for (let line of queryResult.lines) {
            if (tail.filter && line._raw.toLowerCase().indexOf(tail.filter) < 0) {
                line.filterOut = true;
            }
        }
    }
    return queryResult;
}

export function filterTail(tabId: string, expression: string) {
    tails.find(x => x.tabId == tabId).filter = expression;
    filterLines(tabId, expression);
}

export function cancelFilter(tabId: string) {
    tails.find(x => x.tabId == tabId).filter = null;
}

export async function getMoreTailRows(request: GetMoreRowsRequest) {
    let tail = tails.find(x => x.tabId == request.tabId);
    tail.isLoading = true;
    try {
        let earliest = String(Number(request.latest) - 24*3600);
        let query = getSplunkQuery(tail.search, tail.exclusion, earliest, request.latest, tail.maxLines);
        await loadMoreSearchRows(request.tabId, query, tail.splunkEnv, tail.filter, request.tempRow);
    } finally {
        tail.isLoading = false;
    }
}

