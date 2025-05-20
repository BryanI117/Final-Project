// server.js
console.log('Server.js script started...');

// Import necessary modules
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';

console.log('Modules imported...');

// --- MongoDB Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bryaniturbide91:SomeNewPassword117@cluster0.siwcmk5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DATABASE_NAME = 'summerArchiveDB';
const COLLECTION_NAME = 'summerEntries';

console.log('MongoDB URI configured (ensure password is correct and real):', MONGODB_URI.replace(/:([^:@\/?#]+)@/, ':********@'));

let db;
let entriesCollection;

async function connectToMongo() {
    console.log('Attempting to connect to MongoDB...');
    try {
        const client = new MongoClient(MONGODB_URI);
        console.log('MongoDB client created.');
        await client.connect();
        console.log('MongoDB client connected.');
        db = client.db(DATABASE_NAME);
        entriesCollection = db.collection(COLLECTION_NAME);
        console.log('Successfully connected to MongoDB and collection initialized!');

        await entriesCollection.createIndex({ timestamp: -1 });
        console.log('Index on timestamp ensured for entries collection.');
        return true; // Indicate success
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('CRITICAL: Failed to connect to MongoDB or setup collection:');
        console.error(error); // Log the full error object
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        return false; // Indicate failure
    }
}

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Express app initialized...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
console.log('Middleware configured...');

// --- API Routes ---
app.post('/api/entries', async (req, res) => {
    if (!entriesCollection) {
        return res.status(500).json({ message: "Database not available. Cannot save entry. Check server logs for connection issues." });
    }
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ message: 'Entry text is required and cannot be empty.' });
    }
    try {
        const newEntry = {
            text: text.trim(),
            timestamp: new Date()
        };
        const result = await entriesCollection.insertOne(newEntry);
        res.status(201).json({ message: 'Entry added successfully!', id: result.insertedId, ...newEntry });
    } catch (error) {
        console.error('Error adding entry to MongoDB:', error);
        res.status(500).json({ message: 'Failed to add entry.' });
    }
});

app.get('/api/entries', async (req, res) => {
    if (!entriesCollection) {
        return res.status(500).json({ message: "Database not available. Cannot fetch entries. Check server logs for connection issues." });
    }
    try {
        const entries = await entriesCollection.find({}).sort({ timestamp: -1 }).toArray();
        const formattedEntries = entries.map(entry => ({
            id: entry._id.toString(),
            text: entry.text,
            timestamp: entry.timestamp.getTime()
        }));
        res.status(200).json(formattedEntries);
    } catch (error) {
        console.error('Error fetching entries from MongoDB:', error);
        res.status(500).json({ message: 'Failed to fetch entries.' });
    }
});

app.put('/api/entries/:id', async (req, res) => {
    if (!entriesCollection) {
        return res.status(500).json({ message: "Database not available. Cannot update entry. Check server logs for connection issues." });
    }
    const { id } = req.params;
    const { text } = req.body;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid entry ID format.' });
    }
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ message: 'Entry text is required for update and cannot be empty.' });
    }
    try {
        const result = await entriesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { text: text.trim(), timestamp: new Date() } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Entry not found.' });
        }
        if (result.modifiedCount === 0 && result.matchedCount === 1) {
             return res.status(200).json({ message: 'Entry text was the same, no changes made.', id });
        }
        res.status(200).json({ message: 'Entry updated successfully!', id });
    } catch (error) {
        console.error('Error updating entry in MongoDB:', error);
        res.status(500).json({ message: 'Failed to update entry.' });
    }
});

app.delete('/api/entries/:id', async (req, res) => {
    if (!entriesCollection) {
        return res.status(500).json({ message: "Database not available. Cannot delete entry. Check server logs for connection issues." });
    }
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid entry ID format.' });
    }
    try {
        const result = await entriesCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Entry not found.' });
        }
        res.status(200).json({ message: 'Entry deleted successfully!', id });
    } catch (error) {
        console.error('Error deleting entry from MongoDB:', error);
        res.status(500).json({ message: 'Failed to delete entry.' });
    }
});
console.log('API routes defined...');

// --- Serve Frontend ---
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API endpoint not found.' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
console.log('Frontend serving route defined...');

// --- Start Server Function ---
async function startServer() {
    console.log('Attempting to start server...');
    const dbConnected = await connectToMongo();

    if (dbConnected) {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Connected to MongoDB. Database: ${DATABASE_NAME}, Collection: ${COLLECTION_NAME}`);
        });
        console.log('Server listen initiated on port', PORT);
    } else {
        console.error('CRITICAL: Server will not start because MongoDB connection failed. Please check the errors above.');
        // process.exit(1); // Optionally exit if DB connection is essential for server start
    }
}

// --- Run the server ---
startServer();
