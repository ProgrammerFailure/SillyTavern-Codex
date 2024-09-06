// eslint-disable-next-line no-unused-vars
import { getRequestHeaders } from '../../../../../../../script.js';
import { executeSlashCommands, executeSlashCommandsWithOptions } from '../../../../../../slash-commands.js';
import { createWorldInfoEntry, loadWorldInfo, saveWorldInfo, world_names } from '../../../../../../world-info.js';

import { log, warn } from '../../lib/log.js';
import { Entry } from './Entry.js';




export class Book {
    /**@type {String}*/ name;
    /**@type {Entry[]}*/ entryList = [];

    get cover() {
        const defaultCover = '/scripts/extensions/third-party/SillyTavern-Codex/img/book.png';
        const re = /{{\/\/codex-book:(.*)}}/;
        const propsEntry = this.entryList.find(it=>re.test(it.content));
        if (!propsEntry) {
            return defaultCover;
        }
        const props = JSON.parse(decodeURIComponent(atob(re.exec(propsEntry.content)[1])));
        return props.cover ?? defaultCover;
    }




    /**
     *
     * @param {String} name The WI book's name
     */
    constructor(name) {
        this.name = name;
    }

    async load() {
        log('BOOK.load', this.name);
        const result = await fetch('/api/worldinfo/get', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ name:this.name }),
        });
        if (result.ok) {
            const data = await loadWorldInfo(this.name);
            for (const uid of Object.keys(data.entries)) {
                const entry = Entry.from(this.name, data.entries[uid]);
                this.addEntry(entry);
            }
        } else {
            toastr.warning(`Failed to load World Info book: ${this.name}`);
            warn(`Failed to load World Info book: ${this.name}`);
        }
        log('/BOOK.load', this);
    }

    addEntry(entry) {
        entry.onSave = (_, changes)=>this.save(entry, changes);
        this.entryList.push(entry);
    }

    async save(entry, changes) {
        const data = await loadWorldInfo(this.name);
        const commands = [
            !changes.includes('content') ? null : ()=>data.entries[entry.uid].content = entry.content,
            !changes.includes('key') ? null : ()=>data.entries[entry.uid].key = entry.keyList,
            !changes.includes('comment') ? null : ()=>data.entries[entry.uid].comment = entry.comment,
            !changes.includes('disable') ? null : ()=>data.entries[entry.uid].disable = entry.isDisabled,
        ].filter(it=>it);
        if (commands.length) {
            commands.forEach(it=>it());
            await saveWorldInfo(this.name, data);
            const currentIndex = Number(/**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select')).value);
            const selectedIndex = world_names.indexOf(this.name);
            if (selectedIndex !== -1 && currentIndex === selectedIndex) {
                document.querySelector('#world_editor_select').dispatchEvent(new Event('change', { bubbles:true }));
            }
        }
    }


    async setCover(url) {
        const re = /{{\/\/codex-book:(.*)}}/;
        const propsEntry = this.entryList.find(it=>re.test(it.content));
        const props = {
            cover: url,
        };
        const data = await loadWorldInfo(this.name);
        let entry;
        if (!propsEntry) {
            entry = createWorldInfoEntry(null, data);
            entry.key = ['codex-book:', 'codex-skip:'];
            entry.disable = true;
        } else {
            entry = data.entries[propsEntry.uid];
        }
        entry.content = `{{//codex-book:${btoa(encodeURIComponent(JSON.stringify(props)))}}}`;
        await saveWorldInfo(this.name, data);
        const currentIndex = Number(/**@type {HTMLSelectElement}*/(document.querySelector('#world_editor_select')).value);
        const selectedIndex = world_names.indexOf(this.name);
        if (selectedIndex !== -1 && currentIndex === selectedIndex) {
            document.querySelector('#world_editor_select').dispatchEvent(new Event('change', { bubbles:true }));
        }
    }
}
