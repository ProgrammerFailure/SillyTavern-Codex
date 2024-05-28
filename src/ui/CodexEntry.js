import { getRequestHeaders, messageFormatting, setCharacterId, this_chid } from '../../../../../../script.js';
import { selected_group } from '../../../../../group-chats.js';
import { executeSlashCommands } from '../../../../../slash-commands.js';
import { delay, uuidv4 } from '../../../../../utils.js';
import { log } from '../lib/log.js';
import { messageFormattingWithLanding } from '../lib/messageFormattingWithLanding.js';
import { waitForFrame } from '../lib/wait.js';
import { Entry } from '../st/wi/Entry.js';
import { CodexBaseEntry } from './CodexBaseEntry.js';
import { CodexEntryProperties } from './CodexEntryProperties.js';
import { EntrySection } from './EntrySection.js';
import { BasicEntryType, EntryType } from './EntryType.js';




export class CodexEntry extends CodexBaseEntry {
    /**@type {CodexEntryProperties}*/ properties;

    /**@type {HTMLDivElement}*/ editor;

    get titleField() { return this.properties.titleField; }
    set titleField(value) {
        this.properties.titleField = value;
        this.updateEntryContent();
    }

    get templateName() { return this.properties.templateName; }
    set templateName(value) {
        this.properties.templateName = value;
        this.updateEntryContent();
    }

    get title() {
        const key = this.properties.titleField;
        if (key) {
            const reKey = /^key\[(\d+)]$/i;
            if (reKey.test(key)) {
                return this.entry.keyList[key.replace(reKey, '$1')];
            }
            return this.entry[key];
        }
        return this.entry.title;
    }




    constructor(entry, settings, matcher, linker) {
        super(entry, settings, matcher, linker);
        this.properties = CodexEntryProperties.from(entry);
    }




    /**
     *
     * @param {EntryType} current
     * @returns {EntryType}
     */
    getType(current = null) {
        /**@type {EntryType} */
        let type = this.properties.type;
        log('[TYPE]', type);
        current = current ?? (type.id == null ? new BasicEntryType('') : this.settings.entryTypeList.find(it=>it.id == type.id));
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
                this.updateEntryContent();
            }
        }
        return type;
    }


    updateEntryContent() {
        this.entry.content = [
            this.properties.type.toString(),
            this.properties.toString(),
        ].join('');
    }




    /**
     *
     * @param {Entry} entry
     */
    renderTemplate(entry) {
        let template = this.settings.templateList.find(tpl=>tpl.name == this.templateName)?.content ?? this.settings.template;
        let messageText = this.subParams(entry.content);
        messageText = template
            .replace(/{{comment}}/g, entry.comment)
            .replace(/{{comment::url}}/g, encodeURIComponent(entry.comment))
            .replace(/{{content}}/g, this.renderContent())
            .replace(/{{content::url}}/g, encodeURIComponent(entry.content))
            .replace(/{{key\[(\d+)\]}}/g, (_,idx)=>entry.keyList[idx])
            .replace(/{{key\[(\d+)\]::url}}/g, (_,idx)=>encodeURIComponent(entry.keyList[idx]))
            .replace(/{{title}}/g, this.title)
            .replace(/{{title::url}}/g, encodeURIComponent(this.title))
        ;
        const currentChatId = this_chid;
        let landingHack = false;
        if ((this_chid ?? selected_group) == null) {
            landingHack = true;
            setCharacterId(1);
        }
        messageText = messageFormattingWithLanding(messageText);
        if (landingHack) {
            setCharacterId(currentChatId);
        }
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
        const type = this.properties.type;
        return [
            type.prefix,
            ...type.sectionList
                .filter(it=>it.content.length > 0)
                .map(it=>{
                    const sec = document.createElement('section');
                    sec.id = it.id;
                    sec.setAttribute('data-name', it.name);
                    sec.innerHTML = messageFormattingWithLanding([it.prefix, it.content, it.suffix].filter(it=>it).join('\n'));
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
            /**@type {HTMLSelectElement} */
            let codexTitleInput;
            const updateCodexTitleInput = ()=>{
                codexTitleInput.innerHTML = '';
                const defaultOpt = document.createElement('option'); {
                    defaultOpt.value = '';
                    defaultOpt.textContent = 'Default (comment / keys)';
                    codexTitleInput.append(defaultOpt);
                }
                [
                    { value:'comment', text:'comment' },
                    ...this.entry.keyList.map((it,idx)=>({ value:`key[${idx}]`, text:`key[${idx}] = ${it}` })),
                ].forEach(it=>{
                    const opt = document.createElement('option'); {
                        opt.value = it.value;
                        opt.textContent = it.text;
                        codexTitleInput.append(opt);
                    }
                });
                codexTitleInput.value = this.titleField ?? '';
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
                                this.titleField = inp.value;
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
                                this.templateName = inp.value;
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
                            inp.value = this.templateName ?? '';
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
                        collapseToggle.title = 'Collapse properties';
                        collapseToggle.addEventListener('click', ()=>{
                            const result = props.classList.toggle('stcdx--isCollapsed');
                            collapseToggle.classList[result ? 'add' : 'remove']('fa-angle-down');
                            collapseToggle.classList[!result ? 'add' : 'remove']('fa-angle-up');
                            localStorage.setItem('stcdx--collapseProps', JSON.stringify(result));
                            collapseToggle.title = result ? 'Expand properties' : 'Collapse properties';
                        });
                        if (JSON.parse(localStorage.getItem('stcdx--collapseProps') ?? 'false')) {
                            collapseToggle.click();
                        }
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
                        editor.addEventListener('paste', async(evt)=>{
                            if (evt.clipboardData.types.includes('Files') && evt.clipboardData.files?.length > 0 && evt.clipboardData.files[0].type.startsWith('image/')) {
                                log('[PASTE]', evt.clipboardData, evt.clipboardData.types, evt.clipboardData.files, evt.clipboardData.files[0]);
                                editor.disabled = true;
                                const file = evt.clipboardData.files[0];
                                const name = file.name;
                                const id = uuidv4();
                                const before = editor.value.slice(0, editor.selectionStart);
                                const after = editor.value.slice(editor.selectionEnd);
                                editor.value = [
                                    before,
                                    `![uploading...${id}](/user/images/codex/${name})`,
                                    after,
                                ].join('');
                                const reader = new FileReader();
                                const prom = new Promise(resolve=>reader.addEventListener('load', resolve));
                                reader.readAsDataURL(file);
                                await prom;
                                const dataUrl = reader.result;
                                const response = await fetch('/api/plugins/files/put', {
                                    method: 'POST',
                                    headers: getRequestHeaders(),
                                    body: JSON.stringify({
                                        path: `~/user/images/codex/${name}`,
                                        file: dataUrl,
                                    }),
                                });
                                if (!response.ok) {
                                    alert('something went wrong');
                                    editor.value = [
                                        before,
                                        after,
                                    ].join('');
                                    editor.disabled = false;
                                    return;
                                }
                                const data = await response.json();
                                editor.value = [
                                    before,
                                    `![image](/user/images/codex/${data.name})`,
                                    after,
                                ].join('');
                                editor.dispatchEvent(new Event('input', { bubbles:true }));
                                editor.disabled = false;
                            }
                        });
                        tabUi.append(editor);
                    }
                    wrapper.append(tabUi);
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
