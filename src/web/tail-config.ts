import {SplunkEnv, TailConfig} from "../model/types";
import {formToModel, modelToForm} from "../services/forms";
import {getJsonItem, saveJsonItem} from "../services/storage";
import {startTail} from "./tail";

const uuid = require('uuid/v4');

export function setupTailConfig() {
    setupTailList();
    let trAction = $('#menu-tail tr.action');
    trAction.find('a').on('click', () => { edit(); });
    $('#edit-tail button.save').on('click', () => { save(); });
    $('#edit-tail button.cancel').on('click', () => { cancelEdit(); });
    $('#edit-tail button.delete').on('click', () => { deleteCurrent(); });
}

function setupTailList() {
    $('#menu-tail tr.tail').remove();
    let trAction = $('#menu-tail tr.action');
    let tailConfigs: TailConfig[] = getJsonItem('tails');
    if (tailConfigs) {
        for (let tailConfig of tailConfigs) {
            let tr = $('<tr/>').addClass("tail");
            let td1 = $('<td/>').appendTo(tr);
            let a1 = $('<a/>').text(tailConfig.search).on('click', () => { startTail(tailConfig); }).appendTo(td1);
            let td2 = $('<td/>').appendTo(tr);
            let a2 = $('<a><i class="far fa-edit"></i> Edit</a>').on('click', () => { edit(tailConfig); }).appendTo(td2);
            tr.insertBefore(trAction);
        }
    }
}

function edit(tailConfig: TailConfig = null) {
    if (tailConfig == null) {
        tailConfig = {
            id: uuid(),
            search: '',
            additionalSearch: '',
            exclusions: '',
            splunkEnv: ''
        }
    }
    modelToForm(tailConfig, $('#edit-tail fieldset'));
    let select = $('select[name="splunkEnv"]');
    addSplunkEnvOptions(select, tailConfig.splunkEnv);
    $('#edit-tail').show();
}

export function addSplunkEnvOptions(select: JQuery<HTMLElement>, selectedEnv: string) {
    select.find('option').remove();
    let splunkEnvs: SplunkEnv[] = getJsonItem('splunkEnvs', []);
    splunkEnvs.sort((x, y) => x.name > y.name? 1 : x.name < y.name? -1 : 0);
    for (let env of splunkEnvs) {
        select.append($('<option/>').attr('value', env.id).text(env.name));
    }
    if (selectedEnv) {
        select.val(selectedEnv);
    }
}

function cancelEdit() {
    $('#edit-tail').hide();
}

function save() {
    let form: TailConfig = formToModel($('#edit-tail fieldset'));
    let tails: TailConfig[] = getJsonItem('tails');
    if (!tails) {
        tails = [];
    }
    tails = tails.filter(x => x.id !== form.id);
    tails.push(form);
    tails = tails.sort((x, y) => x.search > y.search? 1 : x.search < y.search? -1 : 0);
    saveJsonItem('tails', tails);
    $('#edit-tail').hide();
    setupTailList();
}

function deleteCurrent() {
    let form: TailConfig = formToModel($('#edit-tail fieldset'));
    let tails: TailConfig[] = getJsonItem('tails');
    tails = tails.filter(x => x.id !== form.id);
    saveJsonItem('tails', tails);
    $('#edit-tail').hide();
    setupTailList();
}
