// src/controllers/zendeskController.ts
import axios from 'axios';
import { config } from '../config';
import { getBase64Token } from '../utils/auth';

const base64Token = getBase64Token();

const fetchData = async (endpoint: string) => {
    const url = endpoint.startsWith('https') ? endpoint : `https://${config.zendeskSubdomain}.zendesk.com/api/v2/${endpoint}`;
    console.log(`Fetching data from URL: ${url}`);
    const response = await axios.get(url, {
        headers: {
            'Authorization': `Basic ${base64Token}`
        }
    });
    return response.data;
};

export const fetchTicketById = async (ticketId: number) => {
    return await fetchData(`tickets/${ticketId}.json`);
};

export const fetchTicketsByPage = async (page: number) => {
    return await fetchData(`tickets.json?page=${page}`);
};

export const fetchTicketStatistics = async () => {
    return await fetchData('tickets/count.json');
};

// Fetch articles from a given URL (for pagination)
export const fetchArticles = async (endpoint: string = 'help_center/articles.json') => {
    return await fetchData(endpoint);
};