import { getRequestHeaders } from '../../../../../../script.js';
import { POPUP_TYPE, Popup } from '../../../../../popup.js';

/**
 *
 * @param {HTMLInputElement} url
 */
export const imgBrowse = async(url)=>{
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
};
