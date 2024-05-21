import { uuidv4 } from '../../../../../utils.js';
import { EntrySection } from './EntrySection.js';

export class EntryType {
    static from(props) {
        props.sectionList = (props.sectionList ?? []).map(it=>EntrySection.from(it));
        return Object.assign(new this(), props);
    }




    /**@type {string}*/ id;
    /**@type {string}*/ name = '';
    /**@type {string}*/ prefix = '';
    /**@type {string}*/ suffix = '';
    /**@type {EntrySection[]}*/ sectionList = [];




    constructor() {
        this.id = uuidv4();
    }
}
