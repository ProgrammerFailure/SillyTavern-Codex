import { callPopup, getRequestHeaders } from '../../../../../../../script.js';
import { POPUP_TYPE, Popup } from '../../../../../../popup.js';
import { quickReplyApi } from '../../../../../quick-reply/index.js';
import { imgUpload } from '../../lib/imgUpload.js';

import { warn } from '../../lib/log.js';
// eslint-disable-next-line no-unused-vars
import { CodexMap } from '../CodexMap.js';

export class MapDetailsEditor {
    /**@type {CodexMap}*/ codexMap;




    constructor(codexMap) {
        this.codexMap = codexMap;
    }




    async show() {
        const response = await fetch('/scripts/extensions/third-party/SillyTavern-Codex/html/mapDetailsEditor.html');
        if (!response.ok) {
            return warn('failed to fetch template: mapDetailsEditor.html');
        }
        const template = document.createRange().createContextualFragment(await response.text()).querySelector('#stcdx--mapEditor');
        /**@type {HTMLElement} */
        // @ts-ignore
        const dom = template.cloneNode(true);
        const popProm = callPopup(dom, 'text', undefined, { okButton: 'OK', wide: true, large: true, rows: 1 });
        /**@type {HTMLInputElement}*/
        const comment = dom.querySelector('#stcdx--map-comment');
        comment.value = this.codexMap.entry.comment ?? '';
        comment.addEventListener('input', ()=>{
            this.codexMap.entry.comment = comment.value.trim();
        });
        /**@type {HTMLInputElement}*/
        const keys = dom.querySelector('#stcdx--map-keys');
        keys.value = this.codexMap.entry.keyList?.join(', ') ?? '';
        keys.addEventListener('input', ()=>{
            this.codexMap.entry.keyList = keys.value.trim().split(/\s*,\s*/);
        });
        /**@type {HTMLInputElement}*/
        const url = dom.querySelector('#stcdx--map-url');
        url.value = this.codexMap.url ?? '';
        url.addEventListener('input', ()=>{
            this.codexMap.url = url.value.trim();
        });
        url.addEventListener('paste', async(evt)=>{
            if (evt.clipboardData.types.includes('Files') && evt.clipboardData.files?.length > 0 && evt.clipboardData.files[0].type.startsWith('image/')) {
                url.disabled = true;
                url.value = 'uploading...';
                const file = evt.clipboardData.files[0];
                const response = await imgUpload(evt);
                if (!response.ok) {
                    alert('something went wrong');
                    url.value = '';
                    url.disabled = false;
                    return;
                }
                url.value = `/user/images/codex/${response.name}`;
                url.disabled = false;
                url.dispatchEvent(new Event('input', { bubbles:true }));
            }
        });
        /**@type {HTMLElement} */
        const urlBrowse = dom.querySelector('#stcdx--map-url-browse');
        urlBrowse.addEventListener('click', async()=>{
            const browseDom = document.createElement('div'); {
                browseDom.classList.add('stcdx--explorer');
                browseDom.textContent = 'Loading...';
            }
            fetch('/api/plugins/files/list', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    folder: '~/user/images/codex',
                }),
            }).then(async(response)=>{
                if (!response.ok) {
                    alert('Something went wrong');
                    return;
                }
                const files = (await response.json()).filter(it=>it.type == 'file' && ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(it.path.split('.').pop()));
                browseDom.innerHTML = '';
                for (const file of files) {
                    const img = document.createElement('img'); {
                        img.classList.add('stcdx--explorer-thumb');
                        img.src = `/user/images/codex/${file.path}`;
                        img.addEventListener('click', ()=>{
                            url.value = `/user/images/codex/${file.path}`;
                            url.dispatchEvent(new Event('input', { bubbles:true }));
                            dlg.completeAffirmative();
                        });
                        browseDom.append(img);
                    }
                }
            });
            const dlg = new Popup(browseDom, POPUP_TYPE.TEXT, null, {
                okButton:'Cancel',
                wide: true,
                large: true,
            });
            dlg.dom.style.zIndex = '10010';
            await dlg.show();
        });
        /**@type {HTMLTextAreaElement}*/
        const description = dom.querySelector('#stcdx--map-description');
        description.value = this.codexMap.description ?? '';
        description.addEventListener('input', ()=>{
            this.codexMap.description = description.value.trim();
        });
        /**@type {HTMLTextAreaElement}*/
        const command = dom.querySelector('#stcdx--map-command');
        command.value = this.codexMap.command ?? '';
        command.addEventListener('input', ()=>{
            this.codexMap.command = command.value.trim();
        });
        /**@type {HTMLSelectElement}*/
        const qrSet = dom.querySelector('#stcdx--map-qrSet');
        quickReplyApi.listSets().forEach(qrs=>{
            const opt = document.createElement('option'); {
                opt.value = qrs;
                opt.textContent = qrs;
                qrSet.append(opt);
            }
        });
        qrSet.value = this.codexMap.qrSet ?? '';
        qrSet.addEventListener('change', ()=>{
            this.codexMap.qrSet = qrSet.value.trim();
        });
        await popProm;
        return true;
    }
}
