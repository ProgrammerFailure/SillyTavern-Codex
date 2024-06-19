import { chat_metadata, eventSource, event_types } from '../../../../../../script.js';
import { dragElement } from '../../../../../RossAscends-mods.js';
import { extension_settings } from '../../../../../extensions.js';
import { executeSlashCommands, executeSlashCommandsWithOptions } from '../../../../../slash-commands.js';
import { delay } from '../../../../../utils.js';

// eslint-disable-next-line no-unused-vars
import { Linker } from '../Linker.js';
import { Match } from '../Match.js';
// eslint-disable-next-line no-unused-vars
import { Matcher } from '../Matcher.js';
// eslint-disable-next-line no-unused-vars
import { Settings } from '../Settings.js';
import { log } from '../lib/log.js';
import { messageFormattingWithLanding } from '../lib/messageFormattingWithLanding.js';
// eslint-disable-next-line no-unused-vars
import { Book } from '../st/wi/Book.js';
import { Entry } from '../st/wi/Entry.js';
import { worldInfoLogic } from '../st/wi/Logic.js';
import { CodexActivateBooksMenu } from './CodexActivateBooksMenu.js';
// eslint-disable-next-line no-unused-vars
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { CodexBookMenu } from './CodexBookMenu.js';
import { CodexBooksMenu } from './CodexBooksMenu.js';
import { CodexCreateMenu } from './CodexCreateMenu.js';
import { CodexEntryFactory } from './CodexEntryFactory.js';

export class Codex {
    /**@type {Settings}*/ settings;
    /**@type {Matcher}*/ matcher;
    /**@type {Linker}*/ linker;
    /**@type {Book[]}*/ #bookList;
    get bookList() { return this.#bookList; }
    set bookList(value) {
        this.#bookList = value;
        if (this.createMenu) this.createMenu.bookList = value;
    }

    /**@type {CodexBaseEntry}*/ content;
    /**@type {CodexBaseEntry}*/ newContent;

    /**@type {CodexCreateMenu}*/ createMenu;
    /**@type {CodexBooksMenu}*/ booksMenu;
    /**@type {CodexActivateBooksMenu}*/ activateBooksMenu;

    /**@type {Match[]}*/ history = [];
    /**@type {Number}*/ historyIdx = 0;
    /**@type {HTMLElement}*/ historyBack;
    /**@type {HTMLElement}*/ historyForward;

    /**@type {HTMLElement}*/ menuTrigger;
    /**@type {HTMLElement}*/ menu;

    /**@type {HTMLElement}*/ searchWrap;
    /**@type {HTMLElement}*/ searchResults;

    /**@type {HTMLElement}*/ edit;
    /**@type {HTMLElement}*/ editHeader;

    /**@type {HTMLElement}*/ dom;

    /**@type {Boolean}*/ isCreating = false;
    get isEditing() { return this.isCreating || (this.content?.isEditing ?? false); }

    get isActive() { return this.dom?.classList?.contains('stcdx--active'); }

    /**@type {(book:Book)=>void}*/ onBookAdded;




    /**
     *
     * @param {Matcher} matcher
     */
    constructor(settings, matcher, linker, bookList) {
        this.settings = settings;
        this.matcher = matcher;
        this.linker = linker;
        this.bookList = bookList;

        this.createMenu = new CodexCreateMenu(settings, matcher, linker, bookList);
        this.createMenu.onStageChanged = async()=>await this.showCreateMenu();
        this.createMenu.onCanceled = async()=>{
            await this.showBooksMenu();
        };
        this.createMenu.onCompleted = async()=>{
            let book = this.bookList.find(it=>it.name == this.createMenu.book);
            if (!book) {
                book = new Book(this.createMenu.book);
                await book.load();
                this.bookList.push(book);
                this.onBookAdded?.(book);
            }
            const key = this.createMenu.key;
            const type = this.createMenu.type;
            const typeContent = {
                'Map': `{{//codex-map:${btoa(encodeURIComponent(JSON.stringify({})))}}}`,
                'Character List': `{{//codex-chars:${btoa(encodeURIComponent(JSON.stringify({})))}}}`,
                'Basic Text': 'YOUR CONTENT HERE',
            };
            for (const et of this.settings.entryTypeList) {
                typeContent[`Custom - ${et.name}`] = [
                    et.prefix,
                    ...et.sectionList.map(it=>[it.prefix, it.suffix].filter(it=>it)).flat(),
                    et.suffix,
                    `{{//codex-type:${btoa(encodeURIComponent(JSON.stringify(et)))}}}`,
                ].filter(it=>it).join('\n');
            }
            eventSource.once(event_types.WORLDINFO_UPDATED, (...args)=>log('WIUP', ...args));

            const entry = Entry.from(book.name, { uid:null, key:[...`${key}`.split(/\s*,\s*/)], keysecondary:[], selectiveLogic:worldInfoLogic.AND_ANY, comment:'', content:typeContent[type], disable:false });
            this.isCreating = true;
            executeSlashCommands(`/createentry file="${book.name}" key="${key}" ${typeContent[type]}`).then(async(result)=>{
                entry.uid = result?.pipe;
                if (type.startsWith('Custom -')) {
                    const et = this.settings.entryTypeList.find(it=>`Custom - ${it.name}` == type);
                    let fields = et.defaultFieldValueList;
                    const roleValue = fields.find(it=>it.field == 'role');
                    if (roleValue) {
                        fields.splice(fields.indexOf(roleValue), 1);
                        fields.unshift(roleValue);
                    }
                    for (const dv of fields) {
                        log('[SEF]', dv);
                        await executeSlashCommandsWithOptions(`/setentryfield file="${book.name}" uid=${entry.uid} field="${dv.field}" ${dv.value.replace(/{/g, '\\{')}`);
                    }
                }
            });
            book.addEntry(entry);
            await this.show(new Match(book.name, entry));
            this.toggleEditor();
            // await wiPromise;
            this.isCreating = false;
        };

        this.booksMenu = new CodexBooksMenu(settings, matcher, linker, bookList);
        this.booksMenu.onBookSelected = async(book)=>{
            this.showBookMenu(book.name);
        };
        this.booksMenu.onEntrySelected = async(book, entry)=>{
            this.show(new Match(book.name, entry));
        };

        this.bookMenu = new CodexBookMenu(settings, matcher, linker, bookList);
        this.bookMenu.onEntrySelected = async(book, entry)=>{
            this.show(new Match(book.name, entry));
        };

        this.activateBooksMenu = new CodexActivateBooksMenu(settings, matcher, linker, bookList);
        this.activateBooksMenu.onCanceled = async()=>await this.showBooksMenu();
        this.activateBooksMenu.onApplied = async()=>{
            await this.activateBooksMenu.hide();
        };
    }

    startReload() {
        this.dom?.classList?.add('stcdx--isReloading');
    }
    stopReload(books) {
        this.bookList = books;
        const currentMatch = this.history[this.historyIdx];
        this.history = this.history
            .map(match=>this.bookList.find(book=>book.name == match.book)?.entryList?.find(entry=>entry.uid == match.entry.uid))
            .filter(it=>it)
            .map(entry=>new Match(entry.book, entry))
        ;
        this.history = this.history.filter(it=>it);
        if (this.dom) {
            if (this.dom.classList.contains('stcdx--active')) {
                if (this.content == this.booksMenu) {
                    this.showBooksMenu();
                } else if (this.content == this.bookMenu) {
                    this.showBookMenu(this.bookMenu.book);
                } else if (this.history.length == 0) {
                    this.content?.unrender();
                    this.content = null;
                    this.showBooksMenu();
                } else {
                    const currentIndex = this.history.findIndex(match=>match.book == currentMatch.book && match.entry.uid == currentMatch.entry.uid);
                    if (currentIndex == -1) {
                        this.historyIdx = this.history.length - 1;
                    } else {
                        this.historyIdx = currentIndex;
                    }
                    this.show(this.history[this.historyIdx], true);
                }
            }
            this.updateHistoryButtons();
            this.renderMenu();
            this.dom.classList?.remove('stcdx--isReloading');
        }
    }




    goBack() {
        if (this.historyIdx > 0) {
            this.historyIdx--;
            this.show(this.history[this.historyIdx], true);
        }
        this.updateHistoryButtons();
    }

    goForward() {
        if (this.historyIdx + 1 < this.history.length) {
            this.historyIdx++;
            this.show(this.history[this.historyIdx], true);
        }
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        this.historyBack.classList[this.historyIdx == 0 ? 'add' : 'remove']('stcdx--disabled');
        this.historyForward.classList[this.historyIdx + 1 >= this.history.length ? 'add' : 'remove']('stcdx--disabled');
    }

    addToHistory(match) {
        if (this.history.length > 0 && this.history[this.historyIdx].entry == match.entry) return;
        while (this.historyIdx + 1 < this.history.length) this.history.pop();
        this.history.push(match);
        while (this.history.length > this.settings.historyLength) this.history.shift();
        this.historyIdx = this.history.length - 1;
        this.updateHistoryButtons();
    }


    performSearch(query) {
        const text = query.trim().toLowerCase();
        if (text.length == 0) {
            this.searchResults?.remove();
            this.searchResults = null;
            return;
        }
        const keyTest = (e)=>e.keyList
            .filter(k=>!k.startsWith('codex-tpl:') && !k.startsWith('codex-title:') && !k.startsWith('codex-map:'))
            .find(k=>(!this.settings.requirePrefix || k.startsWith('codex:')) && k.toLowerCase().replace(/^codex:/,'').includes(text))
        ;
        let entries = [
            ...this.matcher.findMatches(text)
                .map(m=>m.entry)
            ,
            ...this.bookList
                .map(b=>b.entryList)
                .flat()
                .filter(e=>!e.keyList.includes('codex-skip:'))
                .filter(e=>keyTest(e) || e.comment.toLowerCase().includes(text))
            ,
        ];
        if (entries.length == 0) {
            this.searchResults?.remove();
            this.searchResults = null;
            return;
        }
        entries = entries.filter((m, idx)=>entries.indexOf(m) == idx);
        const results = this.searchResults ?? document.createElement('div'); {
            this.searchResults = results;
            results.classList.add('stcdx--results');
            results.innerHTML = '';
            entries.forEach(entry=>{
                const ce = CodexEntryFactory.create(entry, this.settings, this.matcher, this.linker);
                const item = document.createElement('div'); {
                    item.classList.add('stcdx--result');
                    item.textContent = `${entry.book}: ${ce.title}`;
                    item.addEventListener('mousedown', ()=>this.show(new Match(entry.book, entry)));
                    results.append(item);
                }
            });
            this.searchWrap.append(results);
        }
    }

    hideSearchResults() {
        this.searchResults?.remove();
    }
    showSearchResults() {
        if (this.searchResults) {
            this.searchWrap.append(this.searchResults);
        }
    }




    renderMenu() {
        this.menu?.remove();
        const menu = document.createElement('ul'); {
            this.menu = menu;
            menu.classList.add('stcdx--books');
            const createLi = document.createElement('li'); {
                createLi.classList.add('stcdx--book');
                createLi.addEventListener('click', ()=>this.showCreateMenu());
                const name = document.createElement('div'); {
                    name.classList.add('stcdx--name');
                    name.textContent = 'Create Codex Entry';
                    name.title = 'Create a new Codex Entry';
                    createLi.append(name);
                }
                menu.append(createLi);
            }
            const sep = document.createElement('li'); {
                sep.classList.add('stcdx--sep');
                menu.append(sep);
            }
            this.bookList.toSorted((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).forEach(book=>{
                const entries = book.entryList
                    .filter(e=>e.keyList.find(k=>!this.settings.requirePrefix || k.startsWith('codex:')))
                    .filter(e=>!e.keyList.includes('codex-skip:'))
                    .map(e=>CodexEntryFactory.create(e, this.settings, this.matcher, this.linker))
                    .toSorted((a,b)=>a.title.localeCompare(b.title))
                ;
                if (entries.length == 0) return;
                const li = document.createElement('li'); {
                    li.classList.add('stcdx--book');
                    const name = document.createElement('div'); {
                        name.classList.add('stcdx--name');
                        name.textContent = `${book.name}`;
                        name.addEventListener('click', ()=>this.showBookMenu(book.name));
                        li.append(name);
                    }
                    const entryList = document.createElement('ul'); {
                        entryList.classList.add('stcdx--entries');
                        entries.forEach(entry=>{
                            const link = document.createElement('li'); {
                                link.classList.add('stcdx--entry');
                                link.textContent = entry.title;
                                link.title = entry.title;
                                link.addEventListener('click', (evt)=>{
                                    this.show(new Match(book.name, entry.entry));
                                });
                                entryList.append(link);
                            }
                        });
                        li.append(entryList);
                    }
                    menu.append(li);
                }
            });
            this.menuTrigger.append(menu);
        }
    }
    rerender() {
        if (!this.content) return;
        this.show(new Match(this.content.entry.book, this.content.entry), false, true);
    }
    render() {
        if (!this.dom) {
            const root = document.createElement('div'); {
                this.dom = root;
                root.id = 'stcdx--codex';
                root.classList.add('stcdx--root');
                root.classList.add('stcdx--codex');
                // root.classList.add('draggable');
                const head = document.createElement('div'); {
                    head.classList.add('stcdx--header');
                    const home = document.createElement('div'); {
                        home.classList.add('stcdx--action');
                        home.classList.add('stcdx--home');
                        home.classList.add('fa-solid');
                        home.classList.add('fa-house');
                        home.title = 'Home';
                        home.addEventListener('click', ()=>this.showBooksMenu());
                        head.append(home);
                    }
                    const menuTrigger = document.createElement('div'); {
                        this.menuTrigger = menuTrigger;
                        menuTrigger.classList.add('stcdx--action');
                        menuTrigger.classList.add('stcdx--menu');
                        menuTrigger.textContent = '≡';
                        menuTrigger.title = 'Entries';
                        menuTrigger.addEventListener('click', ()=>{
                            this.menu.classList.toggle('stcdx--active');
                        });
                        this.renderMenu();
                        head.append(menuTrigger);
                    }
                    const settingsTrigger = document.createElement('div'); {
                        settingsTrigger.classList.add('stcdx--action');
                        settingsTrigger.classList.add('fa-solid');
                        settingsTrigger.classList.add('fa-cog');
                        settingsTrigger.title = 'Codex Settings';
                        settingsTrigger.addEventListener('click', ()=>{
                            this.settings.toggle();
                        });
                        head.append(settingsTrigger);
                    }
                    const back = document.createElement('div'); {
                        this.historyBack = back;
                        back.classList.add('stcdx--action');
                        back.classList.add('stcdx--back');
                        back.classList.add('stcdx--disabled');
                        back.textContent = '↩';
                        back.title = 'Back';
                        back.addEventListener('click', ()=>this.goBack());
                        head.append(back);
                    }
                    const forward = document.createElement('div'); {
                        this.historyForward = forward;
                        forward.classList.add('stcdx--action');
                        forward.classList.add('stcdx--forward');
                        forward.classList.add('stcdx--disabled');
                        forward.textContent = '↪';
                        forward.title = 'Forward';
                        forward.addEventListener('click', ()=>this.goForward());
                        head.append(forward);
                    }
                    const search = document.createElement('div'); {
                        this.searchWrap = search;
                        search.classList.add('stcdx--search');
                        const inp = document.createElement('input'); {
                            inp.classList.add('stcdx--searchInput');
                            inp.classList.add('text_pole');
                            inp.type = 'search';
                            inp.placeholder = 'search codex';
                            inp.addEventListener('blur', ()=>this.hideSearchResults());
                            inp.addEventListener('focus', ()=>this.showSearchResults());
                            inp.addEventListener('input', ()=>this.performSearch(inp.value));
                            search.append(inp);
                        }
                        head.append(search);
                    }
                    const editHeader = document.createElement('div'); {
                        this.editHeader = editHeader;
                        editHeader.classList.add('stcdx--editHeader');
                        head.append(editHeader);
                    }
                    const edit = document.createElement('div'); {
                        this.edit = edit;
                        edit.classList.add('stcdx--action');
                        edit.classList.add('stcdx--edit');
                        edit.classList.add('stcdx--disabled');
                        edit.textContent = '✎';
                        edit.title = 'Edit entry\n——————————\n[Ctrl]+[Click] to open in World Info editor';
                        edit.addEventListener('click', async(evt)=>{
                            if (evt.ctrlKey) {
                                this.content.entry.showInWorldInfo();
                            } else {
                                this.toggleEditor();
                            }
                        });
                        head.append(edit);
                    }
                    const drag = document.createElement('div'); {
                        drag.id = 'stcdx--codexheader';
                        drag.classList.add('stcdx--action');
                        drag.classList.add('stcdx--drag');
                        drag.classList.add('fa-solid');
                        drag.classList.add('fa-grip');
                        drag.classList.add('drag-grabber');
                        head.append(drag);
                    }
                    const max = document.createElement('div'); {
                        max.classList.add('stcdx--action');
                        max.classList.add('stcdx--max');
                        max.textContent = '◱';
                        max.title = 'Maximize';
                        max.addEventListener('click', ()=>{
                            root.classList.toggle('stcdx--maximized');
                        });
                        head.append(max);
                    }
                    const close = document.createElement('div'); {
                        close.classList.add('stcdx--close');
                        close.classList.add('stcdx--action');
                        close.classList.add('fa-solid');
                        close.classList.add('fa-circle-xmark');
                        close.title = 'Close';
                        close.addEventListener('click', ()=>this.hide());
                        head.append(close);
                    }
                    root.append(head);
                }
                document.body.append(root);
                // this.showBooksMenu();
                dragElement($(root));
            }
        } else if (!this.dom.parentElement) {
            // workaround for Ross escape
            document.body.append(this.dom);
        }
        return this.dom;
    }
    unrender() {
        this.dom?.remove();
        this.dom = null;
    }


    async showCreateMenu() {
        await this.transitionToNewContent(this.createMenu);
    }

    async showBooksMenu() {
        if (this.bookList.length == 0) {
            await this.showActivateBooksMenu();
        } else {
            await this.transitionToNewContent(this.booksMenu);
        }
    }

    async showBookMenu(book) {
        this.bookMenu.book = book;
        await this.transitionToNewContent(this.bookMenu);
    }

    async showActivateBooksMenu() {
        await this.transitionToNewContent(this.activateBooksMenu);
    }




    /**
     *
     * @param {Match} match
     */
    async show(match = null, isHistory = false, isForced = false) {
        if (this.isEditing && !this.isCreating) await this.toggleEditor();
        this.render().classList.add('stcdx--active');
        if (match) {
            /**@type {CodexBaseEntry}*/
            let content = CodexEntryFactory.create(match.entry, this.settings, this.matcher, this.linker);
            const transitioned = await this.transitionToNewContent(content);
            if (!isHistory && transitioned) {
                this.addToHistory(match);
            }
        } else if (this.content) {
            await this.content.show();
        } else {
            await this.showBooksMenu();
        }
        this.updateVars();
    }
    async transitionToNewContent(content) {
        // if (content == this.content) {
        //     await this.content.show();
        //     return;
        // }
        this.newContent = content;
        if (this.content == content) {
            await this.content.hide();
            this.content.unrender();
            this.dom.append(await content.render());
            await content.show();
        } else {
            this.dom.append(await content.render());
            await Promise.all([
                this.content?.hide(),
                content.show(),
            ]);
            this.content?.unrender();
        }
        if (this.newContent == content) {
            this.content = content;
            this.newContent = null;
            this.edit.classList.remove('stcdx--disabled');
            if (this.dom.children.length > 2) {
                //HACK cleanup in case some content stuff is left over from timing issues and the like...
                [...this.dom.children].slice(1).filter(it=>it != this.content.dom).forEach(it=>it.remove());
            }
            return true;
        } else {
            content.unrender();
            return false;
        }
    }

    async cycle(matches) {
        for (const match of matches) {
            await this.show(match);
            await delay(this.settings.cycleDelay);
        }
    }

    /**
     *
     * @param {Match} match
     */
    async toggle(match = null) {
        if (match) {
            if (match.entry == this.content?.entry) {
                if (this.isActive) {
                    await this.hide();
                } else {
                    await this.show();
                }
            } else {
                await this.show(match);
            }
        } else {
            if (this.isActive) {
                await this.hide();
            } else {
                await this.show();
            }
        }
    }

    async hide() {
        if (this.isEditing) {
            await this.content?.toggleEditor();
        }
        this.dom?.classList?.remove('stcdx--active');
        await delay(this.settings.transitionTime + 10);
    }

    zoom(idx) {
        // @ts-ignore
        Array.from(this.content?.dom?.querySelectorAll('img, canvas') ?? [])[idx]?.click();
    }

    async toggleEditor() {
        if (!this.isEditing) {
            this.editHeader.textContent = `${this.content?.entry?.book}: (${this.content?.entry?.uid}) ${this.content?.title}`;
            this.dom.classList.add('stcdx--isEditing');
        }
        await this.content?.toggleEditor();
        if (!this.isEditing) {
            this.dom.classList.remove('stcdx--isEditing');
            this.renderMenu();
        }
    }

    async updateVars() {
        let content;
        let vars;
        while (this.isActive) {
            await delay(1000);
            if (!this.content?.dom) continue;
            if (content != this.content) {
                content = this.content;
                vars = {
                    global: {},
                    local: {},
                };
            }
            for (const v of [...this.content.dom.querySelectorAll('.stcdx--var')]) {
                const name = v.getAttribute('data-var');
                const scope = v.getAttribute('data-scope') || 'local';
                const val = scope == 'global' ?
                    (extension_settings.variables.global[name] ?? '')
                    : (chat_metadata.variables[name] ?? '')
                ;
                if (vars[scope][name] != val) {
                    v.innerHTML = messageFormattingWithLanding(`§§STCDX§§${val}§§/STCDX§§`).replace(/^.*§§STCDX§§(.*)§§\/STCDX§§.*$/s, '$1');
                    vars[scope][name] = val;
                }
            }
        }
    }
}
