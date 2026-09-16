const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelCategory = new Schema(
    {
        name: { type: String, require: true },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('category', modelCategory);
