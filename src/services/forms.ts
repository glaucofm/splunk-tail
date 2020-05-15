export function formToModel(fieldset: JQuery<HTMLElement>, model: any = {}) {
    fieldset.find('input, select, textarea').each((i, input) => {
        model[$(input).attr('name')] = $(input).val();
    });
    return model;
}

export function modelToForm(model: any, fieldset: JQuery<HTMLElement>) {
    for (let key of Object.getOwnPropertyNames(model)) {
        fieldset.find('input[name="' + key + '"], select[name="' + key + '"], textarea[name="' + key + '"]').val(model[key]);
    }
}

