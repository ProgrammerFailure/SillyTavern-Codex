import { getRequestHeaders } from '../../../../../../script.js';
import { FilesPluginApi } from '../../../SillyTavern-FilesPluginApi/api.js';

/**
 * @param {ClipboardEvent} evt
 * @returns {Promise<{ ok:boolean, name:string }>} final filename
 */
export const imgUpload = async(evt)=>{
    const file = evt.clipboardData.files[0];
    const reader = new FileReader();
    const prom = new Promise(resolve=>reader.addEventListener('load', resolve));
    reader.readAsDataURL(file);
    await prom;
    const dataUrl = reader.result;
    try {
        const data = await FilesPluginApi.put(`~/user/images/codex/${file.name}`, {
            file: /**@type {string}*/(dataUrl),
        });
        return { ok:true, name:data.name };
    } catch (ex) {
        alert(ex?.message ?? 'Something went wrong');
        return { ok:false, name:null };
    }
};
