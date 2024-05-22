import { uuidv4 } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { Book } from '../st/wi/Book.js';
import { CodexEntry } from './CodexEntry.js';
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



    async applyChanges() {
        log('[EntryType.applyChanges()]', this.id, this.name);
        const typeRe = /{{\/\/codex-type:(.+?)}}/;
        const bookNames = [...document.querySelectorAll('#world_editor_select > option')].map(it=>it.textContent);
        for (const name of bookNames) {
            log('[EntryType.applyChanges()]', this.id, this.name, { name });
            const book = new Book(name);
            await book.load();
            for (const entry of book.entryList) {
                if (!typeRe.test(entry.content)) continue;
                const oc = entry.content;
                const cdx = new CodexEntry(entry, null, null, null);
                const type = cdx.getType(this);
                if (type.id == this.id && oc != entry.content) {
                    log('[EntryType.applyChanges()]', this.id, this.name, { name, entry }, 'saveDebounced()');
                    await entry.saveDebounced();
                }
            }
        }
    }
}
