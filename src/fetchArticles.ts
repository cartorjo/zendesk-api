// src/fetchArticles.ts
import { fetchArticles } from './controllers/zendeskController';
import { Logger } from './logger';
import fs from 'fs/promises';
import path from 'path';

const saveDataToFile = async (data: any, filename: string) => {
    const dataDir = path.join(__dirname, '..', 'data');
    const filePath = path.resolve(dataDir, filename);

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const fetchAllArticles = async () => {
    try {
        let nextPage: string | null = `help_center/articles.json`;
        let totalArticles = 0;

        while (nextPage) {
            const data = await fetchArticles(nextPage);

            // Count articles on the current page
            totalArticles += data.articles.length;

            // Save each article to a file, excluding drafts
            for (const article of data.articles) {
                if (!article.draft) {
                    await saveDataToFile(article, `article_${article.id}.json`);
                    console.log(`Article ${article.id} saved successfully.`);
                }
            }

            // Update the next page URL for pagination
            nextPage = data.next_page;

            // Rate limiting handling
            if (data.rate_limit_remaining === 0) {
                const retryAfter = parseInt(data.retry_after, 10) * 1000;
                console.log(`Rate limit reached. Retrying after ${retryAfter}ms`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
            }
        }

        console.log(`All articles fetched and saved successfully. Total articles: ${totalArticles}`);
    } catch (error: any) {
        const errorMessage = error.response
            ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
            : error.message;
        Logger.error(`Error fetching articles: ${errorMessage}`);
    }
};

// Handle the promise returned by fetchAllArticles
fetchAllArticles().catch(error => {
    Logger.error(`Unhandled error: ${error.message}`);
});