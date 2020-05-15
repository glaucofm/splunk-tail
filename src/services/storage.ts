export function getJsonItem(key: string, defaultValue: any = null): any {
    let json = localStorage.getItem(key);
    if (json) {
        return JSON.parse(json);
    }
    return defaultValue;
}

export function saveJsonItem(key: string, json: any) {
    localStorage.setItem(key, JSON.stringify(json));
}

export function getObjectFromList(listKey: string, itemKey: string, itemValue: string) {
    let list: any[] = getObject(listKey, []);
    return list.find(x => x[itemKey] == itemValue);
}

export function saveObjectOnList(listKey: string, itemKey: string, object: any) {
    let list: any[] = getObject(listKey, []);
    list = list.filter(x => x[itemKey] != object[itemKey]);
    list.push(object);
    list.sort((x, y) => x[itemKey] > y[itemKey]? 1 : x[itemKey] < y[itemKey]? -1 : 0);
    localStorage.setItem(listKey, JSON.stringify(list));
}

export function deleteObjectFromList(listKey: string, itemKey: string, itemKeyValue: string) {
    let list: any[] = getObject(listKey, []);
    list = list.filter(x => x[itemKey] != itemKeyValue);
    localStorage.setItem(listKey, JSON.stringify(list));
}

export function getObject(key: string, defaultValue?: any) {
    let stringifiedObject = localStorage.getItem(key);
    return stringifiedObject? JSON.parse(stringifiedObject) : defaultValue;
}

