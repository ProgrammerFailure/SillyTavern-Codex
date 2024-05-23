import { eventSource, event_types } from '../../../../../../../script.js';
import { delay } from '../../../../../../utils.js';
import { debounceAsync } from '../../lib/debounce.js';
import { warn } from '../../lib/log.js';




export class Entry {
    static from(book, props) {
        const instance = Object.assign(new this(book), {
            uid: props.uid,
            keyList: props.key,
            secondaryKeyList: props.keysecondary,
            secondaryKeyLogic: props.selectiveLogic,
            comment: props.comment,
            content: props.content,
            isDisabled: props.disable,
            isCaseSensitive: props.caseSensitive,
            isMatchingWholeWords: props.matchWholeWords,
            originalKeyList: props.key.join(', '),
            originalComment: props.comment,
            originalContent: props.content,
        });
        return instance;
    }



    /**@type {string}*/ book;
    /**@type {number}*/ uid;
    /**@type {string[]}*/ keyList;
    /**@type {string[]}*/ secondaryKeyList;
    /**@type {number}*/ secondaryKeyLogic;
    /**@type {string}*/ comment;
    /**@type {string}*/ content;
    /**@type {boolean}*/ isDisabled;
    /**@type {boolean}*/ isCaseSensitive;
    /**@type {boolean}*/ isMatchingWholeWords;

    /**@type {string}*/ originalKeyList;
    /**@type {string}*/ originalComment;
    /**@type {string}*/ originalContent;
    /**@type {boolean}*/ originalIsDisabled;

    /**@type {boolean}*/ isOpeningWorldInfoPanel = false;

    /**@type {()=>Promise}*/ saveDebounced;

    /**@type {function}*/ onSave;

    get isMap() { return this.keyList.includes('codex-map:'); }
    get isCharList() { return this.keyList.find(it=>it.startsWith('codex-chars:')); }

    get title() {
        const key = this.keyList.find(it=>it.startsWith('codex-title:'))?.substring(12);
        if (key) {
            const reKey = /^key\[(\d+)]$/i;
            if (reKey.test(key)) {
                return this.keyList[key.replace(reKey, '$1')];
            }
            return this[key];
        }
        return this.comment.length > 50 ? this.keyList.join(' / ') : (this.comment || this.keyList.join(' / ')) ?? '???';
    }




    constructor(book) {
        this.book = book;

        this.saveDebounced = debounceAsync(async()=>await this.save());
    }


    toJSON() {
        return {
            uid: this.uid,
            key: this.keyList,
            keysecondary: this.secondaryKeyList,
            selectiveLogic: this.secondaryKeyLogic,
            comment: this.comment,
            content: this.content,
            disable: this.isDisabled,
            caseSensitive: this.isCaseSensitive,
            matchWholeWords: this.isMatchingWholeWords,
        };
    }




    async showInWorldInfo() {
        if (this.isOpeningWorldInfoPanel) return;
        this.isOpeningWorldInfoPanel = true;
        const drawer = document.querySelector('#WorldInfo');
        if (!drawer.classList.contains('openDrawer')) {
            document.querySelector('#WI-SP-button > .drawer-toggle').click();
        }
        const sel = document.querySelector('#world_editor_select');
        const bookIndex = Array.from(sel.children).find(it=>it.textContent.trim() == this.book)?.value;
        const afterBookLoaded = async()=>{
            const container = document.querySelector('#world_popup_entries_list');
            let entry = container.querySelector(`.world_entry[uid="${this.uid}"]`);
            if (!entry) {
                while (!entry && !document.querySelector('#world_info_pagination .paginationjs-prev').classList.contains('disabled')) {
                    document.querySelector('#world_info_pagination .paginationjs-prev').click();
                    await delay(100);
                    entry = container.querySelector(`.world_entry[uid="${this.uid}"]`);
                }
                while (!entry && !document.querySelector('#world_info_pagination .paginationjs-next').classList.contains('disabled')) {
                    document.querySelector('#world_info_pagination .paginationjs-next').click();
                    await delay(100);
                    entry = container.querySelector(`.world_entry[uid="${this.uid}"]`);
                }
            }
            if (!entry) return warn('Cannot find entry in WI panel', this);
            if (entry.querySelector('.inline-drawer-toggle .inline-drawer-icon.down')) {
                entry.querySelector('.inline-drawer-toggle').click();
            }
            entry.scrollIntoView();
            entry.classList.add('stcdx--flash');
            await delay(510);
            entry.classList.remove('stcdx--flash');
            this.isOpeningWorldInfoPanel = false;
        };
        if (sel.value != bookIndex) {
            const mo = new MutationObserver(()=>{
                mo.disconnect();
                afterBookLoaded();
            });
            mo.observe(document.querySelector('#world_popup_entries_list'), { childList:true });
            sel.value = bookIndex;
            sel.dispatchEvent(new Event('change'));
        } else {
            afterBookLoaded();
        }
    }




    getChanges() {
        const changes = [];
        if (this.originalComment != this.comment) changes.push('comment');
        if (this.originalContent != this.content) changes.push('content');
        if (this.originalKeyList != this.keyList.join(', ')) changes.push('key');
        if (this.originalIsDisabled != this.isDisabled) changes.push('disable');
        return changes;
    }
    async save() {
        if (this.onSave) {
            const changes = this.getChanges();
            if (changes.length > 0) {
                await this.onSave(this, changes);
                this.originalComment = this.comment;
                this.originalContent = this.content;
                this.originalKeyList = this.keyList.join(', ');
                this.originalIsDisabled = this.isDisabled;
            }
        }
    }
}
