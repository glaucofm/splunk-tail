import {SplunkEnv} from "../model/types";
import {formToModel, modelToForm} from "../services/forms";
import {getJsonItem, saveJsonItem} from "../services/storage";
import {setupSplunkEnvOptionsForSearch} from "./search";
const uuid = require('uuid/v4');

export function setupSplunkEnv() {
    setupSplunkEnvList();
    let trAction = $('#menu-splunk tr.action');
    trAction.find('a').on('click', () => { editSplunkEnv(); });
    $('#edit-splunk-env button.save').on('click', () => { saveCurrentSplunkEnv(); });
    $('#edit-splunk-env button.cancel').on('click', () => { cancelEdit(); });
}

function setupSplunkEnvList() {
    $('#menu-splunk tr.env').remove();
    let trAction = $('#menu-splunk tr.action');
    let splunkEnvs: SplunkEnv[] = getJsonItem('splunkEnvs');
    if (splunkEnvs) {
        for (let env of splunkEnvs) {
            let tr = $('<tr/>').addClass("env");
            let td = $('<td/>').appendTo(tr);
            let a = $('<a/>').text(env.name).on('click', () => { editSplunkEnv(env); }).appendTo(td);
            tr.insertBefore(trAction);
        }
    }
}

function editSplunkEnv(splunkEnv: SplunkEnv = null) {
    if (splunkEnv == null) {
        splunkEnv = {
            id: uuid(),
            name: '',
            apiUrl: 'https://<host>:443/<group>/{username}/<application>/search/jobs/export',
            username: '',
            password: '',
        }
    }
    modelToForm(splunkEnv, $('#edit-splunk-env fieldset'));
    $('#edit-splunk-env').show();
}

function cancelEdit() {
    $('#edit-splunk-env').hide();
}

function saveCurrentSplunkEnv() {
    let form: SplunkEnv = formToModel($('#edit-splunk-env fieldset'));
    let splunkEnvs: SplunkEnv[] = getJsonItem('splunkEnvs');
    if (!splunkEnvs) {
        splunkEnvs = [];
    }
    splunkEnvs = splunkEnvs.filter(x => x.id !== form.id);
    splunkEnvs.push(form);
    splunkEnvs = splunkEnvs.sort((x, y) => x.name > y.name? 1 : x.name < y.name? -1 : 0);
    saveJsonItem('splunkEnvs', splunkEnvs);
    $('#edit-splunk-env').hide();
    setupSplunkEnvList();
    setupSplunkEnvOptionsForSearch();
}

export function getSplunkEnv(id: string): SplunkEnv {
    let splunkEnvs: SplunkEnv[] = getJsonItem('splunkEnvs');
    if (!splunkEnvs) {
        splunkEnvs = [];
    }
    return splunkEnvs.find(x => x.id == id);
}

export function getFirstSplunkEnv(): SplunkEnv {
    let splunkEnvs: SplunkEnv[] = getJsonItem('splunkEnvs');
    if (!splunkEnvs) {
        return;
    }
    return splunkEnvs[0];
}

function getSplunkEnvs(): SplunkEnv[] {
    return getJsonItem('splunkEnvs');
}
