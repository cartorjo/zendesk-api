import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { Logger } from '../logger';
import { getBase64Token } from '../utils/auth';
import Bottleneck from 'bottleneck';
import sanitize from 'sanitize-filename';

const base64Token = getBase64Token();

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
    const sanitizedFilename = sanitize(filename);
    const filePath = path.resolve(dataDir, sanitizedFilename);

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const limiter = new Bottleneck({
    minTime: 1000 // 60 requests per minute
});

const fetchTickets = async (url: string): Promise<Ticket[]> => {
    let tickets: Ticket[] = [];
    let nextPage: string | null = url;

    while (nextPage) {
        try {
            const response: AxiosResponse<ZendeskResponse> = await limiter.schedule(() => axios.get(nextPage as string, {
                headers: {
                    'Authorization': `Basic ${base64Token}`
                }
            }));

            tickets = tickets.concat(response.data.tickets);
            nextPage = response.data.next_page;

            if (response.headers['x-rate-limit-remaining'] === '0') {
                const retryAfter = parseInt(response.headers['retry-after'], 10) * 1000;
                Logger.info(`Rate limit reached. Retrying after ${retryAfter} ms`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            }
        } catch (error: any) {
            const errorMessage = error.response ? error.response.data : error.message;
            Logger.error(`Error fetching tickets: ${errorMessage}`);
            throw error;
        }
    }

    return tickets;
};

export const fetchTicketsByPage = async (req: Request, res: Response) => {
    const { page } = req.params;
    const url = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/incremental/tickets.json?start_time=${page}`;

    try {
        const tickets = await fetchTickets(url);
        await saveDataToFile(tickets, `ticketsPage${page}.json`);
        res.json(tickets);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch tickets from Zendesk. Please try again later.' });
    }
};

export const fetchTicketById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const url = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/tickets/${id}.json`;

    try {
        const response: AxiosResponse<{ ticket: Ticket }> = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${base64Token}`
            }
        });

        res.json(response.data.ticket);
    } catch (error: any) {
        const errorMessage = error.response ? error.response.data : error.message;
        Logger.error(`Error fetching ticket by ID: ${errorMessage}`);
        res.status(500).json({ error: 'Failed to fetch ticket from Zendesk. Please try again later.' });
    }
};

export const fetchTicketStatistics = async (req: Request, res: Response) => {
    const url = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/tickets/count.json`;

    try {
        const response: AxiosResponse<{ count: number }> = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${base64Token}`
            }
        });

        res.json({ count: response.data.count });
    } catch (error: any) {
        const errorMessage = error.response ? error.response.data : error.message;
        Logger.error(`Error fetching ticket statistics: ${errorMessage}`);
        res.status(500).json({ error: 'Failed to fetch ticket statistics from Zendesk. Please try again later.' });
    }
};