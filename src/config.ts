// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    zendeskEmail: process.env.ZENDESK_EMAIL || '',
    zendeskToken: process.env.ZENDESK_TOKEN || '',
    zendeskSubdomain: process.env.ZENDESK_SUBDOMAIN || '',
    port: process.env.PORT || 3000,
};