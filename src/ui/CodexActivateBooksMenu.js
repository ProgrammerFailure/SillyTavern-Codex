import { delay } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { Book } from '../st/wi/Book.js';
import { Entry } from '../st/wi/Entry.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';



export class CodexActivateBooksMenu extends CodexBaseEntry {
    /**@type {Book[]} */ bookList;
    /**@type {HTMLElement} */ bookListDom;

    /**@type {string[]} */ newBookList = [];

    /**@type {()=>void} */ onCanceled;
    /**@type {()=>void} */ onApplied;




    constructor(settings, matcher, linker, bookList) {
        super(null, settings, matcher, linker);
        this.bookList = bookList;
    }



    async render() {
        if (!this.dom) {
            const root = document.createElement('div'); {
                this.dom = root;
                root.classList.add('stcdx--activateBooksMenu');
                root.classList.add('stcdx--content');
                root.classList.add('stcdx--entry');
                root.classList.add('mes');
                const mesWrapper = document.createElement('div'); {
                    mesWrapper.classList.add('mes_text');
                    const head = document.createElement('h2'); {
                        head.textContent = 'No Books Selected';
                        head.append(document.createElement('br'));
                        const subhead = document.createElement('small'); {
                            subhead.textContent = 'pick some books to activate';
                            head.append(subhead);
                        }
                        mesWrapper.append(head);
                    }
                    const books = document.createElement('div'); {
                        this.bookListDom = books;
                        books.classList.add('stcdx--books');
                        mesWrapper.append(books);
                    }
                    const actions = document.createElement('div'); {
                        actions.classList.add('stcdx--actions');
                        const ok = document.createElement('div'); {
                            ok.classList.add('menu_button');
                            ok.textContent = 'OK';
                            ok.addEventListener('click', ()=>{
                                const opts = /**@type {HTMLOptionElement[]}*/([...document.querySelectorAll('#world_info > option')]);
                                for (const opt of opts) {
                                    opt.selected = this.newBookList.includes(opt.textContent);
                                }
                                document.querySelector('#world_info').dispatchEvent(new Event('change', { bubbles:true }));
                                this.onApplied?.();
                            });
                            actions.append(ok);
                        }
                        const cancel = document.createElement('div'); {
                            cancel.classList.add('menu_button');
                            cancel.classList.add('redWarningBG');
                            cancel.textContent = 'Cancel';
                            cancel.addEventListener('click', ()=>{
                                this.onCanceled?.();
                            });
                            actions.append(cancel);
                        }
                        mesWrapper.append(actions);
                    }
                    root.append(mesWrapper);
                }
            }
        }
        this.bookListDom.innerHTML = '';
        const books = [...document.querySelectorAll('#world_editor_select > option:not([value=""])')]
            .map(it=>it.textContent)
        ;
        this.newBookList = this.bookList.map(it=>it.name);
        for (const book of books) {
            const item = document.createElement('label'); {
                item.classList.add('stcdx--book');
                const cb = document.createElement('input'); {
                    cb.type = 'checkbox';
                    cb.checked = this.bookList.find(it=>it.name == book) != null;
                    cb.addEventListener('click', ()=>{
                        if (cb.checked) {
                            if (!this.newBookList.includes(book)) {
                                this.newBookList.push(book);
                            }
                        } else if (this.newBookList.includes(book)) {
                            this.newBookList.splice(this.newBookList.indexOf(book), 1);
                        }
                    });
                    item.append(cb);
                }
                const name = document.createElement('div'); {
                    name.textContent = book;
                    item.append(name);
                }
                this.bookListDom.append(item);
            }
        }
        return this.dom;
    }
}
