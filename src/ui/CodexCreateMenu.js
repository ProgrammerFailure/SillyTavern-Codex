import { delay } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { Book } from '../st/wi/Book.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';


/**@readonly*/
/**@enum {string}*/
export const STAGE = {
    'TYPE': 'type',
    'BOOK': 'book',
    'KEY': 'key',
};

export class CodexCreateMenu extends CodexBaseEntry {
    /**@type {Book[]} */ bookList;

    /**@type {string} */ type;
    /**@type {string} */ book;
    /**@type {string} */ key;

    /**@type {boolean} */ isTransitioning;

    /**@type {STAGE} */ #stage;
    get stage() { return this.#stage; }
    set stage(value) {
        this.#stage = value;
        this.dom = this.doms[this.stage];
        this.isTransitioning = true;
        (this.onStageChanged?.() ?? Promise.resolve()).then(()=>this.isTransitioning = false);
    }

    /**@type {Object.<STAGE, HTMLElement>} */ doms = {};
    /**@type {HTMLElement} */ keyInput;

    /**@type {()=>Promise} */ onStageChanged;
    /**@type {()=>Promise} */ onCompleted;
    /**@type {()=>Promise} */ onCanceled;




    constructor(settings, matcher, linker, bookList) {
        super(null, settings, matcher, linker);
        this.bookList = bookList;
        this.#stage = STAGE.TYPE;
    }


    async hide() {
        log('[CCM.hide()]');
        for (const key of Object.keys(this.doms)) {
            if (!this.isTransitioning || key != this.stage) {
                log('[CCM.hide()]', key);
                this.doms[key].classList.remove('stcdx--active');
                await delay(this.settings.transitionTime + 10);
                if (!this.doms[key]) return;
                this.doms[key].classList.remove('stcdx--preactive');
                await waitForFrame();
            }
        }
    }

    async show() {
        await super.show();
        if (this.stage == STAGE.KEY) {
            this.keyInput?.focus();
        }
    }


    unrender() {
        log('[CCM.unrender()]');
        for (const key of Object.keys(this.doms)) {
            if (!this.isTransitioning || key != this.stage) {
                log('[CCM.unrender()]', key);
                this.doms[key].remove();
                this.dom = null;
            }
        }
    }
    async render() {
        switch (this.stage) {
            case STAGE.TYPE: {
                this.dom = await this.renderType();
                break;
            }
            case STAGE.KEY: {
                this.dom = await this.renderKey();
                break;
            }
            case STAGE.BOOK: {
                this.dom = await this.renderBook();
                break;
            }
        }
        return this.dom;
    }
    async renderType() {
        const dom = document.createElement('div'); {
            this.doms[STAGE.TYPE] = dom;
            dom.classList.add('stcdx--content');
            dom.classList.add('stcdx--entry');
            dom.classList.add('mes');
            dom.classList.add('stcdx--createMenu');
            const mesWrapper = document.createElement('div'); {
                mesWrapper.classList.add('mes_text');
                const title = document.createElement('h2'); {
                    title.textContent = 'Create Codex Entry';
                    mesWrapper.append(title);
                }
                const subTitle = document.createElement('h3'); {
                    subTitle.textContent = 'Type';
                    mesWrapper.append(subTitle);
                }

                const typeList = document.createElement('div'); {
                    typeList.classList.add('stcdx--typeList');
                    const types = ['Basic Text', 'Map', 'Character List', ...this.settings.entryTypeList.map(it=>`Custom - ${it.name}`)];
                    for (const type of types) {
                        const item = document.createElement('div'); {
                            item.classList.add('menu_button');
                            item.textContent = type;
                            item.addEventListener('click', ()=>{
                                this.type = type;
                                this.stage = STAGE.KEY;
                            });
                            typeList.append(item);
                        }
                    }
                    mesWrapper.append(typeList);
                }
                const actions = document.createElement('div'); {
                    actions.classList.add('stcdx--actions');
                    const cancel = document.createElement('div'); {
                        cancel.classList.add('menu_button');
                        cancel.classList.add('redWarningBG');
                        cancel.textContent = 'Cancel';
                        cancel.addEventListener('click', ()=>{
                            this.type = null;
                            this.key = null;
                            this.book = null;
                            this.#stage = STAGE.TYPE;
                            this.onCanceled?.();
                        });
                        actions.append(cancel);
                    }
                    mesWrapper.append(actions);
                }
                dom.append(mesWrapper);
            }
        }
        return dom;
    }
    async renderKey() {
        const dom = document.createElement('div'); {
            this.doms[STAGE.KEY] = dom;
            dom.classList.add('stcdx--content');
            dom.classList.add('stcdx--entry');
            dom.classList.add('mes');
            dom.classList.add('stcdx--createMenu');
            const mesWrapper = document.createElement('div'); {
                mesWrapper.classList.add('mes_text');
                const title = document.createElement('h2'); {
                    title.textContent = 'Create Codex Entry';
                    mesWrapper.append(title);
                }
                const subTitle = document.createElement('h3'); {
                    subTitle.textContent = 'Key';
                    mesWrapper.append(subTitle);
                }
                const crumbs = document.createElement('div'); {
                    crumbs.classList.add('stcdx--crumbs');
                    crumbs.textContent = [
                        `Type: ${this.type}`,
                    ].join(' | ');
                    mesWrapper.append(crumbs);
                }

                const typeList = document.createElement('div'); {
                    typeList.classList.add('stcdx--typeList');
                    const inp = document.createElement('input'); {
                        this.keyInput = inp;
                        inp.classList.add('text_pole');
                        inp.addEventListener('keydown', async(evt)=>{
                            if (!evt.ctrlKey && !evt.shiftKey && !evt.altKey && evt.key == 'Enter') {
                                this.key = inp.value;
                                this.stage = STAGE.BOOK;
                            }
                        });
                        typeList.append(inp);
                    }
                    const ok = document.createElement('div'); {
                        ok.classList.add('menu_button');
                        ok.textContent = 'OK';
                        ok.addEventListener('click', async()=>{
                            this.key = inp.value;
                            this.stage = STAGE.BOOK;
                        });
                        typeList.append(ok);
                    }
                    mesWrapper.append(typeList);
                }
                const actions = document.createElement('div'); {
                    actions.classList.add('stcdx--actions');
                    const cancel = document.createElement('div'); {
                        cancel.classList.add('menu_button');
                        cancel.classList.add('redWarningBG');
                        cancel.textContent = 'Cancel';
                        cancel.addEventListener('click', ()=>{
                            this.type = null;
                            this.key = null;
                            this.book = null;
                            this.#stage = STAGE.TYPE;
                            this.onCanceled?.();
                        });
                        actions.append(cancel);
                    }
                    mesWrapper.append(actions);
                }
                dom.append(mesWrapper);
            }
        }
        return dom;
    }
    async renderBook() {
        const dom = document.createElement('div'); {
            this.doms[STAGE.BOOK] = dom;
            dom.classList.add('stcdx--content');
            dom.classList.add('stcdx--entry');
            dom.classList.add('mes');
            dom.classList.add('stcdx--createMenu');
            const mesWrapper = document.createElement('div'); {
                mesWrapper.classList.add('mes_text');
                const title = document.createElement('h2'); {
                    title.textContent = 'Create Codex Entry';
                    mesWrapper.append(title);
                }
                const subTitle = document.createElement('h3'); {
                    subTitle.textContent = 'Book';
                    mesWrapper.append(subTitle);
                }
                const crumbs = document.createElement('div'); {
                    crumbs.classList.add('stcdx--crumbs');
                    crumbs.textContent = [
                        `Type: ${this.type}`,
                        `Key: ${this.key}`,
                    ].join(' | ');
                    mesWrapper.append(crumbs);
                }

                const typeList = document.createElement('div'); {
                    typeList.classList.add('stcdx--typeList');
                    const types = [
                        ...this.bookList.map(it=>({ name:it.name, isLoaded:true })),
                        ...[...document.querySelectorAll('#world_editor_select > option:not([value=""])')]
                            .map(it=>({ name:it.textContent, isLoaded:false }))
                            .filter(it=>!this.bookList.find(b=>b.name == it.name))
                        ,
                    ];
                    for (const type of types) {
                        const item = document.createElement('div'); {
                            item.classList.add('menu_button');
                            if (!type.isLoaded) item.classList.add('stcdx--notLoaded');
                            item.textContent = type.name;
                            item.addEventListener('click', async()=>{
                                this.book = type.name;
                                await this.onCompleted?.();
                                this.type = null;
                                this.key = null;
                                this.book = null;
                                this.#stage = STAGE.TYPE;
                            });
                            typeList.append(item);
                        }
                    }
                    mesWrapper.append(typeList);
                }
                const actions = document.createElement('div'); {
                    actions.classList.add('stcdx--actions');
                    const cancel = document.createElement('div'); {
                        cancel.classList.add('menu_button');
                        cancel.classList.add('redWarningBG');
                        cancel.textContent = 'Cancel';
                        cancel.addEventListener('click', ()=>{
                            this.type = null;
                            this.key = null;
                            this.book = null;
                            this.#stage = STAGE.TYPE;
                            this.onCanceled?.();
                        });
                        actions.append(cancel);
                    }
                    mesWrapper.append(actions);
                }
                dom.append(mesWrapper);
            }
        }
        return dom;
    }
}
