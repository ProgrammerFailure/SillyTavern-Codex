import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import { executeSlashCommandsWithOptions } from '../../../../slash-commands.js';
import { delay } from '../../../../utils.js';

import { Template } from './Template.js';
import { debounceAsync } from './lib/debounce.js';
import { warn } from './lib/log.js';
import { BaseSetting } from './ui/settings/BaseSetting.js';
import { CheckboxSetting } from './ui/settings/CheckboxSetting.js';
import { ColorSetting } from './ui/settings/ColorSetting.js';
import { CustomSetting } from './ui/settings/CustomSetting.js';
import { MultilineTextSetting } from './ui/settings/MultiLineTextSetting.js';
import { NumberSetting } from './ui/settings/NumberSetting.js';
import { SETTING_ICON, SettingIcon } from './ui/settings/SettingIcon.js';
import { TextSetting } from './ui/settings/TextSetting.js';




export class Settings {
    /**@type {Boolean}*/ isEnabled = true;
    /**@type {Boolean}*/ isVerbose = true;

    /**@type {String}*/ color = 'rgba(0, 255, 255, 1)';
    /**@type {String}*/ icon = '🧾';
    /**@type {Boolean}*/ onlyFirst = false;
    /**@type {Boolean}*/ skipCodeBlocks = true;

    /**@type {Boolean}*/ noTooltips = false;
    /**@type {Boolean}*/ fixedTooltips = false;

    /**@type {Boolean}*/ requirePrefix = false;

    /**@type {Boolean}*/ disableLinks = false;

    /**@type {String}*/ template = '## {{title}}\n\n{{content}}';
    /**@type {String}*/ mapTemplate = '## {{title}}\n\n{{map}}\n\n{{desription}}\n\n{{zones}}y';
    /**@type {Template[]}*/ templateList = [];

    /**@type {Boolean}*/ cycle = true;
    /**@type {Number}*/ cycleDelay = 1000;

    /**@type {Number}*/ mapZoom = 10;
    /**@type {Number}*/ mapShadow = 3;
    /**@type {String}*/ mapShadowColor = 'rgba(0, 0, 0, 1)';
    /**@type {Number}*/ mapDesaturate = 50;

    /**@type {Number}*/ headerFontSize = 2;

    /**@type {Number}*/ transitionTime = 400;
    /**@type {Number}*/ zoomTime = 400;
    /**@type {Number}*/ mapZoneZoomTime = 200;

    /**@type {Number}*/ historyLength = 10;

    /**@type {Boolean}*/ isParchment = false;

    /**@type {BaseSetting[]}*/ settingList = [];


    /**@type {HTMLElement}*/ dom;


    /**@type {Function}*/ restartDebounced;
    /**@type {Function}*/ rerenderDebounced;

    /**@type {Function}*/ onRestartRequired;
    /**@type {Function}*/ onRerenderRequired;




    constructor(onRestartRequired, onRerenderRequired) {
        Object.assign(this, extension_settings.codex);
        this.templateList = this.templateList.map(it => Template.from(it));
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

            headerFontSize: this.headerFontSize,

            transitionTime: this.transitionTime,
            zoomTime: this.zoomTime,
            mapZoneZoomTime: this.mapZoneZoomTime,

            historyLength: this.historyLength,

            isParchment: this.isParchment,
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

        // Matching
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

        // Links
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
                this.save();
                this.restartDebounced();
            },
        }));

        // Tooltips
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

        // Animations
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

        // Cycling
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


        // UI
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

        // Templates
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

        // Maps
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

        // Experiments
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
            if (evt.ctrlKey && evt.key == 'f') {
                evt.preventDefault();
                evt.stopPropagation();
                this.dom.querySelector('.search').select();
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
            if (rect.top > wrapRect.top) {
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
