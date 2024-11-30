
const express = require('express');
const bodyParser = require('body-parser');
const { body, param, validationResult } = require('express-validator');

const app = express();
app.use(bodyParser.json());

let shoppingLists = [];
let items = [];
let users = {
    user1: 'Owner', 
    user2: 'Member',
};


function authorize(role) {
    return (req, res, next) => {
        const userId = req.headers['user-id'];
        if (!userId || users[userId] !== role) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
}


app.post('/shopping-list/create', [
    body('name').isString(),
    body('members').isArray().optional(),
], authorize('Owner'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, members = [] } = req.body;
    const id = String(shoppingLists.length + 1);
    const newList = { id, name, owner: req.headers['user-id'], members };
    shoppingLists.push(newList);
    return res.status(201).json(newList);
});


app.post('/shopping-list/:id/item/add', [
    param('id').isString(),
    body('name').isString(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name } = req.body;
    const shoppingList = shoppingLists.find(list => list.id === id);
    if (!shoppingList) {
        return res.status(404).json({ message: 'Shopping list not found' });
    }

    const userId = req.headers['user-id'];
    if (shoppingList.owner !== userId && !shoppingList.members.includes(userId)) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    const itemId = String(items.length + 1);
    const newItem = { id: itemId, name, checked: false, shoppingList: id };
    items.push(newItem);
    return res.status(201).json(newItem);
});


app.patch('/shopping-list/:id/item/:itemId/complete', [
    param('id').isString(),
    param('itemId').isString(),
    body('checked').isBoolean(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id, itemId } = req.params;
    const { checked } = req.body;
    const shoppingList = shoppingLists.find(list => list.id === id);
    if (!shoppingList) {
        return res.status(404).json({ message: 'Shopping list not found' });
    }

    const userId = req.headers['user-id'];
    if (shoppingList.owner !== userId && !shoppingList.members.includes(userId)) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    const item = items.find(it => it.id === itemId && it.shoppingList === id);
    if (!item) {
        return res.status(404).json({ message: 'Item not found' });
    }

    item.checked = checked;
    return res.status(200).json(item);
});


app.delete('/shopping-list/:id/delete', [
    param('id').isString(),
], authorize('Owner'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const index = shoppingLists.findIndex(list => list.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Shopping list not found' });
    }

    shoppingLists.splice(index, 1);
    items = items.filter(it => it.shoppingList !== id);
    return res.status(200).json({ message: 'Shopping list deleted successfully.' });
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
