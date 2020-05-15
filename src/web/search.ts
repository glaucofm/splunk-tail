import {EventType, SavedSearch, SearchRequest, TailConfig, Type} from "../model/types";
import {sendEvent} from "../services/events";
import {formToModel, modelToForm} from "../services/forms";
import {deleteObjectFromList, getObject, getObjectFromList, saveObjectOnList} from "../services/storage";
import {createLogView} from "./log-viewer";
import {getFirstSplunkEnv, getSplunkEnv} from "./splunk-env";
import {addSplunkEnvOptions} from "./tail-config";

const uuid = require('uuid/v4');

let currentSelectedSplunkEnv: string;
let currentSavedSearchAlias = '';

export function setupSearchEvents() {
    currentSelectedSplunkEnv = getFirstSplunkEnv()? getFirstSplunkEnv().id : null;
    addSplunkEnvOptions($('li.search select.env'), currentSelectedSplunkEnv);
    let searchArea = $('li.search textarea').first();
    searchArea.on('focus', recalculateTextAreaHeight);
    searchArea.on('blur', resetTextAreaHeight);
    searchArea.on('input', recalculateTextAreaHeight);
    searchArea.on('keydown', textAreaKeyDown);
    $('li.search select').on('change', selectSplunkEnv);
    $('li.search a.open').on('click', () => openLoadQueryModal());
    $('li.search a.save').on('click', () => openSaveQueryModal());
    setupOpenQueryEvents();
    selectSplunkEnv(); searchArea.trigger('blur');
    resetTextAreaHeight();
}

function setupOpenQueryEvents() {
    $('div.save-query button.save').on('click', () => saveEdittingQuery());
    $('div.save-query button.delete').on('click', () => deleteEdittingQuery());
    $('div.save-query button.cancel').on('click', () => cancelSaveQuery());
}

export function setupSplunkEnvOptionsForSearch() {
    addSplunkEnvOptions($('li.search select.env'), currentSelectedSplunkEnv);
}

function recalculateTextAreaHeight() {
    let searchArea = $('li.search textarea').first();
    searchArea[0].style.height = "5px";
    searchArea[0].style.height = (searchArea[0].scrollHeight - 14)+"px";
    if (searchArea[0].scrollHeight > 50) {
        searchArea.addClass('shadow');
    } else {
        searchArea.removeClass('shadow');
    }
}

function resetTextAreaHeight() {
    $('li.search textarea').first()[0].style.height = "17px";
}

function textAreaKeyDown(e: any) {
    let searchArea = $('li.search textarea').first();
    if (e.keyCode == 13 && !e.shiftKey) {
        e.preventDefault();
        startSearch(searchArea.val() + '');
    }
}

export function resizeSearch() {
    setTimeout(() => {
        let input = $('li.search textarea').first();
        let width = $('body').innerWidth() - input.offset().left - 30;
        input.width(width);
    }, 50);
}

function selectSplunkEnv() {
    let select = $('li.search select.env');
    currentSelectedSplunkEnv = select.val() + '';
    setSelectWidths();
    $('li.search textarea').trigger('focus');
}

function setSelectWidths() {
    let selectEnv = $('li.search select.env');
    setSelectWidthToContent(selectEnv);
    let selectTime = $('li.search select.time');
    setSelectWidthToContent(selectTime);
    let right = 25;
    right += selectEnv.width() + 10;
    selectTime.css({ right: right });
    right += selectTime.width() + 15;
    $("li.search a.open").css({ right: right });
    right += 30;
    $("li.search a.save").css({ right: right });
    right += 40;
    $("li.search span").css({ right: right });
}

function setSelectWidthToContent(select: JQuery<HTMLElement>) {
    $("#tempOption").html(select.find('option:selected').text());
    let width = $("#tempSelect").width();
    select.width(width);
}

function startSearch(query: string) {
    let tabId = uuid().substr(0, 8);
    let title = query;
    if (title.length > 20) {
        title = title.substr(0, 20) + '...';
    }
    let tempRowId = createLogView(tabId, title, Type.SEARCH, {});
    let request: SearchRequest = {
        tabId,
        query,
        env: getSplunkEnv(currentSelectedSplunkEnv),
        earliest: $('select.time').val() + '',
        tempRow: tempRowId
    };
    sendEvent(EventType.SEARCH_REQUEST, request);
    $('li.search textarea').trigger('blur');
}

function openSaveQueryModal(savedSearch?: SavedSearch) {
    let query = String($('li.search textarea').first().val());
    if (!savedSearch) {
        savedSearch = {
            alias: currentSavedSearchAlias,
            expression: query
        }
    }
    modelToForm(savedSearch, $('div.save-query fieldset'));
    $('div.save-query').show();
    $('div.save-query input[name="alias"]').trigger('focus');
}

function saveEdittingQuery() {
    let savedSearch: SavedSearch = formToModel($('div.save-query fieldset'));
    saveObjectOnList('savedSearches', 'alias', savedSearch);
    $('div.save-query').hide();
    currentSavedSearchAlias = savedSearch.alias;
}

function deleteEdittingQuery() {
    deleteObjectFromList('savedSearches', 'alias', String($('div.save-query input[name="alias"]').val()));
    $('div.save-query').hide();
}

function cancelSaveQuery() {
    $('div.save-query').hide();
}

function openLoadQueryModal() {
    $('div.open-query').show();
    let ul = $('div.open-query ul');
    ul.empty();
    let savedSearches: SavedSearch[] = getObject('savedSearches', []);
    for (let savedSearch of savedSearches) {
        let li = $(openSavedQueryListItemHtml
            .replace(/{alias}/g, savedSearch.alias)
            .replace(/{expression}/g, savedSearch.expression));
        li.find('a').on('click', () => {
            loadSavedSearchQuery(savedSearch.alias);
        });
        ul.append(li);
    }
}

function loadSavedSearchQuery(alias: string) {
    let savedSearch: SavedSearch = getObjectFromList('savedSearches', 'alias', alias);
    $('li.search textarea').val(savedSearch.expression).trigger('focus');
    $('div.open-query').hide();
    currentSavedSearchAlias = savedSearch.alias;
}

const openSavedQueryListItemHtml = `<li>
    <a class="alias">{alias}</a>
    <div class="expression"><code>{expression}</code></div>
</li>`;
