import {EventType, FilterRequest, FilterResponse, View} from "../model/types";
import {sendEvent} from "../services/events";
import {getActiveTab, scrollBottom, scrollTop, Tab} from "../services/tabs";
import {getLineId} from "./log-viewer";

export function setupFilter(view: View) {
    view.table.find('thead').append($(filterHtml));
    let input = $('#{id}_logs tr.filter input'.replace('{id}', view.tabId));
    input.on('keypress', (e) => {
        if (e.which == 13) {
            input.blur();
            requestFilter(view, input.val() + '');
        }
    });
}

function requestFilter(view: View, expression: string) {
    if (expression.length) {
        let filterRequest: FilterRequest = {
            tabId: view.tabId,
            filterExpression: expression,
            type: view.type
        };
        sendEvent(EventType.FILTER_REQUEST, filterRequest);
    } else {
        cancelFilter();
    }
}

export function showFilter(tab: Tab) {
    if (tab) {
        const tr = $('#{id}_logs tr.filter'.replace('{id}', tab.id));
        tr.show();
        tr.find('input').trigger('focus');
    }
}

export function cancelFilter() {
    let tab: Tab = getActiveTab();
    if (tab) {
        let tr = $('#{id}_logs tr.filter'.replace('{id}', tab.id));
        if (tr.is(":visible")) {
            tr.find('input').val('');
            tr.hide();
            sendEvent(EventType.CANCEL_FILTER, tab.id);
            getAllRowsOnTab(tab.id).show();
            scrollBottom(tab.id);
        }
    }
}

export function applyFilterResults(event: any, response: FilterResponse) {
    let lineIds: any = {};
    response.lineIds.forEach((lineId) => lineIds[getLineId(response.tabId, lineId)] = true);
    scrollTop(response.tabId);
    setTimeout(() => {
        getAllRowsOnTab(response.tabId).hide();
        getAllRowsOnTab(response.tabId).each((i, row) => {
            if (lineIds[$(row).attr('id')]) {
                $(row).show();
            }
        });
    }, 50);
}

function getAllRowsOnTab(tabId: string): JQuery<HTMLElement> {
    return $('#{id}_logs > tbody > tr'.replace('{id}', tabId));
}


let filterHtml = `<tr class="filter" style="display: none">
                      <th colspan="2">
                          <input id="filter" name="filter" type="text" placeholder="Press <enter> to filter. Press <ESC> to cancel." style="width: 100%">
                      </th>
                  </tr>`;
