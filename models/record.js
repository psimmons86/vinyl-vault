const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recordSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    artist: {
        type: String,
        required: true
    },
    year: Number,
    format: {
        type: String,
        enum: ['LP', '45', '78', 'Other'],
        default: 'LP'
    },
    plays: {
        type: Number,
        default: 0
    },
    lastPlayed: {
        type: Date
    },
    notes: String
}, {
    timestamps: true
});

// Remove the express requirements - they don't belong in a model file
// const express = require('express');
// const router = express.Router();
// const Record = require('../models/record');

module.exports = mongoose.model('Record', recordSchema);