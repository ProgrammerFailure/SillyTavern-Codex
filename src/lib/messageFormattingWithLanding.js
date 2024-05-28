import { messageFormatting, setCharacterId, this_chid } from '../../../../../../script.js';
import { selected_group } from '../../../../../group-chats.js';

export const messageFormattingWithLanding = (messageText)=>{
    const currentChatId = this_chid;
    let landingHack = false;
    if ((this_chid ?? selected_group) == null) {
        landingHack = true;
        setCharacterId(1);
    }
    messageText = messageFormatting(
        messageText,
        'Codex',
        false,
        false,
        null,
    );
    if (landingHack) {
        setCharacterId(currentChatId);
    }
    return messageText;
};
