// src/utils/auth.ts
import { config } from '../config';

export const getBase64Token = (): string => {
    return Buffer.from(`${config.zendeskEmail}/token:${config.zendeskToken}`).toString('base64');
};