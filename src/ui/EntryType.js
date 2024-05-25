import { uuidv4 } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { Book } from '../st/wi/Book.js';
import { CodexEntry } from './CodexEntry.js';
import { CodexEntryFactory } from './CodexEntryFactory.js';
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


    toString() {
        return [
            this.prefix,
            ...this.sectionList.filter(it=>it.content.length > 0).map(it=>it.toString()).join(''),
            this.suffix,
        ].join('');
    }



    async applyChanges() {
        log('[EntryType.applyChanges()]', this.id, this.name);
        const bookNames = [...document.querySelectorAll('#world_editor_select > option')].map(it=>it.textContent);
        for (const name of bookNames) {
            log('[EntryType.applyChanges()]', this.id, this.name, { name });
            const book = new Book(name);
            await book.load();
            for (const entry of book.entryList) {
                const oc = entry.content;
                const cdx = CodexEntryFactory.create(entry, null, null, null);
                if (!(cdx instanceof CodexEntry)) continue;
                const type = cdx.getType(this);
                if (type.id == this.id && oc != entry.content) {
                    log('[EntryType.applyChanges()]', this.id, this.name, { name, entry }, 'saveDebounced()');
                    await entry.saveDebounced();
                }
            }
        }
    }
}




export class BasicEntryType extends EntryType {
    /**
     * @param {string} content
     */
    constructor(content) {
        super();
        this.id = null;
        this.sectionList.push(EntrySection.from({
            id: null,
            name: 'Content',
            content,
        }));
    }

    toString() {
        return this.sectionList[0].content;
    }
}
