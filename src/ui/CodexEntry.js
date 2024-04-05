import { delay } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';




export class CodexEntry extends CodexBaseEntry {
    /**@type {HTMLDivElement}*/ editor;

    get tabParts() {
        const levelRegex = new RegExp(`(?=${'#'.repeat(this.settings.tabsLevel)}\\s)`);
        return this.entry.content
            .split(levelRegex)
            .map(it=>{
                const [title, content] = it.split(/(?<=###.*)\n/);
                return {
                    title: content === undefined ? '' : title,
                    content: content ?? title,
                    tab: null,
                };
            })
        ;
    }




    async unrender() {
        super.unrender();
    }
    async render(isUpdate = false, noTabs = false) {
        let oldDom;
        if (isUpdate || !this.dom) {
            oldDom = this.dom;
            const dom = document.createElement('div'); {
                this.dom = dom;
                dom.classList.add('stcdx--content');
                dom.classList.add('stcdx--entry');
                dom.classList.add('mes');
                if (!noTabs && this.settings.tabs && this.tabParts.find(it=>it.title.length > 0)) {
                    dom.append(...this.renderTabs());
                } else {
                    const mesWrapper = document.createElement('div'); {
                        mesWrapper.classList.add('mes_text');
                        mesWrapper.append(...this.renderTemplate(this.entry));
                        dom.append(mesWrapper);
                    }
                }
                const imgLoadList = [];
                Array.from(dom.querySelectorAll('img')).forEach(img=>{
                    img.addEventListener('click', ()=>this.zoomImage(img));
                    imgLoadList.push(new Promise(resolve=>{
                        if (img.complete) return resolve();
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                    }));
                });
                await Promise.all(imgLoadList);
            }
        }
        if (isUpdate && oldDom) {
            oldDom.replaceWith(this.dom);
        }
        return this.dom;
    }
    renderTabs() {
        const showTab = (part)=>{
            Array.from(head.querySelectorAll('.stcdx--active')).forEach(it=>it.classList.remove('stcdx--active'));
            part.tab.classList.add('stcdx--active');
            body.innerHTML = '';
            body.append(...this.renderTemplateText(
                this.entry,
                `${part.title}\n${part.content}`,
                this.getTemplate(this.entry, 'tab-template'),
            ));
        };
        const parts = this.tabParts;
        let fixed;
        if (parts[0].title == '') {
            const fixedPart = parts.shift().content ?? '';
            fixed = document.createElement('div'); {
                fixed.classList.add('mes_text');
                fixed.append(...this.renderTemplateText(this.entry, fixedPart, this.getTemplate(this.entry)));
            }
        }
        let head;
        let body;
        const wrapper = document.createElement('div'); {
            wrapper.classList.add('stcdx--tabs');
            head = document.createElement('div'); {
                head.classList.add('stcdx--head');
                for (const part of parts) {
                    const tab = document.createElement('div'); {
                        part.tab = tab;
                        tab.classList.add('stcdx--tab');
                        tab.textContent = part.title.trim().replace(/^#+/, '');
                        tab.addEventListener('click', ()=>{
                            showTab(part);
                        });
                        head.append(tab);
                    }
                }
                wrapper.append(head);
            }
            body = document.createElement('div'); {
                body.classList.add('stcdx--body');
                body.classList.add('mes_text');
                wrapper.append(body);
            }
        }
        showTab(parts[0]);
        return [fixed, wrapper].filter(it=>it);
    }


    async zoomImage(img) {
        const rect = img.getBoundingClientRect();
        let clone;
        const blocker = document.createElement('div'); {
            blocker.classList.add('stcdx--blocker');
            blocker.addEventListener('click', async()=>{
                const rect = img.getBoundingClientRect();
                blocker.classList.remove('stcdx--active');
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                await delay(this.settings.zoomTime + 10);
                blocker.remove();
            });
            clone = document.createElement('img'); {
                clone.classList.add('stcdx--clone');
                clone.src = img.src;
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                blocker.append(clone);
            }
            document.body.append(blocker);
        }
        await delay(10);
        blocker.classList.add('stcdx--active');
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
    }


    async toggleEditor() {
        log('CodexEntry.toggleEditor');
        if (this.isTogglingEditor) return;
        this.isTogglingEditor = true;
        if (this.isEditing) {
            await this.entry.saveDebounced();
            await this.render(true);
            this.dom.classList.add('stcdx--preactive');
            await waitForFrame();
            this.dom.classList.add('stcdx--active');
            this.editor.classList.remove('stcdx--active');
            await delay(this.settings.transitionTime + 10);
            this.editor.classList.remove('stcdx--preactive');
            this.editor.remove();
            this.editor = null;
            this.isEditing = false;
        } else {
            this.isEditing = true;
            let editor;
            const wrapper = document.createElement('div'); {
                this.editor = wrapper;
                wrapper.classList.add('stcdx--editor');
                const title = document.createElement('input'); {
                    title.classList.add('text_pole');
                    title.classList.add('stcdx--editor-title');
                    title.placeholder = 'Title / Memo';
                    title.title = 'Title / Memo';
                    title.value = this.entry.comment;
                    title.addEventListener('input', async()=>{
                        if (!this.isEditing || this.isTogglingEditor) return;
                        this.entry.comment = title.value;
                        // this.entry.saveDebounced();
                    });
                    wrapper.append(title);
                }
                const keywords = document.createElement('input'); {
                    keywords.classList.add('text_pole');
                    keywords.classList.add('stcdx--editor-tags');
                    keywords.placeholder = 'Primary Keywords';
                    keywords.title = 'Primary Keywords';
                    keywords.value = this.entry.keyList.join(', ');
                    keywords.addEventListener('input', async()=>{
                        if (!this.isEditing || this.isTogglingEditor) return;
                        this.entry.keyList = keywords.value.split(/\s*,\s*/);
                        // this.entry.saveDebounced();
                    });
                    wrapper.append(keywords);
                }
                const actions = document.createElement('div'); {
                    actions.classList.add('stcdx--editor-actions');
                    const wi = document.createElement('div'); {
                        wi.classList.add('menu_button');
                        wi.textContent = 'Open in WI Panel';
                        wi.addEventListener('click', ()=>{
                            this.toggleEditor();
                            this.entry.showInWorldInfo();
                        });
                        actions.append(wi);
                    }
                    const del = document.createElement('div'); {
                        del.classList.add('menu_button');
                        del.classList.add('redWarningBG');
                        del.textContent = 'Delete';
                        //TODO no exported function or slash command to delete WI entries
                        // actions.append(del);
                    }
                    wrapper.append(actions);
                }
                editor = document.createElement('textarea'); {
                    editor.classList.add('text_pole');
                    editor.classList.add('stcdx--editor-content');
                    editor.value = this.entry.content;
                    editor.addEventListener('input', async()=>{
                        if (!this.isEditing || this.isTogglingEditor) return;
                        this.entry.content = editor.value;
                        // this.entry.saveDebounced();
                    });
                    wrapper.append(editor);
                }
                this.dom.insertAdjacentElement('afterend', wrapper);
            }
            wrapper.classList.add('stcdx--preactive');
            await waitForFrame();
            this.dom.classList.remove('stcdx--active');
            wrapper.classList.add('stcdx--active');
            await delay(this.settings.transitionTime + 10);
            this.dom.classList.remove('stcdx--preactive');
            editor.selectionStart = 0;
            editor.selectionEnd = 0;
            editor.focus();
        }
        this.isTogglingEditor = false;
        log('/CodexEntry.toggleEditor');
        while (this.isEditing) await delay(100);
    }
}
