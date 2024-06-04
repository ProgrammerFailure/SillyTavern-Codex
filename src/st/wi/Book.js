// eslint-disable-next-line no-unused-vars
import { getRequestHeaders } from '../../../../../../../script.js';
import { executeSlashCommands, executeSlashCommandsWithOptions } from '../../../../../../slash-commands.js';

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
            const data = await result.json();
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
        const commands = [
            !changes.includes('content') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=content ${entry.content.replace(/([{}|])/g, '\\$1')}`,
            !changes.includes('key') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=key ${entry.keyList.map(it=>it.replace(/([{}|])/g, '\\$1')).join(', ')}`,
            !changes.includes('comment') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=comment ${entry.comment.replace(/([{}|])/g, '\\$1')}`,
            !changes.includes('disable') ? null : `/setentryfield file="${this.name}" uid=${entry.uid} field=disable ${entry.isDisabled.toString()}`,
        ];
        await executeSlashCommands(commands.filter(it=>it).join(' | '));
    }


    async setCover(url) {
        const re = /{{\/\/codex-book:(.*)}}/;
        const propsEntry = this.entryList.find(it=>re.test(it.content));
        const props = {
            cover: url,
        };
        if (!propsEntry) {
            const uid = (await executeSlashCommandsWithOptions(`/createentry file="${this.name}" key="codex-book:, codex-skip:" \\{\\{//codex-book:${btoa(encodeURIComponent(JSON.stringify(props)))}}}`)).pipe;
            await executeSlashCommandsWithOptions(`/setentryfield file="${this.name}" uid=${uid} field=disable true`);
        } else {
            await executeSlashCommandsWithOptions(`/setentryfield file="${this.name}" uid=${propsEntry.uid} field=content \\{\\{//codex-book:${btoa(encodeURIComponent(JSON.stringify(props)))}}}`);
        }
    }
}
