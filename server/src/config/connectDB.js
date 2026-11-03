const Mongoose = require('mongoose');
require('dotenv').config();

function connectionOptions(uri, nodeEnv = process.env.NODE_ENV) {
    let localDev = false;
    try {
        const url = new URL(uri);
        localDev = nodeEnv !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
            && !url.searchParams.has('directConnection');
    } catch {}
    // Host-based dev clients reach the Docker primary via its published port.
    return localDev ? { directConnection: true } : {};
}

const connectDB = async () => {
    try {
        await Mongoose.connect(process.env.CONNECT_DB, {
            ...connectionOptions(process.env.CONNECT_DB),
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
    }
};

module.exports = connectDB;
module.exports.connectionOptions = connectionOptions;
