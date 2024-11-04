// src/fetchTickets.ts
import axios, { AxiosResponse } from 'axios';
import { config } from './config';
import { Logger } from './logger';
import fs from 'fs/promises';
import path from 'path';

const base64Token = Buffer.from(`${config.zendeskEmail}/token:${config.zendeskToken}`).toString('base64');

interface Ticket {
    id: number;
    subject: string;
    description: string;
    status: string;
    // Add other relevant fields
}

interface ZendeskResponse {
    tickets: Ticket[];
    next_page: string | null;
}

const saveDataToFile = async (data: any, filename: string) => {
    const dataDir = path.join(__dirname, '..', 'data');
    const filePath = path.resolve(dataDir, filename);

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const fetchAllTickets = async () => {
    const url = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/incremental/tickets.json?start_time=0`;
    let nextPage: string | null = url;

    try {
        while (nextPage) {
            const response: AxiosResponse<ZendeskResponse> = await axios.get(nextPage, {
                headers: {
                    'Authorization': `Basic ${base64Token}`
                }
            });

            for (const ticket of response.data.tickets) {
                await saveDataToFile(ticket, `${ticket.id}.json`);
                console.log(`Ticket ${ticket.id} saved successfully.`);
            }

            nextPage = response.data.next_page;

            if (response.headers['x-rate-limit-remaining'] === '0') {
                const retryAfter = parseInt(response.headers['retry-after'], 10) * 1000;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            }
        }

        console.log('All tickets fetched and saved successfully.');
    } catch (error: any) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        Logger.error(`Error fetching tickets: ${errorMessage}`);
    }
};

fetchAllTickets();