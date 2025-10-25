const mongoose = require('mongoose');


const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'food',
        required: true
    },
    comment: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

const comment = mongoose.model('comment', commentSchema);
module.exports = comment;