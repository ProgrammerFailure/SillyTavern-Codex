import { eventSource, event_types, getRequestHeaders } from '../../../../script.js';
import { showLoader } from '../../../loader.js';
import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../popup.js';
import { delay } from '../../../utils.js';
import { log } from './src/lib/log.js';





class TouchEventSubstitute {}
if (window.TouchEvent === undefined) {
    // @ts-ignore
    window.TouchEvent = TouchEventSubstitute;
}

const askInstallExtensions = async(urls)=>{
    const dom = document.createElement('div'); {
        dom.classList.add('stcdx--askInstall');
        const head = document.createElement('h3'); {
            head.textContent = 'Codex - Missing Dependencies';
            dom.append(head);
        }
        const msg = document.createElement('div'); {
            msg.textContent = 'You need to install the following extensions for Codex to run:';
            dom.append(msg);
        }
        const list = document.createElement('ul'); {
            for (const url of urls) {
                const li = document.createElement('li'); {
                    const name = document.createElement('div'); {
                        name.textContent = url.split('/').pop();
                        li.append(name);
                    }
                    const link = document.createElement('a'); {
                        link.textContent = url;
                        link.href = url;
                        link.target = '_blank';
                        li.append(link);
                    }
                    list.append(li);
                }
                dom.append(list);
            }
        }
        const prompt = document.createElement('div'); {
            prompt.textContent = 'Do you want to install the missing extensions now?';
            dom.append(prompt);
        }
    }
    const dlg = new Popup(dom, POPUP_TYPE.CONFIRM, null, {
        okButton: 'Install Now',
        cancelButton: 'Disable Codex',
    });
    await dlg.show();
    if (dlg.result == POPUP_RESULT.AFFIRMATIVE) {
        // install extensions
        for (const url of urls) {
            toastr.info('Please wait...', `Installing ${url.split('/').pop()}`);
            const request = await fetch('/api/extensions/install', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({ url }),
            });
            if (!request.ok) {
                const text = await request.text();
                toastr.warning(text || request.statusText, 'Extension installation failed', { timeOut: 5000 });
                console.error('Extension installation failed', request.status, request.statusText, text);
                return;
            }
            const response = await request.json();
            toastr.success(`Extension "${response.display_name}" by ${response.author} (version ${response.version}) has been installed successfully!`, 'Extension installation successful');
        }
        return true;
    }
    return false;
};

const askInstallPlugins = async(urls)=>{
    const pluginCheck = (await fetch('/api/plugins/pluginmanager/', { method:'HEAD' })).ok;
    const dom = document.createElement('div'); {
        dom.classList.add('stcdx--askInstall');
        const head = document.createElement('h3'); {
            head.textContent = 'Codex - Missing Dependencies';
            dom.append(head);
        }
        const msg = document.createElement('div'); {
            msg.textContent = 'You need to install the following plugins for Codex to run:';
            dom.append(msg);
        }
        const list = document.createElement('ul'); {
            for (const url of urls) {
                const li = document.createElement('li'); {
                    const name = document.createElement('div'); {
                        name.textContent = url.split('/').pop();
                        li.append(name);
                    }
                    const link = document.createElement('a'); {
                        link.textContent = url;
                        link.href = url;
                        link.target = '_blank';
                        li.append(link);
                    }
                    list.append(li);
                }
                dom.append(list);
            }
        }
        if (pluginCheck) {
            const prompt = document.createElement('div'); {
                prompt.textContent = 'Do you want to install the missing plugins now (requires server restart)?';
                dom.append(prompt);
            }
        }
    }
    const dlg = new Popup(
        dom,
        pluginCheck ? POPUP_TYPE.CONFIRM : POPUP_TYPE.TEXT,
        null,
        {
            okButton: pluginCheck ? 'Install Now' : 'Disable Codex',
            cancelButton: pluginCheck ? 'Disable Codex' : null,
        },
    );
    await dlg.show();
    if (pluginCheck && dlg.result == POPUP_RESULT.AFFIRMATIVE) {
        // install plugins
        for (const url of urls) {
            toastr.info('Please wait...', `Installing ${url.split('/').pop()}`);
            const request = await fetch('/api/plugins/pluginmanager/install', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({ url }),
            });
            if (!request.ok) {
                const text = await request.text();
                toastr.warning(text || request.statusText, 'Plugin installation failed', { timeOut: 5000 });
                console.error('Plugin installation failed', request.status, request.statusText, text);
                return;
            }
            const response = await request.json();
            if (!response) {
                toastr.warning('', 'Plugin installation failed', { timeOut: 5000 });
                return;
            }
            toastr.success(`Plugin "${url.split('/').pop()}" has been installed successfully!`, 'Plugin installation successful');
        }
        return true;
    }
    return false;
};

const checkDependencies = async()=>{
    let result = true;
    let hasInstalledExtensions = false;
    let hasInstalledPlugins = false;

    // check FileExplorer extension
    try {
        const fe = (await import('../SillyTavern-FileExplorer/src/FileExplorer.js')).FileExplorer;
    } catch {
        log('[DEP]', 'FileExplorer extension missing');
        result = false;
        hasInstalledExtensions = await askInstallExtensions(['https://github.com/LenAnderson/SillyTavern-FileExplorer']);
    }

    // check Files plugin
    const response = await fetch('/api/plugins/files/', { method:'HEAD' });
    if (!response.ok) {
        log('[DEP]', 'File plugin missing');
        result = false;
        hasInstalledPlugins = await askInstallPlugins(['https://github.com/LenAnderson/SillyTavern-Files']);
    }

    if (hasInstalledPlugins) {
        toastr.info('Restarting SillyTavern WebServer...');
        await delay(500);
        showLoader();
        await fetch('/api/plugins/pluginmanager/restart');
        await delay(1000);
        let done = false;
        while (!done) {
            await delay(100);
            try {
                done = (await fetch('/', { method:'HEAD' })).ok;
            } catch { /* empty */ }
        }
        location.reload();
        return false;
    }
    if (hasInstalledExtensions) {
        toastr.info('Reloading SillyTavern...');
        await delay(500);
        showLoader();
        location.reload();
        return false;
    }

    return result;
};

const init = async()=>{
    log('init');
    if (await checkDependencies()) {
        try {
            const CodexManager = (await import('./src/CodexManager.js')).CodexManager;
            const SlashCommandHandler = (await import('./src/SlashCommandHandler.js')).SlashCommandHandler;
            const codex = new CodexManager();
            // eslint-disable-next-line no-unused-vars
            const slashHandler = new SlashCommandHandler(codex);
            log('CODEX:', codex);
        } catch (ex) {
            log('[ERR]', ex);
            toastr.error(ex.message, 'Failed to load Codex');
        }
    }
};
eventSource.on(event_types.APP_READY, ()=>init());
