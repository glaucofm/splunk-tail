import {app, BrowserWindow, globalShortcut, ipcMain} from "electron";
import * as path from "path";
import {filterSearch, getMoreSearchRows, initSearchModule, searchAndStore, sendLine} from "./backend/search";
import {addTail, cancelFilter, filterTail, getMoreTailRows, initTail, removeTail, setFrequency} from './backend/tail';
import {
    EventType,
    FilterRequest,
    FrequencyChangeData,
    GetLineRequest,
    GetMoreRowsRequest,
    SearchRequest,
    Type
} from "./model/types";

app.commandLine.appendSwitch('--ignore-certificate-errors', 'true');

let mainWindow: Electron.BrowserWindow;

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';

const ipc = require('electron').ipcMain;

function createWindow() {
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        },
    });

    mainWindow.loadFile(path.join(__dirname, "web/index.html"));

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    initTail(mainWindow);
    initSearchModule(mainWindow);

    mainWindow.maximize();
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on(EventType.TAIL_START, async (event, data) => {
    await addTail(data);
});

ipcMain.on(EventType.TAIL_END, async (event, data) => {
    await removeTail(data);
});

ipcMain.on(EventType.SET_FREQUENCY, async (event, request: FrequencyChangeData) => {
    await setFrequency(request.tabId, request.frequency);
});

ipcMain.on(EventType.GET_LINE_DETAIL, async (event, request: GetLineRequest) => {
    await sendLine(request.tabId, request.lineId);
});

ipcMain.on(EventType.FILTER_REQUEST, async (event, request: FilterRequest) => {
    if (request.type == Type.SEARCH) {
        await filterSearch(request.tabId, request.filterExpression);
    } else {
        await filterTail(request.tabId, request.filterExpression);
    }
});

ipcMain.on(EventType.CANCEL_FILTER, async (event, request: string) => {
    await cancelFilter(request);
});

ipcMain.on(EventType.GET_MORE_ROWS, async (event, request: GetMoreRowsRequest) => {
    if (request.type == Type.SEARCH) {
        await getMoreSearchRows(request);
    } else {
        await getMoreTailRows(request);
    }
});

ipcMain.on(EventType.SEARCH_REQUEST, async (event, request: SearchRequest) => {
    await searchAndStore(request);
});
