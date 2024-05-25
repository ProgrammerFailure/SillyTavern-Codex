import { log } from '../lib/log.js';
import { BasicEntryType, EntryType } from './EntryType.js';

export class CodexEntryProperties {
    static from(entry) {
        // entry already has property information
        const re = /\n?{{\/\/codex:(.+?)}}/s;
        if (re.test(entry.content)) {
            const props = JSON.parse(decodeURIComponent(atob(re.exec(entry.content)[1])));
            props.type = EntryType.from(props.type);
            props.content = entry.content.replace(re, '');
            const result = Object.assign(new this(), props);
            log('[CEP]', { result, entry });
            return result;
        }

        const props = {};

        // entry has type information
        const reType = /\n?{{\/\/codex-type:(.+?)}}/;
        if (reType.test(entry.content)) {
            props.type = EntryType.from(JSON.parse(decodeURIComponent(atob(reType.exec(entry.content)[1]))));
            entry.content = entry.content.replace(reType, '');
        }
        props.content = entry.content;

        // check keyList for rest
        const titleKey = entry.keyList.find(it=>it.startsWith('codex-title:'));
        if (titleKey) {
            props.titleField = titleKey.slice('codex-title:'.length);
            entry.keyList.splice(entry.keyList.indexOf(titleKey));
        }
        const tplKey = entry.keyList.find(it=>it.startsWith('codex-tpl:'));
        if (tplKey) {
            props.templateName = tplKey.slice('codex-tpl:'.length);
            entry.keyList.splice(entry.keyList.indexOf(tplKey));
        }

        if (!props.type) {
            props.type = new BasicEntryType(entry.content);
        }

        const result = Object.assign(new this(), props);
        entry.content += result.toString();
        log('[CEP]', { result, entry });
        return result;
    }




    /**@type {string} */ titleField;
    /**@type {string} */ templateName;
    /**@type {EntryType} */ type;

    /**@type {string} */ content;


    constructor() {
    }


    toJSON() {
        return {
            titleField: this.titleField,
            templateName: this.templateName,
            type: this.type,
        };
    }

    toString() {
        const isBasic = this.type instanceof BasicEntryType;
        const noTitle = this.titleField == null || this.titleField == '';
        const noTpl = this.templateName == null || this.templateName == '';
        if (isBasic && noTitle && noTpl) return '';
        return `\n{{//codex:${btoa(encodeURIComponent(JSON.stringify(this)))}}}`;
    }
}
