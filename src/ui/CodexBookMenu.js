import { POPUP_RESULT } from '../../../../../popup.js';
import { delay } from '../../../../../utils.js';
import { FileExplorer } from '../../../SillyTavern-FileExplorer/src/FileExplorer.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { Book } from '../st/wi/Book.js';
import { Entry } from '../st/wi/Entry.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';



export class CodexBookMenu extends CodexBaseEntry {
    /**@type {Book[]} */ bookList;
    /**@type {HTMLElement} */ mesWrapper;

    /**@type {string} */ book;

    /**@type {(book:Book)=>void} */ onBookSelected;
    /**@type {(book:Book, entry:Entry)=>void} */ onEntrySelected;




    constructor(settings, matcher, linker, bookList) {
        super(null, settings, matcher, linker);
        this.bookList = bookList;
    }



    async render() {
        if (!this.dom) {
            const root = document.createElement('div'); {
                this.dom = root;
                root.classList.add('stcdx--bookMenu');
                root.classList.add('stcdx--content');
                root.classList.add('stcdx--entry');
                root.classList.add('mes');
                const mesWrapper = document.createElement('div'); {
                    this.mesWrapper = mesWrapper;
                    mesWrapper.classList.add('mes_text');
                    root.append(mesWrapper);
                }
            }
        }
        this.mesWrapper.innerHTML = '';
        const book = this.bookList.find(it=>it.name == this.book);
        if (book) {
            const item = document.createElement('div'); {
                item.classList.add('stcdx--book');
                const head = document.createElement('div'); {
                    head.classList.add('stcdx--head');
                    head.addEventListener('click', ()=>{
                        this.onBookSelected?.(book);
                    });
                    const cover = document.createElement('img'); {
                        cover.classList.add('stcdx--cover');
                        cover.src = book.cover;
                        cover.title = 'Click to change cover';
                        cover.addEventListener('click', async()=>{
                            const fe = new FileExplorer('~/user/images/codex');
                            fe.isPicker = true;
                            fe.typeList = ['image'];
                            await fe.show();
                            if (fe.selection) {
                                book.setCover(fe.selection);
                            }
                        });
                        head.append(cover);
                    }
                    const title = document.createElement('h2'); {
                        title.classList.add('stcdx--title');
                        title.textContent = book.name;
                        head.append(title);
                    }
                    item.append(head);
                }
                const entries = document.createElement('div'); {
                    entries.classList.add('stcdx--entries');
                    const el = book.entryList
                        .filter(e=>e.keyList.find(k=>!this.settings.requirePrefix || k.startsWith('codex:')))
                        .filter(e=>!e.keyList.includes('codex-skip:'))
                        .toSorted((a,b)=>a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
                    ;
                    for (const e of el) {
                        const entry = document.createElement('div'); {
                            entry.classList.add('stcdx--item');
                            entry.textContent = e.title;
                            entry.title = e.title;
                            entry.addEventListener('click', ()=>{
                                this.onEntrySelected?.(book, e);
                            });
                            entries.append(entry);
                        }
                    }
                    item.append(entries);
                }
                this.mesWrapper.append(item);
            }
        }
        return this.dom;
    }
}
