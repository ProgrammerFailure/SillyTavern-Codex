import { messageFormatting, reloadMarkdownProcessor, setCharacterId, substituteParams, this_chid } from '../../../../../../script.js';
import { selected_group } from '../../../../../group-chats.js';

export const messageFormattingWithLanding = (messageText, stripCustom = false)=>{
    const converter = reloadMarkdownProcessor();
    messageText = substituteParams(messageText);
    messageText = converter.makeHtml(messageText);
    if (stripCustom) {
        messageText = messageText.replace(/(custom-)+stcdx--/g, 'stcdx--');
    }
    return messageText;
};
