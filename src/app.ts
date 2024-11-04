import express from 'express';
import { fetchTicketById, fetchTicketsByPage, fetchTicketStatistics } from './controllers/zendeskController';
import { config } from './config';

const app = express();

app.get('/api/tickets/:id', fetchTicketById);
app.get('/api/tickets/page/:page', fetchTicketsByPage);
app.get('/api/ticket-statistics', fetchTicketStatistics);

app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
});