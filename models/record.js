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

tags: [String],

plays: {

type: Number,

default: 0

 },

lastPlayed: {

type: Date

 },

imageUrl: {

type: String,

default: '/images/default-album.png'

 },

notes: String

}, {

timestamps: true

});

module.exports = mongoose.model('Record', recordSchema);