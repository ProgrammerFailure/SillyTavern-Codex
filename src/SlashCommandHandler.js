import { getCurrentChatId, sendSystemMessage } from '../../../../../script.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue } from '../../../../slash-commands/SlashCommandEnumValue.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { delay, isTrueBoolean } from '../../../../utils.js';
// eslint-disable-next-line no-unused-vars
import { CodexManager } from './CodexManager.js';
import { warn } from './lib/log.js';
import { waitForFrame } from './lib/wait.js';
import { CodexCharList } from './ui/CodexCharList.js';
import { CodexMap } from './ui/CodexMap.js';
import { Point } from './ui/map/Point.js';
import { Zone } from './ui/map/Zone.js';




export class SlashCommandHandler {
    /**@type {CodexManager}*/ manager;

    get matcher() { return this.manager.matcher; }




    constructor(manager) {
        this.manager = manager;

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex',
            callback: (args, value)=>this.handleCodex(args, value),
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({ name: 'state',
                    description: 'show or hide instead of toggle',
                    typeList: [ARGUMENT_TYPE.STRING],
                    enumList: ['show', 'hide'],
                }),
                SlashCommandNamedArgument.fromProps({ name: 'silent',
                    description: 'suppress warnings when no entries are found',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    enumList: ['true', 'false'],
                    defaultValue: 'false'
                }),
                SlashCommandNamedArgument.fromProps({ name: 'first',
                    description: 'only show the first entry if multiple are found',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    enumList: ['true', 'false'],
                    defaultValue: 'false',
                }),
                SlashCommandNamedArgument.fromProps({ name: 'zoom',
                    description: 'zoom the n-th image of the found entry (only works if exactly one match is found or first=true)',
                    typeList: [ARGUMENT_TYPE.NUMBER]
                }),
            ],
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({ description: 'text / keys',
                    typeList: [ARGUMENT_TYPE.STRING],
                }),
            ],
            helpString: 'Toggle codex. Provide text or keys to open a relevant entry (cycles through entries if multiple are found).',
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex-map',
            callback: (args, value)=>this.handleCodexMap(args, value),
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({ description: 'text / keys',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: 'open a map in full screen',
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex-edit',
            callback: (args, value)=>this.handleCodexEdit(args, value),
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({ name: 'wi',
                    description: 'open in WI panel',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    defaultValue: 'false',
                    enumList: ['true', 'false'],
                }),
            ],
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({ description: 'text / keys',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: 'open an entry editor',
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex-paint',
            callback: (args, value)=>this.handleCodexPaint(args, value),
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({ description: 'text / keys',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            helpString: 'open a map editor painter',
        }));

        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex-match',
            callback: (args, value)=>this.handleCodexMatch(args, value),
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({ description: 'text / keys',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            returns: 'matching entries',
            helpString: 'get an array of matching entries (basic entries only, no maps or character lists)',
        }));


        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex-type-section-wi',
            /**
             * @param {{type:string, section:string, apply:string}} args
             * @param {string} value
             */
            callback: async(args, value)=>{
                const type = this.manager.settings.entryTypeList.find(it=>it.name.toLowerCase() == args.type.toLowerCase());
                if (!type) throw new Error(`/codex-type-section-wi - no type "${args.type}"`);
                const section = type.sectionList.find(it=>it.name.toLowerCase() == args.section.toLowerCase());
                if (!section) throw new Error(`/codex-type-section-wi - no section "${args.type}" in type "${type.name}"`);
                if (value.length) {
                    section.isIncluded = isTrueBoolean(value);
                    this.manager.settings.save();
                    if (isTrueBoolean(args.apply)) {
                        await type.applyChanges();
                    }
                }
                return JSON.stringify(section.isIncluded);
            },
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({ name: 'type',
                    description: 'name of the type',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                    enumProvider: ()=>this.manager.settings.entryTypeList.map(it=>new SlashCommandEnumValue(it.name)),
                }),
                SlashCommandNamedArgument.fromProps({ name: 'section',
                    description: 'name of the type\'s section',
                    typeList: [ARGUMENT_TYPE.STRING],
                    isRequired: true,
                    enumProvider: (executor)=>{
                        const typeName = executor.namedArgumentList.find(it=>it.name == 'type')?.value?.toLowerCase();
                        return this.manager.settings.entryTypeList.find(type=>type.name.toLowerCase() == typeName)
                            ?.sectionList
                            ?.map(it=>new SlashCommandEnumValue(it.name))
                        ;
                    },
                }),
                SlashCommandNamedArgument.fromProps({ name: 'apply',
                    description: 'whether to apply the change to related entries - re-saves all related entries, might take a minute',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                    defaultValue: 'false',
                }),
            ],
            unnamedArgumentList: [
                SlashCommandArgument.fromProps({ description: 'whether to include the section in WI',
                    typeList: [ARGUMENT_TYPE.BOOLEAN],
                }),
            ],
            returns: 'The section\'s WI inclusion status after the command has run.',
            helpString: `
                <div>
                    Set an Entry Type's section to be included in the World Info content (what gets sent to the LLM) or not.
                </div>
                <div>
                    Leave the unnamed argument blank to get the current status without changing anything.
                <div>
                    <strong>Examples:</strong>
                    <ul>
                        <li><pre><code class="language-stscript">/codex-type-section-wi type=Character section=Notes |\n/echo</code></pre></li>
                        <li><pre><code class="language-stscript">/codex-type-section-wi type=Character section=Notes apply=true false |\n/echo</code></pre></li>
                    </ul>
                </div>
            `,
        }));


        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex-map-zone-add',
            callback: async(args, value)=>{
                const matches = this.matcher.findMatches(args.entry).filter(it=>CodexMap.test(it.entry));
                if (matches.length > 0) {
                    const map = new CodexMap(matches[0].entry, this.manager.settings, this.matcher, this.manager.linker);
                    const zone = new Zone();
                    zone.label = args.label;
                    let poly;
                    try {
                        poly = JSON.parse(args.polygon);
                    } catch {
                        poly = [];
                        const numbers = args.polygon.split(',').map(it=>parseInt(it.trim()));
                        for (let i = 0; i < numbers.length; i += 2) {
                            poly.push([numbers[i], numbers[i + 1]]);
                        }
                    }
                    zone.polygon = poly.map(it=>Point.from({ x:it[0], y:it[1] }));
                    map.zoneList.push(zone);
                    await map.save();
                    if (this.manager.codex.content.entry == map.entry) {
                        /**@type {CodexMap}*/(this.manager.codex.content).load();
                        /**@type {CodexMap}*/(this.manager.codex.content).renderContent();
                    }
                    return JSON.stringify(zone);
                }
                return '';
            },
            namedArgumentList: [
                SlashCommandNamedArgument.fromProps({ name: 'entry',
                    description: 'text / key to find the map entry',
                    typeList: ARGUMENT_TYPE.STRING,
                    isRequired: true,
                }),
                SlashCommandNamedArgument.fromProps({ name: 'label',
                    description: 'zone label',
                    typeList: ARGUMENT_TYPE.STRING,
                    isRequired: true,
                }),
                SlashCommandNamedArgument.fromProps({ name: 'polygon',
                    description: '[[x,y], [x,y], [x,y], ...] or x,y, x,y, x,y, ...',
                    typeList: [ARGUMENT_TYPE.LIST, ARGUMENT_TYPE.STRING],
                    isRequired: true,
                }),
            ],
            returns: 'dictionary with the new zone\'s properties',
            helpString: `
                <div>
                    Create a new map zone.
                </div>
                    <strong>Examples:</strong>
                    <ul>
                        <li><pre><code class="language-stscript">/codex-map-zone-add entry="My Map" label="My New Zone" polygon="[[100,100], [200,100], [200,200], [100,200]]" |\n/echo</code></pre></li>
                        <li><pre><code class="language-stscript">/codex-map-zone-add entry="My Map" label="My New Zone" polygon="100,100, 200,100, 200,200, 100,200" |\n/echo</code></pre></li>
                    </ul>
                </div>
            `,
        }));


        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'codex?',
            callback: ()=>this.showHelp(),
            helpString: 'get help on how to use the Codex extension',
        }));
        window.addEventListener('click', async(evt)=>{
            if (evt.target.hasAttribute && evt.target.hasAttribute('data-stcdx--href')) {
                const mes = evt.target.closest('.mes_text');
                const target = mes.querySelector(`#stcdx--help--${evt.target.getAttribute('data-stcdx--href')}`);
                if (target) {
                    target.scrollIntoView();
                    target.classList.add('stcdx--flash');
                    await delay(510);
                    target.classList.remove('stcdx--flash');
                }
            }
        });
    }




    async handleCodex(args, value) {
        if (value && value.length > 0) {
            if (!this.matcher) {
                toastr.warning('hold on one second...', 'Codex is not ready yet');
                while (!this.matcher) await delay(100);
            }
            const matches = this.matcher.findMatches(value);
            if (matches.length > 0) {
                if (matches.length == 1 || isTrueBoolean(args.first)) {
                    await this.manager.showCodex(matches[0]);
                    if (args.zoom !== null) {
                        const zoom = Number(args.zoom);
                        if (!Number.isNaN(zoom)) {
                            await this.manager.zoomCodex(zoom);
                        }
                    }
                } else {
                    await this.manager.cycleCodex(matches);
                }
            } else {
                if (!isTrueBoolean(args.silent)) toastr.warning(`No codex entry found for: ${value}`);
            }
        } else {
            switch (args.state) {
                case 'show':
                case 'on': {
                    await this.manager.showCodex();
                    break;
                }
                case 'hide':
                case 'off': {
                    await this.manager.hideCodex();
                    break;
                }
                default: {
                    await this.manager.toggleCodex();
                    break;
                }
            }
        }
    }


    async handleCodexMap(args, value) {
        const matches = this.matcher.findMatches(value).filter(it=>CodexMap.test(it.entry));
        if (matches.length > 0) {
            const map = new CodexMap(matches[0].entry, this.manager.settings, this.matcher, this.manager.linker);
            await map.render();
            await map.renderZoom();
        }
    }


    async handleCodexEdit(args, value) {
        const matches = this.matcher.findMatches(value);
        if (matches.length > 0) {
            await this.manager.showCodex(matches[0]);
            if (isTrueBoolean(args.wi)) {
                matches[0].entry.showInWorldInfo();
            } else {
                this.manager.codex.toggleEditor();
            }
        }
    }

    async handleCodexPaint(args, value) {
        const matches = this.matcher.findMatches(value).filter(it=>CodexMap.test(it.entry));
        if (matches.length > 0) {
            await this.manager.showCodex(matches[0]);
            /**@type {CodexMap} */
            const c = this.manager.codex.content;
            c.toggleEditor();
            while (!c.editor.editorDom) await delay(100);
            await c.editor.launchPainter();
        }
    }


    async handleCodexMatch(args, value) {
        const matches = this.matcher.findMatches(value).filter(it=>!CodexMap.test(it.entry) && !CodexCharList.test(it.entry));
        return JSON.stringify(matches.map(it=>it.entry.content));
    }


    async showHelp() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/help.html');
        if (!response.ok) {
            return warn('failed to fetch template: help.html');
        }
        const helpText = (await response.text());
        const now = new Date().getTime();
        const toc = Array.from(helpText.matchAll(/<h2[^>]+id="stcdx--help--([^"]+)"[^>]*>.*?<a[^>]*>.*?<\/a>(.*?)<\/h2>/igs))
            .map((match)=>`<li><a data-stcdx--href="${match[1]}">${match[2]}</a></li>`)
            .join('\n')
        ;
        const slashList = Object.keys(SlashCommandParser.commands)
            .filter(it=>it.startsWith('codex'))
            .map(it=>SlashCommandParser.commands[it])
            .map(it=>{
                const li = document.createElement('li'); {
                    const code = document.createElement('code'); {
                        code.append(it.name);
                        code.append(' ');
                        const q = document.createElement('q'); {
                            q.append(it.namedArgumentList.map(arg=>`[${arg.name}=${arg.enumList.length ? arg.enumList.map(e=>e.value).join('|') : arg.typeList.join('|')}]`).join(' '));
                            q.append(' ');
                            q.append(it.unnamedArgumentList.map(arg=>`(${arg.description})`).join(' '));
                            code.append(q);
                        }
                        li.append(code);
                    }
                    const p = document.createElement('p'); {
                        p.innerHTML = it.helpString;
                        li.append(p);
                    }
                }
                return li.outerHTML;
            })
            .join('\n')
        ;
        const message = helpText
            .replaceAll('%%TIMESTAMP%%', `${now}`)
            .replaceAll('%%TOC%%', toc)
            .replaceAll('%%COMMANDS%%', slashList)
        ;
        sendSystemMessage('generic', message);
        await waitForFrame();
        document.querySelector(`#stcdx--help--${now}`)?.scrollIntoView();
    }
}
