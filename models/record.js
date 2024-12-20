const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recordSchema = new Schema({
  title: String,
  artist: String,
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
  lastPlayed: Date,
  notes: String,
}, {
  timestamps: true
});

module.exports = mongoose.model('Record', recordSchema);