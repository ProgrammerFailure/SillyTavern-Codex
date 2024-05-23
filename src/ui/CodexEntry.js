import { messageFormatting } from '../../../../../../script.js';
import { executeSlashCommands } from '../../../../../slash-commands.js';
import { delay } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { waitForFrame } from '../lib/wait.js';
import { Entry } from '../st/wi/Entry.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { EntrySection } from './EntrySection.js';
import { EntryType } from './EntryType.js';




export class CodexEntry extends CodexBaseEntry {
    /**@type {HTMLDivElement}*/ editor;




    /**
     *
     * @param {EntryType} current
     * @returns
     */
    getType(current = null) {
        const typeRe = /{{\/\/codex-type:(.+?)}}/;
        /**@type {EntryType} */
        let type;
        if (typeRe.test(this.entry.content)) {
            type = EntryType.from(JSON.parse(decodeURIComponent(atob(typeRe.exec(this.entry.content)[1]))));
            log('[TYPE]', type);
            current = current ?? this.settings.entryTypeList.find(it=>it.id == type.id);
            if (!current) {
                alert(`entry type does not exist anymore: ${type.name} (${type.id})`);
            } else if (current.id != type.id) {
                // IDs don't match
            } else {
                let isChanged = false;
                // check type
                if (type.name != current.name) {
                    type.name = current.name;
                    isChanged = true;
                }
                if (type.prefix != current.prefix) {
                    type.prefix = current.prefix;
                    isChanged = true;
                }
                if (type.suffix != current.suffix) {
                    type.suffix = current.suffix;
                    isChanged = true;
                }
                // check sections
                const oldSections = [...type.sectionList];
                const addedSections = [];
                while (type.sectionList.pop());
                for (const sec of current.sectionList) {
                    const idx = oldSections.findIndex(it=>it.id == sec.id);
                    if (idx == -1) {
                        const nsec = EntrySection.from(sec);
                        type.sectionList.push(nsec);
                        addedSections.push(nsec);
                        isChanged = true;
                    } else {
                        const osec = oldSections[idx];
                        osec.isRemoved = false;
                        if (osec.name != sec.name) {
                            osec.name = sec.name;
                            isChanged = true;
                        }
                        if (osec.prefix != sec.prefix) {
                            osec.prefix = sec.prefix;
                            isChanged = true;
                        }
                        if (osec.suffix != sec.suffix) {
                            osec.suffix = sec.suffix;
                            isChanged = true;
                        }
                        type.sectionList.push(osec);
                        oldSections.splice(idx, 1);
                    }
                }
                // these sections don't exist anymore
                for (const osec of oldSections) {
                    if (osec.content.length > 0) {
                        const nsec = addedSections.find(it=>it.name.toLowerCase() == osec.name.toLowerCase());
                        if (nsec) {
                            nsec.content = osec.content;
                        } else {
                            osec.isRemoved = true;
                            type.sectionList.push(osec);
                        }
                    }
                    isChanged = true;
                }
                if (isChanged) {
                    this.entry.content = [
                        type.prefix,
                        ...type.sectionList.filter(it=>it.content.length > 0).map(it=>[it.prefix, it.content, it.suffix].filter(it=>it)).flat(),
                        type.suffix,
                        `{{//codex-type:${btoa(encodeURIComponent(JSON.stringify(type)))}}}`,
                    ].filter(it=>it).join('\n');
                }
            }
        }
        return type;
    }




    /**
     *
     * @param {Entry} entry
     */
    renderTemplate(entry) {
        let template = this.settings.templateList.find(tpl=>tpl.name == entry.keyList.find(it=>it.startsWith('codex-tpl:'))?.substring(10))?.content ?? this.settings.template;
        let messageText = this.subParams(entry.content);
        messageText = template
            .replace(/{{comment}}/g, entry.comment)
            .replace(/{{comment::url}}/g, encodeURIComponent(entry.comment))
            .replace(/{{content}}/g, this.renderContent())
            .replace(/{{content::url}}/g, encodeURIComponent(entry.content))
            .replace(/{{key\[(\d+)\]}}/g, (_,idx)=>entry.keyList[idx])
            .replace(/{{key\[(\d+)\]::url}}/g, (_,idx)=>encodeURIComponent(entry.keyList[idx]))
            .replace(/{{title}}/g, entry.title)
            .replace(/{{title::url}}/g, encodeURIComponent(entry.title))
        ;
        messageText = messageFormatting(
            messageText,
            'Codex',
            false,
            false,
            null,
        );
        const dom = document.createElement('div');
        dom.innerHTML = messageText;
        this.linker.addCodexLinks(dom, [this.entry]);
        for (const section of [...dom.querySelectorAll('section:has(.custom-stcdx--editSection)')]) {
            const btn = section.querySelector('.custom-stcdx--editSection');
            btn.addEventListener('click', ()=>{
                this.toggleEditor(section.id);
            });
        }
        return Array.from(dom.children);
    }
    renderContent() {
        const type = this.getType();
        if (type) {
            return [
                type.prefix,
                ...type.sectionList
                    .filter(it=>it.content.length > 0)
                    .map(it=>{
                        const sec = document.createElement('section');
                        sec.id = it.id;
                        sec.setAttribute('data-name', it.name);
                        sec.innerHTML = messageFormatting(
                            [it.prefix, it.content, it.suffix].filter(it=>it).join('\n'),
                            'Codex',
                            false,
                            false,
                            null,
                        );
                        const btn = document.createElement('div'); {
                            btn.classList.add('stcdx--editSection');
                            btn.classList.add('menu_icon');
                            btn.classList.add('fa-solid');
                            btn.classList.add('fa-pencil');
                            btn.title = `Edit section: ${it.name}`;
                            sec.append(btn);
                        }
                        return sec.outerHTML;
                    })
                ,
                type.suffix,
            ].filter(it=>it).join('\n');
        } else {
            return this.entry.content;
        }
    }


    async unrender() {
        super.unrender();
    }
    async render(isUpdate = false) {
        let oldDom;
        if (isUpdate || !this.dom) {
            oldDom = this.dom;
            const dom = document.createElement('div'); {
                this.dom = dom;
                dom.classList.add('stcdx--content');
                dom.classList.add('stcdx--entry');
                dom.classList.add('mes');
                const mesWrapper = document.createElement('div'); {
                    mesWrapper.classList.add('mes_text');
                    mesWrapper.append(...this.renderTemplate(this.entry));
                    dom.append(mesWrapper);
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


    /**
     *
     * @param {string} targetSection
     * @returns
     */
    async toggleEditor(targetSection = null) {
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
            let type = this.getType();
            let editor;
            /**@type {HTMLInputElement} */
            let keysInput;
            /**@type {HTMLSelectElement} */
            let codexTitleInput;
            const updateCodexTitleInput = ()=>{
                codexTitleInput.innerHTML = '';
                const defaultOpt = document.createElement('option'); {
                    defaultOpt.value = '';
                    defaultOpt.textContent = 'Default (comment / keys)';
                    codexTitleInput.append(defaultOpt);
                }
                ['comment', ...this.entry.keyList.map((it,idx)=>`key[${idx}]`)].forEach(it=>{
                    const opt = document.createElement('option'); {
                        opt.value = it;
                        opt.textContent = it;
                        codexTitleInput.append(opt);
                    }
                });
                codexTitleInput.value = this.titleField;
            };
            const wrapper = document.createElement('div'); {
                this.editor = wrapper;
                wrapper.classList.add('stcdx--editor');
                const props = document.createElement('div'); {
                    props.classList.add('stcdx--properties');
                    const title = document.createElement('label'); {
                        title.append('Title / Memo: ');
                        const inp = document.createElement('input'); {
                            inp.classList.add('text_pole');
                            inp.classList.add('stcdx--editor-comment');
                            inp.placeholder = 'Title / Memo';
                            inp.title = 'Title / Memo';
                            inp.value = this.entry.comment;
                            inp.addEventListener('input', async()=>{
                                if (!this.isEditing || this.isTogglingEditor) return;
                                this.entry.comment = inp.value;
                            });
                            title.append(inp);
                        }
                        props.append(title);
                    }
                    const keys = document.createElement('label'); {
                        keys.append('Primary Keywords: ');
                        const inp = document.createElement('input'); {
                            keysInput = inp;
                            inp.classList.add('text_pole');
                            inp.classList.add('stcdx--editor-tags');
                            inp.placeholder = 'Primary Keywords';
                            inp.title = 'Primary Keywords';
                            inp.value = this.entry.keyList.join(', ');
                            inp.addEventListener('input', async()=>{
                                if (!this.isEditing || this.isTogglingEditor) return;
                                this.entry.keyList = inp.value.split(/\s*,\s*/);
                                updateCodexTitleInput();
                            });
                            keys.append(inp);
                        }
                        props.append(keys);
                    }
                    const isEnabled = document.createElement('label'); {
                        isEnabled.append('Enabled: ');
                        const inp = document.createElement('input'); {
                            inp.type = 'checkbox';
                            inp.classList.add('stcdx--editor-isEnabled');
                            inp.title = 'Enabled';
                            inp.checked = !this.entry.isDisabled;
                            inp.addEventListener('input', async()=>{
                                if (!this.isEditing || this.isTogglingEditor) return;
                                this.entry.isDisabled = !inp.checked;
                            });
                            isEnabled.append(inp);
                        }
                        props.append(isEnabled);
                    }
                    const codexTitle = document.createElement('label'); {
                        codexTitle.append('Codex Title: ');
                        const inp = document.createElement('select'); {
                            codexTitleInput = inp;
                            inp.classList.add('text_pole');
                            inp.classList.add('stcdx--editor-codexTitle');
                            inp.title = 'Codex Title';
                            inp.addEventListener('change', async()=>{
                                if (!this.isEditing || this.isTogglingEditor) return;
                                this.entry.keyList = this.entry.keyList.filter(it=>!it.startsWith('codex-title:'));
                                if (inp.value != '') this.entry.keyList.push(`codex-title:${inp.value}`);
                                keysInput.value = this.entry.keyList.join(', ');
                            });
                            updateCodexTitleInput();
                            codexTitle.append(inp);
                        }
                        props.append(codexTitle);
                    }
                    const codexTemplate = document.createElement('label'); {
                        codexTemplate.append('Codex Template: ');
                        const inp = document.createElement('select'); {
                            inp.classList.add('text_pole');
                            inp.classList.add('stcdx--editor-codexTemplate');
                            inp.title = 'Codex Template';
                            inp.addEventListener('change', async()=>{
                                if (!this.isEditing || this.isTogglingEditor) return;
                                this.entry.keyList = this.entry.keyList.filter(it=>!it.startsWith('codex-tpl:'));
                                if (inp.value != '') this.entry.keyList.push(`codex-tpl:${inp.value}`);
                                keysInput.value = this.entry.keyList.join(', ');
                            });
                            const defaultOpt = document.createElement('option'); {
                                defaultOpt.value = '';
                                defaultOpt.textContent = 'Default Template';
                                inp.append(defaultOpt);
                            }
                            this.settings.templateList.forEach(it=>{
                                const opt = document.createElement('option'); {
                                    opt.value = it.name;
                                    opt.textContent = it.name;
                                    inp.append(opt);
                                }
                            });
                            inp.value = this.templateName;
                            codexTemplate.append(inp);
                        }
                        props.append(codexTemplate);
                    }
                    wrapper.append(props);
                }
                const actionsRow = document.createElement('div'); {
                    actionsRow.classList.add('stcdx--editor-actionsRow');
                    const collapseToggle = document.createElement('div'); {
                        collapseToggle.classList.add('menu_button');
                        collapseToggle.classList.add('fa-solid');
                        collapseToggle.classList.add('fa-angle-up');
                        collapseToggle.title = 'Collapse';
                        collapseToggle.addEventListener('click', ()=>{
                            const result = props.classList.toggle('stcdx--isCollapsed');
                            collapseToggle.classList[result ? 'add' : 'remove']('fa-angle-down');
                            collapseToggle.classList[!result ? 'add' : 'remove']('fa-angle-up');
                            collapseToggle.title = result ? 'Expand' : 'Collapse';
                        });
                        actionsRow.append(collapseToggle);
                    }
                    const actions = document.createElement('div'); {
                        actions.classList.add('stcdx--editor-actions');
                        const changeType = document.createElement('div'); {
                            changeType.classList.add('menu_button');
                            changeType.classList.add('menu_button_icon');
                            changeType.title = `Current type: ${type?.name ?? 'Basic Text'}`;
                            changeType.addEventListener('click', async()=>{
                                const types = ['Basic Text', ...this.settings.entryTypeList.map(it=>`Custom: ${it.name}`)];
                                const newTypeName = (await executeSlashCommands(`/buttons labels=${JSON.stringify(types)} Codex Entry Type`))?.pipe;
                                if (!newTypeName || type?.name == newTypeName.slice(8) || (!type && newTypeName == 'Basic Text')) {
                                    toastr.info('no type change');
                                    return;
                                }
                                if (newTypeName.startsWith('Custom: ')) {
                                    // switching to a different custom type
                                    if (!type) {
                                        // ... from basic text without type
                                        type = new EntryType();
                                        type.sectionList.push(EntrySection.from({ name:'NO SECTION', content:this.entry.content }));
                                    }
                                    const newType = this.settings.entryTypeList.find(it=>it.name == newTypeName.slice(8));
                                    type.id = newType.id;
                                    this.entry.content = [
                                        type.prefix,
                                        ...type.sectionList.filter(it=>it.content.length > 0).map(it=>[it.prefix, it.content, it.suffix].filter(it=>it)).flat(),
                                        type.suffix,
                                        `{{//codex-type:${btoa(encodeURIComponent(JSON.stringify(type)))}}}`,
                                    ].filter(it=>it).join('\n');
                                } else {
                                    // switching to basic text
                                    this.entry.content = [
                                        type.prefix,
                                        ...type.sectionList.filter(it=>it.content.length > 0).map(it=>[it.prefix, it.content, it.suffix].filter(it=>it)).flat(),
                                        type.suffix,
                                    ].filter(it=>it).join('\n');
                                }
                                await this.toggleEditor();
                                await this.toggleEditor();
                            });
                            const i = document.createElement('i'); {
                                i.classList.add('fa-solid');
                                i.classList.add('fa-fingerprint');
                                changeType.append(i);
                            }
                            const text = document.createElement('span'); {
                                text.textContent = 'Change Entry Type';
                                changeType.append(text);
                            }
                            actions.append(changeType);
                        }
                        const wi = document.createElement('div'); {
                            wi.classList.add('menu_button');
                            wi.classList.add('menu_button_icon');
                            wi.addEventListener('click', ()=>{
                                this.toggleEditor();
                                this.entry.showInWorldInfo();
                            });
                            const i = document.createElement('i'); {
                                i.classList.add('fa-solid');
                                i.classList.add('fa-book-atlas');
                                wi.append(i);
                            }
                            const text = document.createElement('span'); {
                                text.textContent = 'Open in WI Panel';
                                wi.append(text);
                            }
                            actions.append(wi);
                        }
                        const del = document.createElement('div'); {
                            del.classList.add('menu_button');
                            del.classList.add('redWarningBG');
                            del.textContent = 'Delete';
                            //TODO no exported function or slash command to delete WI entries
                            // actions.append(del);
                        }
                        actionsRow.append(actions);
                    }
                    wrapper.append(actionsRow);
                }
                if (type) {
                    let curSection;
                    let curTab;
                    const tabUi = document.createElement('div'); {
                        tabUi.classList.add('stcdx--editor-tabUi');
                        const tabs = document.createElement('div'); {
                            tabs.classList.add('stcdx--tabs');
                            for (const sec of type.sectionList) {
                                const tab = document.createElement('div'); {
                                    if ((targetSection && sec.id == targetSection) || (!targetSection && !curSection)) {
                                        curSection = sec;
                                        curTab = tab;
                                        tab.classList.add('stcdx--active');
                                    }
                                    tab.classList.add('stcdx--tab');
                                    if (sec.isRemoved) {
                                        tab.classList.add('stcdx--isRemoved');
                                        tab.title = `Section has been removed from Entry Type "${type.name}"\n---\nLeave content blank to remove from this entry.`;
                                    }
                                    tab.textContent = sec.name;
                                    tab.addEventListener('click', ()=>{
                                        curTab.classList.remove('stcdx--active');
                                        curTab = tab;
                                        tab.classList.add('stcdx--active');
                                        curSection = sec;
                                        editor.value = sec.content;
                                        editor.focus();
                                    });
                                    tabs.append(tab);
                                }
                            }
                            tabUi.append(tabs);
                        }
                        if (!curSection) {
                            curSection = type.sectionList[0];
                            curTab = tabs.children[0];
                        }
                        editor = document.createElement('textarea'); {
                            editor.classList.add('text_pole');
                            editor.classList.add('stcdx--editor-content');
                            editor.value = curSection.content;
                            editor.addEventListener('input', async()=>{
                                if (!this.isEditing || this.isTogglingEditor) return;
                                curSection.content = editor.value;
                                if (curSection.isRemoved && curSection.content.length == 0) {
                                    type.sectionList.splice(type.sectionList.indexOf(curSection), 1);
                                } else if (curSection.isRemoved && curSection.content.length > 0 && !type.sectionList.includes(curSection)) {
                                    type.sectionList.push(curSection);
                                }
                                this.entry.content = [
                                    type.prefix,
                                    ...type.sectionList.filter(it=>it.content.length > 0).map(it=>[it.prefix, it.content, it.suffix].filter(it=>it)).flat(),
                                    type.suffix,
                                    `{{//codex-type:${btoa(encodeURIComponent(JSON.stringify(type)))}}}`,
                                ].filter(it=>it).join('\n');
                            });
                            tabUi.append(editor);
                        }
                        wrapper.append(tabUi);
                    }
                } else {
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
