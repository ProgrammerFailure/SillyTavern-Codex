import { POPUP_RESULT } from '../../../../../popup.js';
import { FileExplorer } from '../../../SillyTavern-FileExplorer/src/FileExplorer.js';

/**
 *
 * @param {HTMLInputElement} url
 */
export const imgBrowse = async(url)=>{
    const fe = new FileExplorer('~/user/images/codex');
    fe.typeList = ['image'];
    fe.popup.dom.style.zIndex = '10010';
    await fe.show();
    if (fe.popup.result == POPUP_RESULT.AFFIRMATIVE && fe.selection) {
        url.value = /**@type {string}*/(fe.selection);
        url.dispatchEvent(new Event('input', { bubbles:true }));
    }
};
