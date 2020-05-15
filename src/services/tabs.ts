export interface TabOptions {
    onLoaderClick?: (id: string) => void;
    onRemove?: (id: string) => void;
}

export interface Tab {
    id: string;
    title: string;
    options: TabOptions;
    head?: JQuery<HTMLElement>;
    body?: JQuery<HTMLElement>;
}

let tabs: { [key: string]: Tab } = {};

export function createTab(id: string, title: string, content: JQuery<HTMLElement>, options: TabOptions): Tab {
    let tab: Tab = { id, title, options };
    tabs[id] = tab;
    removeTab(tab);
    inactivateCurrentTabs();
    $('div.logs-tabs-head td.filler').show();
    tab.head = addTabTabHead(tab);
    tab.body = addTabTabBody(tab, content);
    setFixedHeader(tab);
    resizeTabs();
    return tab;
}

function removeTab(tab: Tab) {
    $('#' + tab.id + '_head').remove();
    $('#' + tab.id + '_content').remove();
    $('div.logs-tabs-head td.filler').hide();
    if (tab.options.onRemove) {
        tab.options.onRemove(tab.id);
    }
}

function inactivateCurrentTabs() {
    $('div.logs-tabs-head td.tab').removeClass('active');
    $('div.logs-tabs-body div.logs-wrapper').hide();
}

function selectTab(tab: Tab) {
    inactivateCurrentTabs();
    $('#' + tab.id + '_head').addClass('active');
    $('#' + tab.id + '_content').show();
}

function setFixedHeader(tab: Tab) {
    let div = $('#{id}_content'.replace('{id}', tab.id));
    div.on('scroll', function() {
        let headers = div.find('thead th');
        headers.css('transform', 'translateY('+ (this.scrollTop) +'px)');
    });
}

function addTabTabHead(tab: Tab): JQuery<HTMLElement> {
    let tabHead = $(tabHeadHtml
        .replace(/{id}/g, tab.id)
        .replace('{text}', tab.title));
    tabHead.find('span.name').on('click', () => { selectTab(tab); });
    tabHead.find('i.remove-tab').on('click', () => { removeTab(tab); });
    if (tab.options.onLoaderClick) {
        tabHead.find('i.loader').on('click', () => { tab.options.onLoaderClick(tab.id) });
    } else {
        tabHead.find('i.loader').remove();
    }
    tabHead.insertBefore($('div.logs-tabs-head td.filler'));
    return tabHead;
}

function addTabTabBody(tab: Tab, content: JQuery<HTMLElement>): JQuery<HTMLElement> {
    let tabBody = $(tabBodyHtml.replace(/{id}/g, tab.id));
    $('div.logs-tabs-body').append(tabBody);
    tabBody.append(content);
    return tabBody;
}

export function resizeTabs(delays: number[] = [10, 200]) {
    for (let delay of delays) {
        setTimeout(() => {
            let height = $(window).height() - $('div.logs-tabs-body').offset().top - 20;
            $('div.logs-wrapper:visible').height(height);
        }, delay);
    }
}

export function getActiveTab(): Tab {
    const activeTab = $('div.logs-wrapper:visible');
    if (activeTab.length) {
        return tabs[activeTab.attr('tabid')];
    }
}

export function scrollTop(tabId: string) {
    $('#{id}_content'.replace('{id}', tabId)).scrollTop(0);
}

export function scrollBottom(tabId: string) {
    let div = $('#{id}_content'.replace('{id}', tabId));
    div.scrollTop(div[0].scrollHeight);
}

export function scrollToPosition(tabId: string, difference: number) {
    let div = $('#{id}_content'.replace('{id}', tabId));
    div.scrollTop(div.scrollTop() + difference);
}

export function getScrollTop(tabId: string) {
    return $('#{id}_content'.replace('{id}', tabId)).scrollTop();
}

let tabHeadHtml = `<td id="{id}_head" class="tab active" tabid="{id}">
                      <span class="name">{text}</span>
                      <i class="fas fa-redo-alt loader low-frequency"></i> 
                      <i class="fas fa-times clickable remove-tab"></i>
                  </td>`;

let tabBodyHtml = `<div id="{id}_content" class="logs-wrapper" tabid="{id}"></div>`;
