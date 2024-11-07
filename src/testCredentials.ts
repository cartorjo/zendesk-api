import axios from 'axios';
import { config } from './config';
import { getBase64Token } from './utils/auth';

const base64Token = getBase64Token();

const testCredentials = async () => {
    const url = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/tickets.json`;

    console.log('Testing credentials with URL:', url);
    console.log('Authorization header:', `Basic ${base64Token}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${base64Token}`
            }
        });

        console.log('Credentials are valid. Retrieved tickets:', response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error testing credentials:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
        } else {
            console.error('Unexpected error:', error);
        }
    }
};

(async () => {
    await testCredentials();
})();