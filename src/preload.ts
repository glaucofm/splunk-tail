import {cancelFilter, showFilter} from "./web/filter";
import {resizeSearch, setupSearchEvents} from "./web/search";
import {setupSplunkEnv} from "./web/splunk-env";
import {setupTailConfig} from "./web/tail-config";
import {setupEvents} from "./services/events";
import {getActiveTab, resizeTabs} from "./services/tabs";

window.addEventListener("DOMContentLoaded", () => {
    initModals();
    setupResizeEvents();
    initializeApplication();
});

function initializeApplication() {
    setupSplunkEnv();
    setupTailConfig();
    setupSearchEvents();
    setupEvents();
    resizeSearch();
    initFindInPage();
}

function initModals() {
    $(document).on('keyup', (e: any) => {
        if (e.keyCode === 27) {
            $('div.modal').hide();
            cancelFilter();
        }
    });
    $(document).on('keypress', (e: any) => {
        if (!e.ctrlKey && !e.metaKey && e.target.tagName === 'BODY') {
            showFilter(getActiveTab());
        }
    });
}

function setupResizeEvents() {
    $(window).on('resize', function() {
        resizeTabs();
        resizeSearch();
    });
}

function initFindInPage() {
}


