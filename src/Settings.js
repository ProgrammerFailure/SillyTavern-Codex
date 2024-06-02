import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import { executeSlashCommandsWithOptions } from '../../../../slash-commands.js';
import { delay } from '../../../../utils.js';

import { Template } from './Template.js';
import { debounceAsync } from './lib/debounce.js';
import { log, warn } from './lib/log.js';
import { EntrySection } from './ui/EntrySection.js';
import { EntryType } from './ui/EntryType.js';
import { ActionSetting } from './ui/settings/ActionSetting.js';
import { BaseSetting } from './ui/settings/BaseSetting.js';
import { CheckboxSetting } from './ui/settings/CheckboxSetting.js';
import { ColorSetting } from './ui/settings/ColorSetting.js';
import { CustomSetting } from './ui/settings/CustomSetting.js';
import { MultilineTextSetting } from './ui/settings/MultiLineTextSetting.js';
import { NumberSetting } from './ui/settings/NumberSetting.js';
import { SettingAction } from './ui/settings/SettingAction.js';
import { SETTING_ICON, SettingIcon } from './ui/settings/SettingIcon.js';
import { TextSetting } from './ui/settings/TextSetting.js';
import { Book } from './st/wi/Book.js';
import { CodexEntryFactory } from './ui/CodexEntryFactory.js';
import { CodexEntry } from './ui/CodexEntry.js';
import { POPUP_TYPE, Popup } from '../../../../popup.js';




export class Settings {
    /**@type {boolean}*/ isEnabled = true;
    /**@type {boolean}*/ isVerbose = true;

    /**@type {string}*/ color = 'rgba(0, 255, 255, 1)';
    /**@type {string}*/ icon = '🧾';
    /**@type {boolean}*/ onlyFirst = false;
    /**@type {boolean}*/ skipCodeBlocks = true;

    /**@type {boolean}*/ noTooltips = false;
    /**@type {boolean}*/ fixedTooltips = false;

    /**@type {boolean}*/ requirePrefix = false;

    /**@type {boolean}*/ disableLinks = false;

    /**@type {string}*/ template = '## {{title}}\n\n{{content}}';
    /**@type {string}*/ mapTemplate = '## {{title}}\n\n{{map}}\n\n{{desription}}\n\n{{zones}}y';
    /**@type {Template[]}*/ templateList = [];

    /**@type {boolean}*/ cycle = true;
    /**@type {number}*/ cycleDelay = 1000;

    /**@type {number}*/ mapZoom = 10;
    /**@type {number}*/ mapShadow = 3;
    /**@type {string}*/ mapShadowColor = 'rgba(0, 0, 0, 1)';
    /**@type {number}*/ mapDesaturate = 50;

    /**@type {number}*/ headerFontSize = 2;
    /**@type {boolean}*/ alternateBg = false;

    /**@type {number}*/ transitionTime = 400;
    /**@type {number}*/ zoomTime = 400;
    /**@type {number}*/ mapZoneZoomTime = 200;

    /**@type {number}*/ historyLength = 10;

    /**@type {boolean}*/ isParchment = false;

    /**@type {EntryType[]}*/ entryTypeList = [];


    /**@type {BaseSetting[]}*/ settingList = [];


    /**@type {HTMLElement}*/ dom;


    /**@type {Function}*/ restartDebounced;
    /**@type {Function}*/ rerenderDebounced;

    /**@type {Function}*/ onRestartRequired;
    /**@type {Function}*/ onRerenderRequired;




    constructor(onRestartRequired, onRerenderRequired) {
        Object.assign(this, extension_settings.codex);
        this.templateList = this.templateList.map(it => Template.from(it));
        this.entryTypeList = this.entryTypeList.map(it => EntryType.from(it));
        this.onRestartRequired = onRestartRequired;
        this.onRerenderRequired = onRerenderRequired;

        this.restartDebounced = debounceAsync(() => this.requestRestart());
        this.rerenderDebounced = debounceAsync(() => this.requestRerender());
        this.registerSettings();
        this.init();
    }


    toJSON() {
        return {
            isEnabled: this.isEnabled,
            isVerbose: this.isVerbose,

            color: this.color,
            icon: this.icon,
            onlyFirst: this.onlyFirst,

            noTooltips: this.noTooltips,
            fixedTooltips: this.fixedTooltips,

            requirePrefix: this.requirePrefix,

            disableLinks: this.disableLinks,

            template: this.template,
            templateList: this.templateList,

            cycle: this.cycle,
            cycleDelay: this.cycleDelay,

            mapZoom: this.mapZoom,
            mapShadow: this.mapShadow,
            mapShadowColor: this.mapShadowColor,
            mapDesaturate: this.mapDesaturate,

            alternateBg: this.alternateBg,
            headerFontSize: this.headerFontSize,

            transitionTime: this.transitionTime,
            zoomTime: this.zoomTime,
            mapZoneZoomTime: this.mapZoneZoomTime,

            historyLength: this.historyLength,

            isParchment: this.isParchment,

            entryTypeList: this.entryTypeList,
        };
    }


    save() {
        extension_settings.codex = this.toJSON();
        saveSettingsDebounced();
    }

    requestRestart() {
        this.onRestartRequired();
    }
    requestRerender() {
        this.onRerenderRequired();
    }


    registerSettings() {
        // general settings
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--isEnabled',
                name: 'Enable Codex',
                description: 'Enable or disable Codex.',
                category: ['General'],
                initialValue: this.isEnabled,
                onChange: (it)=>{
                    this.isEnabled = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
        }

        // Matching
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--requirePrefix',
                name: 'Require prefix',
                description: 'Only match keys with <code>codex:</code> prefix',
                category: ['Matching'],
                initialValue: this.requirePrefix,
                onChange: (it)=>{
                    this.skipCodeBlocks = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
        }

        // Links
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--disableLinks',
                name: 'Disable links in messages',
                description: 'Don\'t create Codex links in chat messages.',
                category: ['Links'],
                initialValue: this.disableLinks,
                onChange: (it)=>{
                    this.disableLinks = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--onlyFirst',
                name: 'Only create link on first occurrence in a message',
                description: 'Only create link on first occurrence in a message',
                category: ['Links'],
                initialValue: this.onlyFirst,
                onChange: (it)=>{
                    this.onlyFirst = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--skipCodeBlocks',
                name: 'Don\'t create links in code blocks',
                description: 'Don\'t create links in code blocks',
                category: ['Links'],
                initialValue: this.skipCodeBlocks,
                onChange: (it)=>{
                    this.skipCodeBlocks = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
            this.settingList.push(ColorSetting.fromProps({ id:'stcdx--color',
                name: 'Color',
                description: 'Font color applied to the Codex links added to chat messages',
                category: ['Links'],
                initialValue: this.color,
                onChange: (it)=>{
                    this.color = it.value;
                    document.body.style.setProperty('--stcdx--color', `${this.color}`);
                    this.save();
                },
            }));
            this.settingList.push(TextSetting.fromProps({ id:'stcdx--icon',
                name: 'Icon',
                description: 'Icon to show next to Codex links.',
                category: ['Links'],
                initialValue: this.icon,
                onChange: (it)=>{
                    this.icon = it.value;
                    document.body.style.setProperty('--stcdx--icon', `"${this.icon}"`);
                    this.save();
                },
            }));
        }

        // Tooltips
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--noTooltips',
                name: 'Disable tooltips',
                description: 'Don\'t show tooltips.',
                category: ['UI', 'Tooltips'],
                initialValue: this.noTooltips,
                onChange: (it)=>{
                    this.noTooltips = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--fixedTooltips',
                name: 'Fixed tooltips',
                description: 'Show tooltips on top of Codex instead of at the cursor.',
                category: ['UI', 'Tooltips'],
                initialValue: this.fixedTooltips,
                onChange: (it)=>{
                    this.fixedTooltips = it.value;
                    this.save();
                    this.restartDebounced();
                },
            }));
        }

        // Animations
        {
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--transitionTime',
                name: 'Transition duration',
                description: 'Transition duration for animations in milliseconds.',
                min: 0,
                max: 10000,
                step: 1,
                category: ['UI', 'Animations'],
                initialValue: this.transitionTime,
                onChange: (it)=>{
                    this.transitionTime = it.value;
                    document.body.style.setProperty('--stcdx--transitionTime', `${this.transitionTime}`);
                    this.save();
                },
            }));
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--zoomTime',
                name: 'Zoom duration',
                description: 'Zoom duration for images and maps in milliseconds.',
                min: 0,
                max: 10000,
                step: 1,
                category: ['UI', 'Animations'],
                initialValue: this.zoomTime,
                onChange: (it)=>{
                    this.zoomTime = it.value;
                    document.body.style.setProperty('--stcdx--zoomTime', `${this.zoomTime}`);
                    this.save();
                },
            }));
        }

        // Cycling
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--cycle',
                name: 'Enable cycling',
                description: 'Cycle through found entries on a new message (slideshow).',
                category: ['Cycling'],
                initialValue: this.cycle,
                onChange: (it)=>{
                    this.cycle = it.value;
                    this.save();
                },
            }));
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--cycleDelay',
                name: 'Cycle delay',
                description: 'Time in milliseconds before going to the next matched entry.',
                min: 0,
                max: 10000,
                step: 1,
                category: ['Cycling'],
                initialValue: this.cycleDelay,
                onChange: (it)=>{
                    this.cycleDelay = it.value;
                    document.body.style.setProperty('--stcdx--cycleDelay', `${this.cycleDelay}`);
                    this.save();
                },
            }));
        }


        // UI
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--alternateBg',
                name: 'Alternate background color',
                description: 'Use the SmartThemeBlurTintColor instead of SmartThemeBotMesBlurTintColor as Codex background.',
                category: ['UI'],
                initialValue: this.alternateBg,
                onChange: (it)=>{
                    this.alternateBg = it.value;
                    document.body.style.setProperty('--stcdx--bgColor', `${this.alternateBg ? 'var(--SmartThemeBlurTintColor)' : 'var(--SmartThemeBotMesBlurTintColor)'}`);
                    this.save();
                },
            }));
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--headerFontSize',
                name: 'Header button scale',
                description: 'Size of the buttons in the Codex header, relative to font size.',
                min: 0.1,
                max: 5,
                step: 0.1,
                category: ['UI'],
                initialValue: this.headerFontSize,
                onChange: (it)=>{
                    this.headerFontSize = it.value;
                    document.body.style.setProperty('--stcdx--headerFontSize', `${this.headerFontSize}`);
                    this.save();
                },
            }));
        }

        // Entry Types
        {
            /**@type {HTMLElement} */
            let dom;
            this.settingList.push(CustomSetting.fromProps({ id: 'stcdx--entryTypes',
                name: 'Entry Types',
                description: 'Define custom entry types with sections, prefixes and suffixes.',
                category: ['Entries', 'Text'],
                initialValue: this.entryTypeList,
                actionList: [
                    SettingAction.fromProps({
                        label: 'Apply changes',
                        icon: 'fa-notes-medical',
                        tooltip: 'Apply changes to all entries using any of the Entry Types',
                        action: async()=>{
                            //TODO show spinner / progress
                            toastr.info('applying Event Type changes...');
                            for (const type of this.entryTypeList) {
                                await type.applyChanges();
                            }
                            toastr.success('finished applying Event Type changes');
                        },
                    }),
                ],
                actionsFirst: true,
                getValueCallback: ()=>this.entryTypeList,
                setValueCallback: (value)=>null,
                renderCallback: ()=>{
                    if (!dom) {
                        const container = document.createElement('div'); {
                            dom = container;
                            container.classList.add('stcdx--entryTypesContainer');
                            const add = document.createElement('div'); {
                                add.id = 'stcdx--addEntryType';
                                add.classList.add('menu_button');
                                add.classList.add('fa-solid');
                                add.classList.add('fa-plus');
                                add.title = 'Add entry type';
                                add.addEventListener('click', ()=>{
                                    const item = new EntryType();
                                    item.sectionList.push(new EntrySection());
                                    this.entryTypeList.push(item);
                                    this.save();
                                    this.renderEntryType(item, add);
                                });
                                container.append(add);
                            }
                            for (const tpl of this.entryTypeList) {
                                this.renderEntryType(tpl, add);
                            }
                        }
                    }
                    return dom;
                },
            }));
        }

        // Templates
        {
            // custom setting: default template
            {
                this.settingList.push(MultilineTextSetting.fromProps({ id: 'stcdx--template',
                    name: 'Default Template',
                    description: 'Default markdown template used to render WI entries in Codex.',
                    category: ['Entries', 'Text', 'Templates'],
                    initialValue: this.template,
                    onChange: (it)=>{
                        this.template = it.value;
                        this.save();
                        this.rerenderDebounced();
                    },
                }));
            }
            // custom setting: template list
            {
                /**@type {HTMLElement} */
                let dom;
                this.settingList.push(CustomSetting.fromProps({ id: 'stcdx--templateList',
                    name: 'Custom Templates',
                    description: 'Markdown templates used to render WI entries in Codex',
                    category: ['Entries', 'Text', 'Templates'],
                    initialValue: this.templateList,
                    getValueCallback: ()=>this.templateList,
                    setValueCallback: (value)=>null,
                    renderCallback: ()=>{
                        if (!dom) {
                            const container = document.createElement('div'); {
                                dom = container;
                                container.classList.add('stcdx--templatesContainer');
                                const add = document.createElement('div'); {
                                    add.id = 'stcdx--addTemplate';
                                    add.classList.add('menu_button');
                                    add.classList.add('fa-solid');
                                    add.classList.add('fa-plus');
                                    add.title = 'Add template';
                                    add.addEventListener('click', ()=>{
                                        const template = new Template();
                                        template.content = '';
                                        template.name = '';
                                        this.templateList.push(template);
                                        this.save();
                                        this.renderTemplate(template, add);
                                    });
                                    container.append(add);
                                }
                                for (const tpl of this.templateList) {
                                    this.renderTemplate(tpl, add);
                                }
                            }
                        }
                        return dom;
                    },
                }));
            }
        }

        // Maps
        {
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--mapZoneZoomTime',
                name: 'Zone zoom duration',
                description: 'Zoom duration for hovered zones in milliseconds.',
                min: 0,
                max: 10000,
                step: 1,
                category: ['Entries', 'Maps'],
                initialValue: this.mapZoneZoomTime,
                onChange: (it)=>{
                    this.mapZoneZoomTime = it.value;
                    document.body.style.setProperty('--stcdx--mapZoneZoomTime', `${this.mapZoneZoomTime}`);
                    this.save();
                    this.rerenderDebounced();
                },
            }));
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--mapZoom',
                name: 'Zone zoom amount',
                description: 'Zoom amount for hovered zones in percentage.',
                min: 0,
                max: 500,
                step: 1,
                category: ['Entries', 'Maps'],
                initialValue: this.mapZoom,
                onChange: (it)=>{
                    this.mapZoom = it.value;
                    document.body.style.setProperty('--stcdx--mapZoom', `${this.mapZoom}`);
                    this.save();
                },
            }));
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--mapShadow',
                name: 'Zone shadow strength',
                description: 'Shadow strength for hovered zones in pixels.',
                min: 0,
                max: 500,
                step: 1,
                category: ['Entries', 'Maps'],
                initialValue: this.mapShadow,
                onChange: (it)=>{
                    this.mapShadow = it.value;
                    document.body.style.setProperty('--stcdx--mapShadow', `${this.mapShadow}`);
                    this.save();
                },
            }));
            this.settingList.push(ColorSetting.fromProps({ id:'stcdx--mapShadowColor',
                name: 'Shadow color',
                description: 'Shadow color for hovered zones.',
                category: ['Entries', 'Maps'],
                initialValue: this.mapShadowColor,
                onChange: (it)=>{
                    this.mapShadowColor = it.value;
                    document.body.style.setProperty('--stcdx--mapShadowColor', `${this.mapShadowColor}`);
                    this.save();
                },
            }));
            this.settingList.push(NumberSetting.fromProps({ id:'stcdx--mapDesaturate',
                name: 'Desaturation',
                description: 'Desaturation of the map image before hover in percentage.',
                min: 0,
                max: 100,
                step: 1,
                category: ['Entries', 'Maps'],
                initialValue: this.mapDesaturate,
                onChange: (it)=>{
                    this.mapDesaturate = it.value;
                    document.body.style.setProperty('--stcdx--mapDesaturate', `${this.mapDesaturate}`);
                    this.save();
                },
            }));
        }

        // Maintenance
        {
            const getUpdateEntries = async()=>{
                log('[getUpdateEntries()]');
                const results = [];
                const bookNames = [...document.querySelectorAll('#world_editor_select > option:not([value=""])')].map(it=>it.textContent);
                for (const name of bookNames) {
                    log('[getUpdateEntries()]', { name });
                    const book = new Book(name);
                    await book.load();
                    for (const entry of book.entryList) {
                        const oc = entry.content;
                        const cdx = CodexEntryFactory.create(entry, this, null, null);
                        if (!(cdx instanceof CodexEntry)) continue;
                        cdx.getType();
                        if (oc != entry.content) {
                            log('[getUpdateEntries()]', { name, e:entry.title, entry }, 'saveDebounced()');
                            results.push(entry);
                        }
                    }
                }
                return results;
            };
            this.settingList.push(ActionSetting.fromProps({ id: 'stcdx--updateAllEntries',
                name: 'Update all entries',
                description: `
                    Re-save all entries to update codex-specific metadata, settings, and formatting.<br>
                    It is a good idea to make a backup of your World Info first.
                `,
                category: ['Maintenance'],
                initialValue: null,
                actionList: [
                    SettingAction.fromProps({ label: 'List Entries',
                        icon: 'fa-rectangle-list',
                        tooltip: 'List all entries that would be affected by this action.',
                        action: async()=>{
                            toastr.info('this might take a while...', 'gathering entries to update');
                            const updates = await getUpdateEntries();
                            let book;
                            let bul;
                            const dom = document.createElement('ul');
                            dom.style.textAlign = 'left';
                            for (const entry of updates) {
                                if (book != entry.book) {
                                    book = entry.book;
                                    const bli = document.createElement('li'); {
                                        bli.append(book);
                                        bul = document.createElement('ul'); {
                                            bli.append(bul);
                                        }
                                        dom.append(bli);
                                    }
                                }
                                const eli = document.createElement('li'); {
                                    eli.textContent = entry.title;
                                    bul.append(eli);
                                }
                            }
                            const dlg = new Popup(dom, POPUP_TYPE.TEXT, null, { okButton:'Close' });
                            await dlg.show();
                        },
                    }),
                    SettingAction.fromProps({ label: 'Update Entries',
                        icon: 'fa-rotate',
                        tooltip: 'Update all entries',
                        action: async()=>{
                            toastr.info('this might take a while...', 'updating all entries');
                            const updates = await getUpdateEntries();
                            toastr.info(`found ${updates.length} entries to update`, 'updating all entries');
                            for (const entry of updates) {
                                await entry.saveDebounced();
                            }
                            toastr.success(`updated ${updates.length} entries`, 'updating all entries');
                        },
                    }),
                ],
            }));
        }

        // Experiments
        {
            this.settingList.push(CheckboxSetting.fromProps({ id:'stcdx--isParchment',
                name: 'Parchment style (WIP)',
                description: 'Experimental parchment style.',
                category: ['Experiments'],
                initialValue: this.isParchment,
                onChange: (it)=>{
                    this.isParchment = it.value;
                    this.save();
                    this.restartDebounced();
                },
                iconList: [SettingIcon.fromProps(SETTING_ICON.EXPERIMENTAL)],
            }));
        }
    }


    async init() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/settings_new.html');
        if (!response.ok) {
            return warn('failed to fetch template: stcdx--settings.html');
        }
        const settingsTpl = document
            .createRange()
            .createContextualFragment(await response.text())
            .querySelector('#stcdx--settings-v2')
        ;
        const dom = /**@type {HTMLElement} */(settingsTpl.cloneNode(true));
        this.dom = dom;

        dom.querySelector('#stcdx--settings-toggleCodex').addEventListener('click', ()=>{
            executeSlashCommandsWithOptions('/codex');
        });
        dom.querySelector('#stcdx--settings-close').addEventListener('click', ()=>{
            this.hide();
        });
        dom.querySelector('.contentWrapper').addEventListener('scroll', ()=>this.updateCategory());
        window.addEventListener('keydown', (evt)=>{
            if (!this.dom.classList.contains('stcdx--active')) return;
            const query = this.dom.querySelector('.search');
            const rect = query.getBoundingClientRect();
            if (document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) != query) return;
            if (evt.ctrlKey && evt.key == 'f') {
                evt.preventDefault();
                evt.stopPropagation();
                query.select();
            }
        });

        const search = dom.querySelector('.search');
        search.addEventListener('input', ()=>{
            const query = search.value.trim().toLowerCase();
            for (const setting of this.settingList) {
                if (setting.name.toLowerCase().includes(query) || setting.description.toLowerCase().includes(query)) {
                    setting.dom.classList.remove('hidden');
                } else {
                    setting.dom.classList.add('hidden');
                }
            }
            const cats = [...dom.querySelectorAll('.contentWrapper .category:has(.item:not(.hidden)) > .head')].map(it=>it.textContent);
            const heads = [...dom.querySelectorAll('.categoriesWrapper .category .head')];
            for (const head of heads) {
                if (cats.includes(head.textContent)) {
                    head.classList.remove('hidden');
                } else {
                    head.classList.add('hidden');
                }
            }
            this.updateCategory();
        });

        // build tree
        const tree = {};
        for (const setting of this.settingList) {
            let cur = tree;
            for (const key of setting.category) {
                if (!cur[key]) {
                    cur[key] = { name:key, settings:[] };
                }
                cur = cur[key];
            }
            cur.settings.push(setting);
        }

        // render tree
        const catRoot = /**@type {HTMLElement}*/(dom.querySelector('.categoriesWrapper'));
        const contRoot = /**@type {HTMLElement}*/(dom.querySelector('.contentWrapper'));
        const render = (cat, cont, cur, level = 0)=>{
            for (const key of Object.keys(cur)) {
                if (['name', 'settings'].includes(key)) continue;
                const curCat = cur[key];
                const block = document.createElement('div'); {
                    block.classList.add('category');
                    const head = document.createElement('div'); {
                        head.classList.add('head');
                        head.setAttribute('data-level', level.toString());
                        head.textContent = key;
                        block.append(head);
                    }
                }
                const catBlock = /**@type {HTMLElement}*/(block.cloneNode(true));
                catBlock.querySelector('.head').addEventListener('click', ()=>{
                    let offset = 0;
                    let head = /**@type {HTMLElement}*/(block.querySelector('.head'));
                    head = head.closest('.category').parentElement.closest('.category')?.querySelector('.head');
                    while (head) {
                        offset += head.offsetHeight;
                        head = head.closest('.category').parentElement.closest('.category')?.querySelector('.head');
                    }
                    contRoot.scrollTo({
                        top: block.offsetTop - offset,
                        behavior: 'smooth',
                    });
                });
                cat.append(catBlock);
                cont.append(block);
                for (const setting of curCat.settings) {
                    const item = setting.render();
                    block.append(item);
                }
                render(catBlock, block, curCat, level + 1);
            }
        };
        render(catRoot, contRoot, tree);
        document.body.append(this.dom);
        // this.show();
        this.init_OLD();
    }

    updateCategory() {
        const wrapRect = this.dom.querySelector('.contentWrapper').getBoundingClientRect();
        for (const setting of this.settingList) {
            const rect = setting.dom.getBoundingClientRect();
            if (rect.top > wrapRect.top || rect.top < wrapRect.top && rect.bottom > wrapRect.top + wrapRect.height / 4) {
                const cat = setting.dom.closest('.category').querySelector('.head').textContent;
                const heads = [...this.dom.querySelectorAll('.categoriesWrapper .head')];
                for (const head of heads) {
                    if (head.textContent == cat) {
                        let cur = head;
                        cur.classList.add('current');
                        while (cur) {
                            cur = cur.closest('.category').parentElement.closest('.category')?.querySelector('.head');
                            cur?.classList?.add('current');
                        }
                    } else {
                        head.classList.remove('current');
                    }
                }
                return;
            }
        }
    }

    async show() {
        this.dom.classList.add('stcdx--active');
        await delay(200);
        this.updateCategory();
        this.dom.querySelector('.search').select();
    }
    hide() {
        this.dom.classList.remove('stcdx--active');
    }
    async toggle() {
        if (this.dom.classList.contains('stcdx--active')) {
            this.hide();
        } else {
            await this.show();
        }
    }


    async init_OLD() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/settings.html');
        if (!response.ok) {
            return warn('failed to fetch template: stcdx--settings.html');
        }
        const settingsTpl = document.createRange().createContextualFragment(await response.text()).querySelector('#stcdx--settings');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = settingsTpl.cloneNode(true);
        dom.querySelector('.inline-drawer-content').innerHTML = '';
        const btn = document.createElement('div'); {
            btn.classList.add('menu_button');
            btn.textContent = 'Open Codex Settings';
            btn.style.whiteSpace = 'nowrap';
            btn.addEventListener('click', ()=>{
                this.show();
                document.querySelector('#extensions-settings-button .drawer-icon').click();
            });
            dom.querySelector('.inline-drawer-content').append(btn);
        }
        document.querySelector('#extensions_settings').append(dom);
    }


    /**
     *
     * @param {EntryType} item
     * @param {HTMLElement} add
     */
    renderEntryType(item, add) {
        const wrap = document.createElement('div'); {
            wrap.classList.add('stcdx--entryType');
            wrap.classList.add('stcdx--isCollapsed');
            const cont = document.createElement('div'); {
                cont.classList.add('stcdx--content');
                const head = document.createElement('div'); {
                    head.classList.add('stcdx--row');
                    head.classList.add('stcdx--head');
                    // <div class="csss--collapse menu_button menu_button_icon fa-solid fa-angle-up" title="Collapse"></div>
                    const collapseToggle = document.createElement('div'); {
                        collapseToggle.classList.add('stcdx--collapse');
                        collapseToggle.classList.add('menu_button');
                        collapseToggle.classList.add('menu_button_icon');
                        collapseToggle.classList.add('fa-solid');
                        collapseToggle.classList.add('fa-angle-down');
                        collapseToggle.title = 'Expand';
                        collapseToggle.addEventListener('click', ()=>{
                            const result = wrap.classList.toggle('stcdx--isCollapsed');
                            collapseToggle.classList[result ? 'add' : 'remove']('fa-angle-down');
                            collapseToggle.classList[!result ? 'add' : 'remove']('fa-angle-up');
                        });
                        head.append(collapseToggle);
                    }
                    const name = document.createElement('input'); {
                        name.classList.add('stcdx--name');
                        name.classList.add('text_pole');
                        name.placeholder = 'name';
                        name.value = item.name;
                        name.addEventListener('input', () => {
                            item.name = name.value;
                            this.save();
                            this.rerenderDebounced();
                        });
                        head.append(name);
                    }
                    const id = document.createElement('div'); {
                        id.classList.add('stcdx--id');
                        id.textContent = item.id;
                        head.append(id);
                    }
                    const apply = document.createElement('div'); {
                        apply.classList.add('stcdx--action');
                        apply.classList.add('menu_button');
                        apply.classList.add('menu_button_icon');
                        apply.classList.add('fa-solid');
                        apply.classList.add('fa-notes-medical');
                        apply.title = 'Apply changes to all entries using this Entry Type';
                        apply.addEventListener('click', async() => {
                            //TODO show spinner?
                            toastr.info('applying Event Type changes...');
                            await item.applyChanges();
                            toastr.success('finished applying Event Type changes');
                        });
                        head.append(apply);
                    }
                    const del = document.createElement('div'); {
                        del.classList.add('stcdx--action');
                        del.classList.add('menu_button');
                        del.classList.add('menu_button_icon');
                        del.classList.add('fa-solid');
                        del.classList.add('fa-trash-can');
                        del.classList.add('redWarningBG');
                        del.title = 'Remove entry type';
                        del.addEventListener('click', () => {
                            wrap.remove();
                            this.entryTypeList.splice(this.templateList.indexOf(item), 1);
                            this.save();
                            this.rerenderDebounced();
                        });
                        head.append(del);
                    }
                    cont.append(head);
                }
                const fieldsRow = document.createElement('div'); {
                    fieldsRow.classList.add('stcdx--row');
                    const fields = document.createElement('label'); {
                        fields.classList.add('stcdx--setting');
                        const text = document.createElement('span'); {
                            text.classList.add('stcdx--text');
                            text.textContent = 'Default Field Values:';
                            fields.append(text);
                        }
                        const inp = document.createElement('textarea'); {
                            inp.classList.add('stcdx--input');
                            inp.classList.add('text_pole');
                            inp.value = item.defaultFieldValues;
                            inp.placeholder = 'position=4\ndepth=10\nrole=0';
                            inp.rows = 3;
                            inp.addEventListener('input', ()=>{
                                item.defaultFieldValues = inp.value;
                                this.save();
                                this.rerenderDebounced();
                            });
                            fields.append(inp);
                        }
                        fieldsRow.append(fields);
                    }
                    cont.append(fieldsRow);
                }
                const preSuff = document.createElement('div'); {
                    preSuff.classList.add('stcdx--row');
                    const prefix = document.createElement('label'); {
                        prefix.classList.add('stcdx--setting');
                        const text = document.createElement('span'); {
                            text.classList.add('stcdx--text');
                            text.textContent = 'Entry Prefix:';
                            prefix.append(text);
                        }
                        const inp = document.createElement('textarea'); {
                            inp.classList.add('stcdx--input');
                            inp.classList.add('text_pole');
                            inp.value = item.prefix;
                            inp.addEventListener('input', ()=>{
                                item.prefix = inp.value;
                                this.save();
                                this.rerenderDebounced();
                            });
                            prefix.append(inp);
                        }
                        preSuff.append(prefix);
                    }
                    const suffix = document.createElement('label'); {
                        suffix.classList.add('stcdx--setting');
                        const text = document.createElement('span'); {
                            text.classList.add('stcdx--text');
                            text.textContent = 'Entry Suffix:';
                            suffix.append(text);
                        }
                        const inp = document.createElement('textarea'); {
                            inp.classList.add('stcdx--input');
                            inp.classList.add('text_pole');
                            inp.value = item.suffix;
                            inp.addEventListener('input', ()=>{
                                item.suffix = inp.value;
                                this.save();
                                this.rerenderDebounced();
                            });
                            suffix.append(inp);
                        }
                        preSuff.append(suffix);
                    }
                    cont.append(preSuff);
                }
                const sections = document.createElement('div'); {
                    sections.classList.add('stcdx--row');
                    sections.classList.add('stcdx--sections');
                    const lbl = document.createElement('div'); {
                        lbl.textContent = 'Sections:';
                        sections.append(lbl);
                    }
                    const list = document.createElement('div'); {
                        list.classList.add('stcdx--list');
                        const secAdd = document.createElement('div'); {
                            secAdd.id = 'stcdx--addSection';
                            secAdd.classList.add('menu_button');
                            secAdd.classList.add('fa-solid');
                            secAdd.classList.add('fa-plus');
                            secAdd.title = 'Add section';
                            secAdd.addEventListener('click', ()=>{
                                const sec = new EntrySection();
                                item.sectionList.push(sec);
                                this.save();
                                this.renderEntryTypeSection(item, sec, secAdd);
                            });
                            list.append(secAdd);
                        }
                        for (const section of item.sectionList) {
                            this.renderEntryTypeSection(item, section, secAdd);
                        }
                        sections.append(list);
                    }
                    cont.append(sections);
                }
                wrap.append(cont);
            }
            add.insertAdjacentElement('beforebegin', wrap);
        }
    }
    /**
     *
     * @param {EntryType} type
     * @param {EntrySection} section
     * @param {HTMLElement} add
     */
    renderEntryTypeSection(type, section, add) {
        const wrap = document.createElement('div'); {
            wrap.classList.add('stcdx--entrySection');
            const cont = document.createElement('div'); {
                cont.classList.add('stcdx--content');
                const head = document.createElement('div'); {
                    head.classList.add('stcdx--row');
                    head.classList.add('stcdx--head');
                    const name = document.createElement('input'); {
                        name.classList.add('stcdx--name');
                        name.classList.add('text_pole');
                        name.placeholder = 'name';
                        name.value = section.name;
                        name.addEventListener('input', () => {
                            section.name = name.value;
                            this.save();
                            this.rerenderDebounced();
                        });
                        head.append(name);
                    }
                    const del = document.createElement('div'); {
                        del.classList.add('stcdx--action');
                        del.classList.add('menu_button');
                        del.classList.add('menu_button_icon');
                        del.classList.add('fa-solid');
                        del.classList.add('fa-trash-can');
                        del.classList.add('redWarningBG');
                        del.title = 'Remove entry type';
                        del.addEventListener('click', () => {
                            wrap.remove();
                            type.sectionList.splice(type.sectionList.indexOf(section), 1);
                            this.save();
                            this.rerenderDebounced();
                        });
                        head.append(del);
                    }
                    cont.append(head);
                }
                const preSuff = document.createElement('div'); {
                    preSuff.classList.add('stcdx--row');
                    const prefix = document.createElement('label'); {
                        prefix.classList.add('stcdx--setting');
                        const text = document.createElement('span'); {
                            text.classList.add('stcdx--text');
                            text.textContent = 'Section Prefix:';
                            prefix.append(text);
                        }
                        const inp = document.createElement('textarea'); {
                            inp.classList.add('stcdx--input');
                            inp.classList.add('text_pole');
                            inp.value = section.prefix;
                            inp.addEventListener('input', ()=>{
                                section.prefix = inp.value;
                                this.save();
                                this.rerenderDebounced();
                            });
                            prefix.append(inp);
                        }
                        preSuff.append(prefix);
                    }
                    const suffix = document.createElement('label'); {
                        suffix.classList.add('stcdx--setting');
                        const text = document.createElement('span'); {
                            text.classList.add('stcdx--text');
                            text.textContent = 'Section Suffix:';
                            suffix.append(text);
                        }
                        const inp = document.createElement('textarea'); {
                            inp.classList.add('stcdx--input');
                            inp.classList.add('text_pole');
                            inp.value = section.suffix;
                            inp.addEventListener('input', ()=>{
                                section.suffix = inp.value;
                                this.save();
                                this.rerenderDebounced();
                            });
                            suffix.append(inp);
                        }
                        preSuff.append(suffix);
                    }
                    cont.append(preSuff);
                }
                wrap.append(cont);
            }
            add.insertAdjacentElement('beforebegin', wrap);
        }
    }
    renderTemplate(template, add) {
        const wrap = document.createElement('div'); {
            wrap.classList.add('stcdx--template');
            const cont = document.createElement('div'); {
                cont.classList.add('stcdx--content');
                const row = document.createElement('div'); {
                    row.classList.add('stcdx--row');
                    const name = document.createElement('input'); {
                        name.classList.add('stcdx--name');
                        name.classList.add('text_pole');
                        name.placeholder = 'name';
                        name.value = template.name;
                        name.addEventListener('input', () => {
                            template.name = name.value;
                            this.save();
                            this.rerenderDebounced();
                        });
                        row.append(name);
                    }
                    const del = document.createElement('div'); {
                        del.classList.add('stcdx--action');
                        del.classList.add('menu_button');
                        del.classList.add('menu_button_icon');
                        del.classList.add('fa-solid');
                        del.classList.add('fa-trash-can');
                        del.classList.add('redWarningBG');
                        del.title = 'Remove template';
                        del.addEventListener('click', () => {
                            wrap.remove();
                            this.templateList.splice(this.templateList.indexOf(template), 1);
                            this.save();
                            this.rerenderDebounced();
                        });
                        row.append(del);
                    }
                    cont.append(row);
                }
                const tpl = document.createElement('textarea'); {
                    tpl.classList.add('stcdx--tpl');
                    tpl.classList.add('text_pole');
                    tpl.placeholder = 'template (markdown)';
                    tpl.rows = 6;
                    tpl.value = template.content;
                    tpl.addEventListener('input', () => {
                        template.content = tpl.value;
                        this.save();
                        this.rerenderDebounced();
                    });
                    cont.append(tpl);
                }
                wrap.append(cont);
            }
            add.insertAdjacentElement('beforebegin', wrap);
        }
    }
}
