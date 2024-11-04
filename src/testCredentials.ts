import axios from 'axios';
import { config } from './config';
import { getBase64Token } from './utils/auth';

const base64Token = getBase64Token();

const testCredentials = async () => {
    const url = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/tickets/1.json`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${base64Token}`
            }
        });

        console.log('Credentials are valid. Retrieved ticket:', response.data);
    } catch (error) {
        console.error('Error testing credentials:', error);
    }
};

(async () => {
    await testCredentials();
})();