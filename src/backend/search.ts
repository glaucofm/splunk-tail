import * as moment from "moment";
import {
    BackendError,
    EventType,
    FilterResponse,
    Frequency, GetLineRequest, GetLineResponse, GetMoreRowsRequest,
    LogLine, QueryResult, SearchInfo,
    SearchRequest,
    SplunkEnv,
    SplunkLines, SplunkQuery, SplunkSearchResultLine,
    TailInfo
} from "../model/types";
import {log} from "./tail";
const fs = require('fs');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

let window: any;
let lines: { [key: string]: LogLine[] } = {};
let searches: { [key: string]: SearchInfo } = {};

export function initSearchModule(iwindow: any) {
    window = iwindow;
}

export async function searchAndStore(request: SearchRequest) {
    window.webContents.send(EventType.LOAD_START, request.tabId);
    searches[request.tabId] = {
        tabId: request.tabId,
        query: request.query,
        filter: null,
        splunkEnv: request.env,
        earliest: request.earliest
    };
    try {
        let logLines = await search(request.env, getSplunkQuery(request.query, null, request.earliest));
        let data: SplunkLines = {
            tabId: request.tabId,
            lines: logLines.lines,
            isLoadMore: false,
            tempRow: request.tempRow,
            isFirstLoad: true,
            earliest: logLines.absoluteEarliest
        };
        if (data.lines && data.lines.length && data.lines[0]['_cd']) {
            cacheLines(request.tabId, data.lines, 'after');
            window.webContents.send(EventType.LOAD_END, data);
        } else {
            window.webContents.send(EventType.STATS_END, data);
        }
    } catch (e) {
        log(e);
        sendError(request.tabId, e.toString(), request.tempRow);
    }
}

export function getSplunkQuery(expression: string, exclusion: string = null, earliest: string = '-1d', latest: string = null, maxLines: number = 200): SplunkQuery {
    if (!expression.match(/\| +stats /) && !expression.match(/\| +table /)) {
        expression =
            'search=search ' + expression + (exclusion? ' ' + exclusion + ' ' : '') +
            '| eval time=_time ' +
            '| sort -_time ' +
            '| head ' + maxLines;
    } else {
        expression = 'search=search ' + expression;
    }
    return { expression, earliest, latest };
}

export function sendLine(tabId: string, lineId: string) {
    log('sendLine', tabId, lineId);
    let response: GetLineResponse = {
        tabId,
        line: lines[tabId].find(x => x._cd == lineId)
    };
    window.webContents.send(EventType.LINE_DETAIL, response);
}

export async function search(splunkEnv: SplunkEnv, query: SplunkQuery, attempt: number = 0): Promise<QueryResult> {
    query.expression +=
        '&output_mode=json' +
        '&earliest_time=' + query.earliest +
        (query.latest? '&latest_time=' + query.latest : '');
    log(query.expression);
    let response = await fetch(splunkEnv.apiUrl.replace('{username}', splunkEnv.username.toLowerCase()), {
        body: encodeURI(query.expression),
        headers: {
            Accept: '*/*',
            Authorization: 'Basic ' + Buffer.from(splunkEnv.username + ":" + splunkEnv.password).toString('base64'),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
    });

    let rawLines = await response.text();

    // for debugging when necessary
    // fs.writeFileSync('./dist/logs/search_' + moment().format('YYYYMMDD_HHmm_ss') + '.json', rawLines);

    let error = getErrors(rawLines);
    if (error && error == 'Unable to read the job status.') {
        return await search(splunkEnv, query, attempt + 1);
    }
    if (error) {
        throw error;
    }

    let lines = [];
    for (let rawLine of rawLines.split('\n')) {
        let line: LogLine = convertSplunkLine(rawLine);
        if (line) {
            lines.push(convertSplunkLine(rawLine));
        }
    }
    lines = lines.reverse();
    log('Received ' + lines.length + ' lines.');

    return {
        lines,
        absoluteEarliest: getAbsoluteEarliest(query.expression, lines)
    }
}

function getErrors(text: string) {
    try {
        let data: SplunkErrorMessage = JSON.parse(text);
        if (data && data.messages) {
            return data.messages.filter(x => x.type.match(/ERROR|FATAL/)).map(x => x.text).join("\n");
        }
    } catch (e) {
    }
}

function convertSplunkLine(rawLine: string): LogLine {
    if (rawLine[0] != '{') {
        return;
    }
    try {
        let line: SplunkSearchResultLine = JSON.parse(rawLine);
        if (!line.preview) {
            let logline: any = {}; logline = line.result; return logline;
        }
    } catch (e) {
        log(e);
    }
}


export function filterLines(tabId: string, expression: string) {
    log('filterLines', expression);
    expression = expression.toLowerCase();
    let filterResponse: FilterResponse = {
        tabId,
        lineIds: lines[tabId].filter(x => x._raw.toLowerCase().indexOf(expression) >= 0).map(x => x._cd)
    };
    window.webContents.send(EventType.FILTER_RESULT, filterResponse);
}

export function filterSearch(tabId: string, expression: string) {
    searches[tabId].filter = expression;
    filterLines(tabId, expression);
}

export async function getMoreSearchRows(request: GetMoreRowsRequest) {
    let search = searches[request.tabId];
    let earliest = adjustEarliest(search.earliest, Number(request.latest));
    await loadMoreSearchRows(request.tabId, getSplunkQuery(search.query, null, earliest, request.latest), search.splunkEnv, null, request.tempRow);
}

function adjustEarliest(earliest: string, latest: number) {
    let m = earliest.match(/-([0-9])([hd])/);
    let earliestInSeconds = Number(m[1]) * (m[2] == 'h'? 3600 : 3600 * 24);
    return String(latest - earliestInSeconds);
}

export function getAbsoluteEarliest(query: string, lines: LogLine[]): number {
    let m = query.match(/head ([0-9]+)/);
    if (m && lines.length == Number(m[1])) {
        return Number(lines[0].time);
    }
    m = query.match(/earliest_time=([^ &]+)/);
    let earliest = m[1];
    if (earliest.match(/^[0-9.]+$/)) {
        return Number(earliest);
    }
    m = m[1].match(/-([0-9]+)([mhd])/);
    let earliestSecondsToNow = Number(m[1]) * (m[2] == 'm'? 60 : m[2] == 'h'? 3600 : 3600 * 24);
    return new Date().valueOf() / 1000 - earliestSecondsToNow;
}

export async function loadMoreSearchRows(tabId: string, query: SplunkQuery, splunkEnv: SplunkEnv, filter: string, tempRow: string) {
    window.webContents.send(EventType.LOAD_START, tabId);
    let logLines = await loadMore(tabId, query, splunkEnv, filter);
    let loadedData: SplunkLines = {
        tabId: tabId,
        lines: logLines.lines,
        isLoadMore: true,
        tempRow,
        isFirstLoad: false,
        earliest: logLines.absoluteEarliest
    };
    window.webContents.send(EventType.LOAD_END, loadedData);
    cacheLines(tabId, loadedData.lines, 'before');
}

async function loadMore(tabId: string, query: SplunkQuery, splunkEnv: SplunkEnv, filter: string): Promise<QueryResult> {
    let queryResult = await search(splunkEnv, query);
    if (queryResult && queryResult.lines.length) {
        for (let line of queryResult.lines) {
            line.tabId = tabId;
            if (filter && line.raw.toLowerCase().indexOf(filter) < 0) {
                line.filterOut = true;
            }
        }
    }
    return queryResult;
}

export function cacheLines(tabId: string, logLines: LogLine[], position: 'before' | 'after') {
    if (!lines[tabId]) {
        lines[tabId] = [];
    }
    if (position == 'before') {
        lines[tabId].unshift(...logLines);
    } else {
        lines[tabId].push(...logLines);
    }
}

export function removeLineCache(tabId: string) {
    delete lines[tabId];
}

export async function removeSearch(tabId: string) {
    if (!searches[tabId]) {
        return;
    }
    log('Removed search ' + searches[tabId].query);
    delete searches[tabId];
    removeLineCache(tabId);
}

export function sendError(tabId: string, text: string, tempRow: string) {
    let event: BackendError = { tabId, text, tempRow };
    window.webContents.send(EventType.BACKEND_ERROR, event);
}

interface SplunkErrorMessage {
    messages: [{
            type: string,
            text: string
        }]
}
