// src/controllers/zendeskController.ts
import {Request, Response} from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import {config} from '../config';

const base64Token = Buffer.from(`${config.zendeskEmail}/token:${config.zendeskToken}`).toString('base64');
const PAGE_LIMIT = 1000; // Adjust per Zendesk limits
const MAX_CONCURRENT_REQUESTS = 5; // Number of concurrent requests to avoid rate limiting
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second initial delay for exponential backoff

// Type definitions for data and API response
interface ZendeskResponse {
    results: any[]; // Adjust according to data shape
    next_page?: string;
}

interface FetchError extends Error {
    response?: {
        status: number;
        data: any;
    };
}

// Function to save data to a JSON file as a writable stream
const createFileStream = (filename: string) => {
    const filePath = path.join(__dirname, '..', 'data', filename);
    return fs.createWriteStream(filePath, {flags: 'a'}); // Append mode for streaming
};

// Helper to fetch a single page of Zendesk data
const fetchZendeskPage = async (url: string, retries = 0): Promise<ZendeskResponse> => {
    try {
        const response = await axios.get(url, {
            headers: {Authorization: `Basic ${base64Token}`},
        });
        return response.data;
    } catch (error) {
        const err = error as FetchError;
        if (retries < MAX_RETRIES) {
            console.warn(`Retrying page ${url} (attempt ${retries + 1}): ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
            return fetchZendeskPage(url, retries + 1);
        }
        throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} retries`);
    }
};

// Fetch all pages with rate limiting and save them as a stream
const fetchAllPages = async (endpoint: string, writeStream: fs.WriteStream) => {
    let nextPage = `https://${config.zendeskSubdomain}.zendesk.com/api/v2/${endpoint}.json?per_page=${PAGE_LIMIT}`;
    const requestQueue: Promise<void>[] = [];

    while (nextPage) {
        if (requestQueue.length >= MAX_CONCURRENT_REQUESTS) {
            await Promise.race(requestQueue); // Wait for one request to complete before adding more
        }

        const fetchTask = (async (pageUrl: string) => {
            const data = await fetchZendeskPage(pageUrl);
            data.results.forEach((result) => writeStream.write(JSON.stringify(result) + '\n')); // Stream data to file
            nextPage = data.next_page || ''; // Update next page or exit
        })(nextPage);

        requestQueue.push(fetchTask);
        fetchTask.finally(() => requestQueue.splice(requestQueue.indexOf(fetchTask), 1)); // Remove completed task
    }

    await Promise.all(requestQueue); // Ensure all requests finish
};

// Main controller function to handle the fetch request
export const fetchZendeskData = async (req: Request, res: Response) => {
    const {endpoint} = req.params;
    const filename = `${endpoint}.json`;

    // Create writable stream for output file
    const writeStream = createFileStream(filename);

    try {
        console.log(`Starting data fetch for endpoint: ${endpoint}`);
        await fetchAllPages(endpoint, writeStream);

        res.json({message: 'Data fetched and saved successfully.', filename});
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({
            error: 'Failed to fetch data from Zendesk. Please try again later.',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    } finally {
        writeStream.end(); // Close the file stream
    }
};