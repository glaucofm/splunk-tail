export enum Type {
    SEARCH,
    TAIL
}

export enum EventType {
    TAIL_START = 'TAIL_START',
    TAIL_END = 'TAIL_END',
    LOAD_START = 'LOAD_START',
    LOAD_END = 'LOAD_END',
    FREQUENCY_CHANGE = 'FREQUENCY_CHANGE',
    SET_FREQUENCY = 'SET_FREQUENCY',
    GET_LINE_DETAIL = 'GET_LINE_DETAIL',
    LINE_DETAIL = 'LINE_DETAIL',
    FILTER_REQUEST = 'FILTER_REQUEST',
    FILTER_RESULT = 'FILTER_RESULT',
    CANCEL_FILTER = 'CANCEL_FILTER',
    GET_MORE_ROWS = 'GET_MORE_ROWS',
    SEARCH_REQUEST = 'SEARCH_REQUEST',
    BACKEND_ERROR = 'BACKEND_ERROR',
    STATS_END = 'STATS_END',
}

export interface SplunkLines {
    tabId: string;
    lines: LogLine[];
    isLoadMore: boolean;
    tempRow: string;
    isFirstLoad: boolean;
    earliest: number;
}

export interface LogLine {
    _cd: string;
    ENV: string;
    _indextime: string;
    _raw: string;
    ms: string;
    _sourcetype: string;
    _time: string;
    index: string;
    source: string;
    splunk_server: string;
    epoch: string;
    filterOut: boolean;
    time: string;
    [propName: string]: any;
}

export interface TailInfo {
    id: string;
    tabId: string;
    search: string;
    filter: string;
    earliest: string;
    splunkEnv: SplunkEnv;
    exclusion: string;
    isLoading: boolean;
    frequency: Frequency;
    hfCount: number;
    maxHf: number;
    maxLines: number;
}

export interface SearchInfo {
    tabId: string;
    query: string;
    filter: string;
    splunkEnv: SplunkEnv;
    earliest: string;
}

export interface Message {
    severity?: string;
    text?: string;
}

export interface SplunkEnv {
    id: string;
    name: string;
    apiUrl: string;
    username: string;
    password: string;
}

export interface TailConfig {
    id: string;
    search: string;
    additionalSearch: string;
    exclusions: string;
    splunkEnv: string;
}

export interface TailRequest {
    tabId: string;
    config: TailConfig;
    env: SplunkEnv;
    tempRow: string;
}

export interface SearchRequest {
    tabId: string;
    query: string;
    env: SplunkEnv;
    earliest: string;
    tempRow: string;
}

export enum Frequency {
    High = 'high-frequency',
    Low = 'low-frequency'
}

export interface FrequencyChangeData {
    tabId: string;
    frequency: Frequency;
}

export interface GetLineRequest {
    tabId: string;
    lineId: string;
}

export interface GetLineResponse {
    tabId: string;
    line: LogLine;
}

export interface FilterRequest {
    tabId: string;
    filterExpression: string;
    type: Type;
}

export interface FilterResponse {
    tabId: string;
    lineIds: string[];
}

export interface GetMoreRowsRequest {
    tabId: string;
    latest: string;
    type: Type;
    tempRow: string;
}

export interface QueryResult {
    lines: LogLine[];
    absoluteEarliest: number;
}

export interface View {
    tabId: string;
    type: Type;
    batchIdx: number;
    logHeaderAdded: boolean;
    rows: IndexedRow[];
    table: JQuery<HTMLElement>;
    tbody: JQuery<HTMLElement>;
    loadMoreRow?: JQuery<HTMLElement>;
}

export interface IndexedRow {
    cd: string;
    time: number;
    batchIdx: number;
    row: JQuery<HTMLElement>;
}


export interface BackendError {
    tabId: string;
    text: string;
    tempRow: string;
}

export interface SplunkSearchResultLine {
    preview: boolean,
    offset: number,
    result: { [key: string]: any }
}

export interface SplunkQuery {
    expression: string;
    earliest: string;
    latest?: string;
}

export interface SavedSearch {
    alias: string;
    expression: string;
}
