import { uuidv4 } from '../../../../../utils.js';

export class EntrySection {
    static from(props) {
        return Object.assign(new this(), props);
    }




    /**@type {string}*/ id;
    /**@type {string}*/ name = '';
    /**@type {string}*/ prefix = '';
    /**@type {string}*/ suffix = '';
    /**@type {string}*/ content = '';
    /**@type {boolean}*/ isIncluded = true;
    /**@type {boolean}*/ isRemoved = false;



    constructor() {
        this.id = uuidv4();
    }

    toString() {
        const text = this.content.replace(/\(!\)({{get(global)?var::((?:(?!}}).)+)}})/g, '$1');
        return `${this.prefix}${text}${this.suffix}`;
    }
}
