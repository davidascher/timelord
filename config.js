require('dotenv').config();

module.exports = {
   node_env: process.env.NODE_ENV || 'development',
   consumer_key	: process.env.CALADVICE_KEY,
   consumer_secret : process.env.CALADVICE_SECRET
}
