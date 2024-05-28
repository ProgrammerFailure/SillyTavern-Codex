import { getRequestHeaders } from '../../../../../../script.js';

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
    const response = await fetch('/api/plugins/files/put', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            path: `~/user/images/codex/${file.name}`,
            file: dataUrl,
        }),
    });
    if (!response.ok) {
        alert('something went wrong');
        return { ok:false, name:null };
    }
    const data = await response.json();
    return { ok:true, name:data.name };
};
