import * as moment from "moment";
import {
    BackendError,
    EventType,
    GetLineRequest,
    GetLineResponse,
    GetMoreRowsRequest,
    IndexedRow,
    LogLine,
    Message,
    SplunkLines,
    Type,
    View
} from "../model/types";
import {sendEvent} from "../services/events";
import {createTab, getScrollTop, scrollBottom, scrollToPosition, TabOptions} from "../services/tabs";
import {setupFilter} from "./filter";

let tempRowCounter = 0;

let views: { [key: string]: View } = {};

export function createLogView(tabId: string, title: string, type: Type, options: TabOptions): string {
    let table = getLogViewTable(tabId);
    let tbody = table.find('tbody');
    let tempRowId = tabId + '-' + tempRowCounter; tempRowCounter++;
    let loadingRow = getLoadingRow(tempRowId);
    let indexedRows: any = [];
    let view = { tabId, type, batchIdx: 0, rows: indexedRows, table, tbody, logHeaderAdded: false };
    views[tabId] = view;
    view.tbody.append(loadingRow);
    createTab(tabId, title, view.table, options);
    return tempRowId;
}

function addLogHeader(view: View) {
    view.table.find('thead').append($(logTableHeader));
    setupFilter(view);
}

export function processLoadStart(event: any, tabId: string) {
    $('#' + tabId + '_head i.loader')
        .addClass('active');
}

export function processFrequencyChange(event: any, tabId: string, frequency: string) {
    $('#' + tabId + '_head i.loader')
        .removeClass('high-frequency')
        .removeClass('low-frequency')
        .addClass(frequency);
}

export function processLoadEnd(event: any, data: SplunkLines) {
    $('#' + data.tabId + '_head i.loader').removeClass('active');
    if (data.lines === undefined) {
        return;
    }
    let view = views[data.tabId];
    if (!view || !view.table.length) {
        return;
    }

    let scrollAdjustment;
    if (data.isLoadMore) {
        let topRow = $('tr.temp-' + data.tempRow).next('tr').first();
        if (topRow.length) {
            scrollAdjustment = {
                topRow,
                topRowOffsetBefore: topRow.position().top
            }
        }
    }

    if (data.tempRow) {
        $('tr.temp-' + data.tempRow).remove();
    }

    if (data.lines.length == 0) {
        if (data.isLoadMore || view.rows.length == 0) {
            view.tbody.prepend(getLoadMoreRow(view, data.earliest, 'Load rows before ' + moment.unix(data.earliest).format()));
        }
        return;
    }
    view.batchIdx++;

    if (!view.logHeaderAdded) {
        view.logHeaderAdded = true;
        addLogHeader(view);
    }

    if ($('#' + view.tabId + '_loadmore').length == 0) {
        view.tbody.prepend(getLoadMoreRow(view, data.earliest));
    }

    let rows: IndexedRow[] = [];
    for (const line of data.lines) {
        if (!view.rows.find(x => x.cd == line._cd)) {
            rows.push(addRow(view, line));
        }
    }
    for (let row of rows) {
        addTimeGapLines(view, row);
    }

    if (scrollAdjustment) {
        scrollToPosition(view.tabId, scrollAdjustment.topRow.position().top - scrollAdjustment.topRowOffsetBefore);
    } else if (rows.length) {
        scrollBottom(view.tabId);
    }

    if (!data.isFirstLoad) {
        highlightRows(view);
    }
}

export function processStatsEnd(event: any, data: SplunkLines) {
    let view = views[data.tabId];
    if (!view || !view.table.length) {
        return;
    }

    if (data.tempRow) {
        $('tr.temp-' + data.tempRow).remove();
    }

    view.table.addClass('stat');

    let columns = Object.getOwnPropertyNames(data.lines[0]);

    let row = $('<tr/>');
    for (let column of columns) {
        row.append($('<th>' + column + '</th>'));
    }
    view.tbody.append(row);

    for (let line of data.lines) {
        let row = $('<tr/>');
        for (let column of columns) {
            row.append($('<td>' + line[column] + '</td>'));
        }
        view.tbody.append(row);
    }
}

export function processBackendError(event: any, data: BackendError) {
    $('#' + data.tabId + '_head i.loader').removeClass('active');
    let view = views[data.tabId];
    if (!view || !view.table.length) {
        return;
    }
    if (data.tempRow) {
        $('tr.temp-' + data.tempRow).remove();
    }
    view.tbody.find('tr.error').remove();
    let row = getErrorRow();
    row.find('code').text(data.text);
    view.tbody.append(row);
}

function addRow(view: View, line: LogLine): IndexedRow {
    let time = Number(line.time);
    let row = getLineRow(view, line);
    let indexedRow: IndexedRow = { cd: line._cd, time, batchIdx: view.batchIdx, row };
    let insertionIndex = 0;
    while (insertionIndex < view.rows.length && view.rows[insertionIndex].time <= time)
        insertionIndex++;
    if (insertionIndex < view.rows.length) {
        row.insertBefore(view.rows[insertionIndex].row);
        view.rows.splice(insertionIndex, 0, indexedRow);
    } else {
        view.tbody.append(row);
        view.rows.push(indexedRow);
    }
    return indexedRow;
}

function addTimeGapLines(view: View, row: IndexedRow) {
    let index = view.rows.indexOf(row);
    if (index > 0) {
        let time = moment.unix(row.time);
        let timeBefore = moment.unix(view.rows[index - 1].time);
        let elapsedTime = time.diff(timeBefore);
        if (elapsedTime > 15 * 1000) {
            getTimeRow(timeBefore.from(time).replace(' ago', '')).insertBefore(row.row);
        }
    }
    if (index < view.rows.length - 1 && row.batchIdx != view.rows[index + 1].batchIdx) {
        let timeAfter = moment.unix(view.rows[index + 1].time);
        let time = moment.unix(row.time);
        let elapsedTime = timeAfter.diff(time);
        if (elapsedTime > 15 * 1000) {
            getTimeRow(time.from(timeAfter).replace(' ago', '')).insertAfter(row.row);
        }
    }
}

function highlightRows(view: View) {
    let rows = view.tbody.find('tr.log-row.batch-' + view.batchIdx);
    rows.addClass('new');
    setTimeout(() => {
        rows.removeClass('new');
    }, 15000);
}

function addRemoveRows(view: View, rowsToRemove: JQuery<HTMLElement>[], rowsToAdd: JQuery<HTMLElement>[], addBefore: boolean = false) {
    let topRow, topRowOffsetBefore: number;
    if (addBefore) {
        topRow = view.tbody.find('tr.log-row').first();
        topRowOffsetBefore = topRow.length? topRow.position().top - getScrollTop(view.tabId) : 0;
    }
    rowsToRemove.forEach((row) => row.remove());
    addBefore? view.tbody.prepend(rowsToAdd) : view.tbody.append(rowsToAdd);
    if (addBefore) {
        scrollToPosition(view.tabId, topRow.position().top - topRowOffsetBefore);
    } else {
        scrollBottom(view.tabId);
    }
}

function loadMore(view: View, loadMoreRow: JQuery<HTMLElement>) {
    let tempRowId = view.tabId + '-' + tempRowCounter; tempRowCounter++;
    getLoadingRow(tempRowId).insertAfter(loadMoreRow);
    let eventData: GetMoreRowsRequest = {
        tabId: view.tabId,
        latest: loadMoreRow.attr('latest'),
        type: view.type,
        tempRow: tempRowId
    };
    sendEvent(EventType.GET_MORE_ROWS, eventData);
    view.loadMoreRow.remove();
}

function getLineRow(view: View, line: LogLine): JQuery<HTMLElement> {
    let message = getMessage(line);
    let row = $(logRow
        .replace('{id}', getLineId(view.tabId, line._cd))
        .replace('{severity}', message.severity)
        .replace('{epochtime}', line.time)
        .replace('{time}', line._time)
        .replace('{batchIdx}', view.batchIdx + '')
        .replace('{message}', message.text));
    row.find('td.message')
        .on('click', () => { showHideDetail(view.tabId, line._cd); });
    if (line.filterOut) {
        row.hide();
    }
    return row;
}

function getMessage(line: LogLine): Message {
    let message: Message = {};
    message.text = line._raw;
    message.severity = 'normal';
    if (line._raw.startsWith('{')) {
        let json: any;
        try {
            json = JSON.parse(line._raw);
        } catch (e) {
            json = line;
        }
        if (json.hasOwnProperty('severity')) {
            message.severity = json.severity;
        }
        if (json.hasOwnProperty('exception')) {
            message.text = json.exception;
        } else if (json.hasOwnProperty('message')) {
            if (json.message == 'boundryLog' && json.hasOwnProperty('URI')) {
                message.text = json.URI;
            } else {
                message.text = json.message;
            }
        }
    }
    message.text = message.text.length > 300? message.text.substr(0, 300) + '...' : message.text;
    return message;
}

function showHideDetail(tabId: string, lineId: string) {
    let trDetail = $('#' + getLineId(tabId, lineId) + '_detail');
    if (trDetail.length) {
        trDetail.remove();
    } else {
        let request: GetLineRequest = {
            tabId: tabId,
            lineId: lineId
        };
        sendEvent(EventType.GET_LINE_DETAIL, request);
    }
}

export function addDetailLine(event: any, data: GetLineResponse) {
    getLineDetailRow(data.tabId, data.line).insertAfter($('#' + getLineId(data.tabId, data.line._cd)));
}

function getLineDetailRow(tabId: string, line: LogLine): JQuery<HTMLElement> {
    let content: JQuery<HTMLElement>;
    if (line._raw.startsWith('{')) {
        let json = JSON.parse(line._raw);
        for (let key in line) json[key] = line[key];
        content = jsonToTable(json);
    } else {
        content = jsonToTable(line);
    }
    let row = $(logDetailRow.replace('{id}', getLineId(tabId, line._cd)));
    row.find('td').append(content);
    return row;
}

function jsonToTable(json: any): JQuery<HTMLElement> {
    let table = $('<table/>');
    for (let key in json) {
        let value = json[key];
        if (value != null && value.constructor == Object) {
            value = jsonToTable(value);
        } else if (typeof value == 'string') {
            if (key != '_raw' && value.match(/^{.*}$/)) {
                value = JSON.stringify(JSON.parse(value), null, 2);
            }
            value = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            value = $('<span>' + value + '</span>');
        }
        let row = $(
            '<tr>' +
            '<td class="detail-key">' + key + '</td>' +
            '<td class="detail-value"></td>' +
            '</tr>');
        row.find('td.detail-value').append(value);
        if (key == '_raw') {
            let action = $('<a>click to view</a>');
            value.hide();
            action.on('click', () => {
                value.show();
                action.hide();
            });
            row.find('td.detail-value').append(action);
        }
        table.append(row);
    }
    return table;
}

export function getLineId(tailId: string, lineId: string): string {
    return tailId + '_' + lineId.replace(':', '');
}

/*
 Components
 */

function getLogViewTable(tabId: string): JQuery<HTMLElement> {
    return $(logTableHtml.replace(/{tabId}/g, tabId));
}

function getLoadingRow(tempId: string): JQuery<HTMLElement> {
    return $(loadingRow.replace(/{tempId}/g, tempId));
}

function getLoadMoreRow(view: View, latest: number, text: string = 'Load previous rows'): JQuery<HTMLElement> {
    view.loadMoreRow = $(loadMoreRowHtml
        .replace(/{tabId}/g, view.tabId)
        .replace(/{latest}/g, String(latest))
        .replace(/{text}/g, text));
    view.loadMoreRow.find('a').on('click', () => {
        loadMore(view, view.loadMoreRow);
    });
    return view.loadMoreRow;
}

function getTimeRow(description: string): JQuery<HTMLElement> {
    return $(timeRow.replace(/{description}/g, description));
}

function getErrorRow() {
    return $(ErrorRow);
}

let logTableHtml = `<table id="{tabId}_logs" class="logs">
                        <thead>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>`;

let logTableHeader = `<tr>
                          <th class="time">Time</th>
                          <th class="message">Message</th>
                      </tr>`;

let loadingRow = `<tr class="loading temp-{tempId}">
                      <td class="action" colspan="2">
                          Loading... <img src="../assets/images/spinner-icon-0.gif" style="height: 16px; line-height: 16px">
                      </td>
                  </tr>`;

let logRow =  `<tr id="{id}" epochtime="{epochtime}" class="{severity} log-row batch-{batchIdx}">
                   <td class="time">{time}</td>
                   <td class="message clickable">{message}</td>
               </tr>`;

let logDetailRow = `<tr id="{id}_detail" class="detail">
                        <td colspan="2">
                        </td>
                    </tr>`;

let loadMoreRowHtml =  `<tr id="{tabId}_loadmore" class="action-row" latest="{latest}">
                            <td class="action" colspan="2">
                                <a class="clickable">{text}</a>
                            </td>
                        </tr>`;

let timeRow =  `<tr class="time-row">
                    <td colspan="2">{description}</td>
                </tr>`;

let ErrorRow = `<tr class="error">
                    <td colspan="2"><pre><code></code></pre></td>
                </tr>`;
